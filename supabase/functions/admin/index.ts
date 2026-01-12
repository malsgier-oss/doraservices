// Supabase Edge Function: admin
// Privileged admin actions (server-side) using SERVICE_ROLE_KEY.
// Admin authorization is verified via profiles.role = 'admin' (do NOT trust client).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AdminActionBody =
  | { action: "deleteUser"; userId: string }
  | { action: "bulkDeleteUsers"; userIds: string[] }
  | { action: "softDeleteUser"; userId: string }
  | { action: "bulkSoftDeleteUsers"; userIds: string[] }
  | { action: "set_temp_password"; phone: string; password: string; requestId: string }
  | { action: "fix_admin_email"; userId: string; phone: string };

function getBearerToken(req: Request) {
  const a = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (a.toLowerCase().startsWith("bearer ")) return a.slice(7).trim();

  // Some clients use x-supabase-authorization
  const b = req.headers.get("x-supabase-authorization") || "";
  if (b.toLowerCase().startsWith("bearer ")) return b.slice(7).trim();

  return null;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // IMPORTANT: Supabase blocks secrets that start with SUPABASE_.
    // Use SERVICE_ROLE_KEY in Edge Functions secrets.
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!url || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return json(500, {
        error: "Server misconfigured",
        hint: "Ensure Edge Function secrets include SERVICE_ROLE_KEY (service_role key).",
      });
    }

    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Authorization token" });

    // Validate caller token
    const authClient = createClient(url, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("auth.getUser failed", userError);
      return json(401, { error: "Unauthorized" });
    }

    const callerId = userData.user.id;

    // Service role client (bypasses RLS)
    const adminClient = createClient(url, serviceRoleKey);

    // Server-side admin check: profiles.role must be 'admin'
    const { data: callerProfile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleError) {
      console.error("role check failed", roleError);
      return json(500, { error: "Authorization check failed", details: roleError.message });
    }

    const role = (callerProfile?.role || "").toString().toLowerCase();
    if (role !== "admin") return json(403, { error: "Forbidden" });

    const softDeleteUserInternal = async (targetUserId: string) => {
      const nowIso = new Date().toISOString();

      // Hide services (best effort)
      const s1 = await adminClient
        .from("services")
        .update({ is_active: false, is_visible: false, is_paused: true })
        .eq("user_id", targetUserId);

      if (s1.error) console.warn("hide services warning:", s1.error.message);

      // Scrub profile + mark deleted
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

      if (profileErr) throw new Error(profileErr.message);

      // Audit log (best effort)
      const a1 = await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "soft_delete_user",
        target_type: "user",
        target_id: targetUserId,
        details: { deleted_by: callerId },
      });

      if (a1.error) console.warn("audit log warning:", a1.error.message);

      return { ok: true };
    };

    const hardDeleteUserInternal = async (targetUserId: string) => {
      // Clean up app tables first (order matters for foreign keys)
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
        console.warn("first pass cleanup warnings", firstPassErrors.map((r) => r.error?.message));
      }

      // Second pass: where user is provider
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
        console.warn("second pass cleanup warnings", secondPassErrors.map((r) => r.error?.message));
      }

      // Final pass: delete profile row (roles are stored in profiles.role now)
      const finalResults = await Promise.all([
        adminClient.from("profiles").delete().eq("user_id", targetUserId),
      ]);

      const finalErrors = finalResults.filter((r) => r.error);
      if (finalErrors.length > 0) {
        console.error("final cleanup failed", finalErrors.map((r) => r.error?.message));
        throw new Error(`Failed to delete user data: ${finalErrors.map((r) => r.error?.message).join(" | ")}`);
      }

      // Delete auth user last
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthError) {
        console.error("auth admin delete failed", deleteAuthError);
        throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
      }

      // Audit log (best effort)
      const a2 = await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "delete_user",
        target_type: "user",
        target_id: targetUserId,
        details: { deleted_by: callerId },
      });

      if (a2.error) console.warn("audit log warning:", a2.error.message);

      return { ok: true };
    };

    const body = (await req.json()) as AdminActionBody;
    console.log("admin action request", { callerId, action: (body as any)?.action });

    if (body.action === "deleteUser") {
      const targetUserId = body.userId;
      if (!targetUserId) return json(400, { error: "Missing userId" });
      if (targetUserId === callerId) return json(400, { error: "You cannot delete your own account" });

      await hardDeleteUserInternal(targetUserId);
      return json(200, { ok: true });
    }

    if (body.action === "bulkDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) return json(400, { error: "Missing userIds" });

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
          await hardDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return json(200, { ok: true, results });
    }

    if (body.action === "softDeleteUser") {
      const targetUserId = body.userId;
      if (!targetUserId) return json(400, { error: "Missing userId" });
      if (targetUserId === callerId) return json(400, { error: "You cannot delete your own account" });

      await softDeleteUserInternal(targetUserId);
      return json(200, { ok: true });
    }

    if (body.action === "bulkSoftDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) return json(400, { error: "Missing userIds" });

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
          await softDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return json(200, { ok: true, results });
    }

    // ==================== SET TEMP PASSWORD ====================
    if (body.action === "set_temp_password") {
      const { phone, password, requestId } = body;

      if (!phone || !password) return json(400, { error: "Missing phone or password" });
      if (password.length < 6) return json(400, { error: "Password must be at least 6 characters" });

      const cleanedPhone = phone.replace(/\s/g, "").trim();
      let digitsOnly = phone.replace(/\D/g, "");

      if (digitsOnly.startsWith("0")) digitsOnly = "218" + digitsOnly.slice(1);
      if (!digitsOnly.startsWith("218")) digitsOnly = "218" + digitsOnly;

      const internalEmail = `${digitsOnly}@phone.dora.ly`;
      console.log("Looking for user with email:", internalEmail, "or phone:", cleanedPhone);

      const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) return json(500, { error: "Failed to lookup user", details: listError.message });

      let targetUser = usersData.users.find((u) => u.email === internalEmail);

      if (!targetUser) {
        const phoneFormats = [
          cleanedPhone,
          cleanedPhone.replace(/^0/, "+218"),
          cleanedPhone.replace(/^0/, "218"),
          "+" + digitsOnly,
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
            break;
          }
        }

        if (profileUserId) targetUser = usersData.users.find((u) => u.id === profileUserId);
      }

      if (!targetUser) return json(404, { error: "User not found for this phone number." });

      const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, { password });
      if (updateError) return json(500, { error: "Failed to update password", details: updateError.message });

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

      await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "set_temp_password",
        target_type: "user",
        target_id: targetUser.id,
        details: { phone, request_id: requestId },
      });

      return json(200, { ok: true });
    }

    // ==================== FIX ADMIN EMAIL ====================
    if (body.action === "fix_admin_email") {
      const { userId, phone } = body;
      if (!userId || !phone) return json(400, { error: "Missing userId or phone" });

      let digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.startsWith("0")) digitsOnly = "218" + digitsOnly.slice(1);
      if (!digitsOnly.startsWith("218")) digitsOnly = "218" + digitsOnly;

      const newEmail = `${digitsOnly}@phone.dora.ly`;

      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateError) return json(500, { error: "Failed to update email", details: updateError.message });

      return json(200, { ok: true, newEmail });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("admin function unhandled error", err);
    return json(500, { error: err instanceof Error ? err.message : "Unknown error" });
  }
});
