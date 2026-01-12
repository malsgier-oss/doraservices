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
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
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

      // Normalize Libya formats:
      // - If it starts with 0XXXXXXXXX => digitsOnly already has leading 0
      // - If it starts with 218XXXXXXXXX => convert to local 0XXXXXXXXX variants too
      const phoneFormats: string[] = [];
      const pushUnique = (v?: string | null) => {
        if (!v) return;
        const vv = String(v).trim();
        if (!vv) return;
        if (!phoneFormats.includes(vv)) phoneFormats.push(vv);
      };

      // Base variants from raw input
      pushUnique(cleanedPhone);
      pushUnique(digitsOnly);
      pushUnique("+" + digitsOnly);

      // If digitsOnly looks like Libya country code (218...), add local variants
      if (digitsOnly.startsWith("218") && digitsOnly.length > 3) {
        const local = digitsOnly.slice(3); // e.g. 9XXXXXXXX
        pushUnique("0" + local);         // 0XXXXXXXXX
        pushUnique(local);                // XXXXXXXXX
        pushUnique("+218" + local);
        pushUnique("218" + local);
      }

      // If digitsOnly starts with 0, add international variants
      if (digitsOnly.startsWith("0") && digitsOnly.length >= 9) {
        const no0 = digitsOnly.replace(/^0+/, "");
        pushUnique("+218" + no0);
        pushUnique("218" + no0);
      }

      // Internal email variants we may have stored for phone-based auth
      // Some systems store with '+' in the local-part, so try both.
      const internalEmailA = `${digitsOnly.replace(/^0+/, "")}@phone.dora.ly`;
      const internalEmailB = `+${digitsOnly.replace(/^0+/, "")}@phone.dora.ly`;

      // Dora may also store accounts as plain email like: 091XXXXXXXX@dora.ly (email provider)
      // Build a small set of likely @dora.ly emails from our phone variants.
      const doraEmailCandidates: string[] = [];
      for (const pf of phoneFormats) {
        const digits = String(pf).replace(/\D/g, "");
        if (!digits) continue;

        // Keep the "0..." local format when present, because that's what we see in the wild (e.g., 091...@dora.ly)
        if (digits.startsWith("0")) doraEmailCandidates.push(`${digits}@dora.ly`);

        // Also try without leading zeros
        const no0 = digits.replace(/^0+/, "");
        if (no0 && no0 !== digits) doraEmailCandidates.push(`${no0}@dora.ly`);

        // If it's 218..., try local derivations too
        if (digits.startsWith("218") && digits.length > 3) {
          const local = digits.slice(3);
          doraEmailCandidates.push(`0${local}@dora.ly`);
          doraEmailCandidates.push(`${local}@dora.ly`);
        }
      }
      // De-dupe
      const uniqueDoraEmails = Array.from(new Set(doraEmailCandidates.map((e) => e.toLowerCase())));
      console.log("Looking for user with email:", internalEmailA, "or", internalEmailB, "or @dora.ly:", uniqueDoraEmails.slice(0, 3), "or phone:", cleanedPhone);

      let targetUser: any = null;

      // Strategy 1: If we can resolve user_id from profiles.phone, fetch auth user directly
      let profileUserId: string | null = null;
      for (const pf of phoneFormats) {
        const { data: profileData } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("phone", pf)
          .maybeSingle();

        if (profileData?.user_id) {
          profileUserId = profileData.user_id;
          console.log("Found profile with phone format:", pf, "user_id:", profileUserId);
          break;
        }
      }

      if (profileUserId) {
        const { data: byId, error: byIdErr } = await adminClient.auth.admin.getUserById(profileUserId);
        if (!byIdErr && byId?.user) {
          targetUser = byId.user;
          console.log("Found auth user by profile user_id:", targetUser.id);
        } else {
          console.log("Auth user not found by profile user_id (may be deleted or different project)." );
        }
      }

      // Strategy 2: paginate through auth users and match on email (covers older accounts without profiles.phone)
      if (!targetUser) {
        const matchEmails = new Set([internalEmailA.toLowerCase(), internalEmailB.toLowerCase(), ...uniqueDoraEmails]);

        // Supabase Admin listUsers is paginated. Scan a bounded number of pages.
        // Each page is small enough to avoid timeouts; stop early when found.
        const PER_PAGE = 200;
        const MAX_PAGES = 50; // up to 10k users
        for (let page = 1; page <= MAX_PAGES; page++) {
          const { data: pageData, error: pageErr } = await adminClient.auth.admin.listUsers({ page, perPage: PER_PAGE });
          if (pageErr) {
            console.error("listUsers failed", pageErr);
            break;
          }

          const users = pageData?.users ?? [];
          const phoneDigitSet = new Set(phoneFormats.map((pf) => String(pf).replace(/\D/g, "")).filter(Boolean));
          const found = users.find((u: any) => {
            const em = (u.email ?? "").toLowerCase();
            if (matchEmails.has(em)) return true;

            // Some Dora accounts are created as email provider (e.g., 091XXXXXXXX@dora.ly) with phone stored in user_metadata.
            const metaPhone = (u.user_metadata?.phone ?? u.user_metadata?.phone_number ?? "").toString();
            const metaDigits = metaPhone.replace(/\D/g, "");
            if (metaDigits && phoneDigitSet.has(metaDigits)) return true;

            return false;
          });

          if (found) {
            targetUser = found;
            console.log("Found auth user by email on page", page, ":", targetUser.id);
            break;
          }

          // Stop if this page returned fewer than perPage results (last page)
          if (users.length < PER_PAGE) break;
        }
      }

      if (!targetUser) {
        console.error("User not found for phone:", cleanedPhone, "or email:", internalEmailA);
        return new Response(
          JSON.stringify({
            error: "User not found for this phone number. Make sure the user has registered.",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
