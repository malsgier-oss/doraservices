// Supabase Edge Function: admin
// Provides privileged admin actions (server-side) using the service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminActionBody =
  | { action: "deleteUser"; userId: string }
  | { action: "bulkDeleteUsers"; userIds: string[] }
  | { action: "softDeleteUser"; userId: string }
  | { action: "bulkSoftDeleteUsers"; userIds: string[] }
  | { action: "set_temp_password"; phone: string; password: string; requestId: string }
  | { action: "fix_admin_email"; userId: string; phone: string };

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Validate the caller's token (authentic user)
    const authClient = createClient(url, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("auth.getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // 2) Use service role for privileged operations (bypasses RLS)
    const adminClient = createClient(url, serviceRoleKey);

    // 3) Server-side admin check (do NOT trust client)
    const { data: adminRoleRows, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .limit(1);

    if (roleError) {
      console.error("role check failed", roleError);
      return new Response(JSON.stringify({ error: "Authorization check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (adminRoleRows?.length || 0) > 0;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const softDeleteUserInternal = async (targetUserId: string) => {
      // Soft delete = keep rows, but hide + scrub personal info + hide services.
      // This is safer as a fallback when Edge Functions can't delete auth users.
      const nowIso = new Date().toISOString();

      // Hide services (best effort)
      await adminClient
        .from("services")
        .update({ is_active: false, is_visible: false, is_paused: true })
        .eq("user_id", targetUserId);

      // Scrub profile and mark deleted
      const { error: profileErr } = await adminClient
        .from("profiles")
        .update({
          status: "deleted",
          suspended_at: nowIso,
          suspended_reason: "admin_deleted",
          full_name: null,
          bio: null,
          avatar_url: null,
          // Keep phone for audit/login mapping; do not null it here.
        })
        .eq("user_id", targetUserId);

      if (profileErr) throw profileErr;

      // Audit log (best effort)
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "soft_delete_user",
        target_type: "user",
        target_id: targetUserId,
        details: { deleted_by: callerId },
      });

      return { ok: true };
    };

    const hardDeleteUserInternal = async (targetUserId: string) => {
      // Clean up app tables first (order matters for foreign key dependencies)
      const firstPassResults = await Promise.all([
        adminClient.from("review_prompts").delete().eq("user_id", targetUserId),
        adminClient.from("service_reviews").delete().eq("user_id", targetUserId),
        adminClient.from("call_logs").delete().eq("caller_id", targetUserId),
        adminClient.from("notification_events").delete().eq("user_id", targetUserId),
        adminClient.from("user_reports").delete().eq("reporter_id", targetUserId),
        adminClient.from("user_reports").delete().eq("reported_user_id", targetUserId),
        adminClient.from("saved_businesses").delete().eq("user_id", targetUserId),
        adminClient.from("user_messages").delete().eq("user_id", targetUserId),
        adminClient.from("reviews").delete().eq("user_id", targetUserId),
        adminClient.from("push_tokens").delete().eq("user_id", targetUserId),
        adminClient.from("password_reset_requests").delete().eq("user_id", targetUserId),
      ]);

      const firstPassErrors = firstPassResults.filter((r) => r.error);
      if (firstPassErrors.length > 0) {
        console.warn(
          "first pass cleanup warnings",
          firstPassErrors.map((r) => r.error?.message),
        );
      }

      // Second pass: delete records where user is a provider
      const secondPassResults = await Promise.all([
        adminClient.from("review_prompts").delete().eq("provider_id", targetUserId),
        adminClient.from("call_logs").delete().eq("provider_id", targetUserId),
        adminClient.from("provider_stats").delete().eq("provider_id", targetUserId),
        adminClient.from("services").delete().eq("user_id", targetUserId),
        adminClient.from("deals").delete().eq("user_id", targetUserId),
        adminClient.from("businesses").delete().eq("user_id", targetUserId),
        adminClient.from("posts").delete().eq("user_id", targetUserId),
      ]);

      const secondPassErrors = secondPassResults.filter((r) => r.error);
      if (secondPassErrors.length > 0) {
        console.warn(
          "second pass cleanup warnings",
          secondPassErrors.map((r) => r.error?.message),
        );
      }

      // Final pass: delete core user records
      const finalResults = await Promise.all([
        adminClient.from("user_roles").delete().eq("user_id", targetUserId),
        adminClient.from("profiles").delete().eq("user_id", targetUserId),
      ]);

      const finalErrors = finalResults.filter((r) => r.error);
      if (finalErrors.length > 0) {
        console.error("final cleanup failed", finalErrors.map((r) => r.error));
        throw new Error(
          `Failed to delete user data: ${finalErrors.map((r) => r.error?.message).join(" | ")}`,
        );
      }

      // Finally remove the auth user
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthError) {
        console.error("auth admin delete failed", deleteAuthError);
        throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "delete_user",
        target_type: "user",
        target_id: targetUserId,
        details: { deleted_by: callerId },
      });

      return { ok: true };
    };

    const body = (await req.json()) as AdminActionBody;
    console.log("admin action request", { callerId, action: body?.action });

    // ==================== HARD DELETE USER ====================
    if (body.action === "deleteUser") {
      const targetUserId = body.userId;

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetUserId === callerId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await hardDeleteUserInternal(targetUserId);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== HARD DELETE USERS (BULK) ====================
    if (body.action === "bulkDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "Missing userIds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
          await hardDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== SOFT DELETE USER ====================
    if (body.action === "softDeleteUser") {
      const targetUserId = body.userId;

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetUserId === callerId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await softDeleteUserInternal(targetUserId);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== SOFT DELETE USERS (BULK) ====================
    if (body.action === "bulkSoftDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "Missing userIds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
          await softDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== SET TEMP PASSWORD ====================
    if (body.action === "set_temp_password") {
      const { phone, password, requestId } = body;

      if (!phone || !password) {
        return new Response(JSON.stringify({ error: "Missing phone or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean and normalize phone for lookups
      const cleanedPhone = phone.replace(/\s/g, "").trim();
      let digitsOnly = phone.replace(/\D/g, "");
      
      // Convert to international format for email lookup
      if (digitsOnly.startsWith("0")) {
        digitsOnly = "218" + digitsOnly.slice(1);
      }
      if (!digitsOnly.startsWith("218")) {
        digitsOnly = "218" + digitsOnly;
      }
      
      const internalEmail = `${digitsOnly}@phone.dora.ly`;
      console.log("Looking for user with email:", internalEmail, "or phone:", cleanedPhone);

      // Strategy 1: Find by internal email format
      const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) {
        console.error("listUsers failed", listError);
        return new Response(JSON.stringify({ error: "Failed to lookup user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let targetUser = usersData.users.find(u => u.email === internalEmail);
      
      // Strategy 2: If not found by email, lookup profile by phone, get user_id, find auth user
      if (!targetUser) {
        console.log("User not found by email, trying profile lookup...");
        
        // Try multiple phone formats
        const phoneFormats = [
          cleanedPhone,                                    // as-is (e.g., 0913200935)
          cleanedPhone.replace(/^0/, "+218"),             // +218913200935
          cleanedPhone.replace(/^0/, "218"),              // 218913200935
          "+" + digitsOnly,                                // +218913200935
        ];
        
        let profileUserId: string | null = null;
        for (const phoneFormat of phoneFormats) {
          const { data: profileData } = await adminClient
            .from("profiles")
            .select("user_id")
            .eq("phone", phoneFormat)
            .maybeSingle();
          
          if (profileData?.user_id) {
            profileUserId = profileData.user_id;
            console.log("Found profile with phone format:", phoneFormat, "user_id:", profileUserId);
            break;
          }
        }
        
        if (profileUserId) {
          targetUser = usersData.users.find(u => u.id === profileUserId);
          if (targetUser) {
            console.log("Found auth user by profile user_id:", targetUser.id);
          }
        }
      }

      if (!targetUser) {
        console.error("User not found for phone:", cleanedPhone, "or email:", internalEmail);
        return new Response(JSON.stringify({ error: "User not found for this phone number. Make sure the user has registered." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update user password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
        password: password,
      });

      if (updateError) {
        console.error("updateUserById failed", updateError);
        return new Response(JSON.stringify({ error: "Failed to update password", details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // NOTE: Dora no longer uses profiles.must_change_password (column removed in DB).
      // If you want a "force password change" feature later, implement it as a separate table/flag.

      // Update reset request status
      if (requestId) {
        await adminClient
          .from("password_reset_requests")
          .update({
            status: "completed",
            handled_by: callerId,
            handled_at: new Date().toISOString(),
            user_id: targetUser.id,
          })
          .eq("id", requestId);
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "set_temp_password",
        target_type: "user",
        target_id: targetUser.id,
        details: { phone, request_id: requestId },
      });

      console.log("Temp password set successfully for user:", targetUser.id);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== FIX ADMIN EMAIL ====================
    if (body.action === "fix_admin_email") {
      const { userId, phone } = body;

      if (!userId || !phone) {
        return new Response(JSON.stringify({ error: "Missing userId or phone" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Convert phone to internal email format
      let digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.startsWith("0")) {
        digitsOnly = "218" + digitsOnly.slice(1);
      }
      if (!digitsOnly.startsWith("218")) {
        digitsOnly = "218" + digitsOnly;
      }
      const newEmail = `${digitsOnly}@phone.dora.ly`;

      // Update user email
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateError) {
        console.error("updateUserById failed", updateError);
        return new Response(JSON.stringify({ error: "Failed to update email", details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Admin email updated to:", newEmail);

      return new Response(JSON.stringify({ ok: true, newEmail }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin function unhandled error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
