// Supabase Edge Function: admin
// Provides privileged admin actions (server-side) using the service role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const FUNCTION_VERSION = "2026-01-12-reset-v3";

const DEFAULT_ALLOWED_ORIGINS = [
  // Local dev
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  // Capacitor defaults
  "capacitor://localhost",
  "ionic://localhost",
];

function buildCorsHeaders(origin: string | null) {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("DORA_ALLOWED_ORIGINS") || "").trim();
  const envAllowlist = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowlist = new Set<string>([...DEFAULT_ALLOWED_ORIGINS, ...envAllowlist]);

  // Allow server-to-server (no Origin header) without adding CORS headers.
  if (!origin) return null;

  // If explicitly configured, allow wildcard.
  if (allowlist.has("*")) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }

  if (!allowlist.has(origin)) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

type AdminActionBody =
  | { action: "deleteUser"; userId: string }
  | { action: "bulkDeleteUsers"; userIds: string[] }
  | { action: "softDeleteUser"; userId: string }
  | { action: "bulkSoftDeleteUsers"; userIds: string[] }
  | { action: "set_temp_password"; phone: string; password: string; requestId: string }
  | { action: "fix_admin_email"; userId: string; phone: string }
  | { action: "deleteListing"; listingId: string };

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = buildCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    if (!corsHeaders) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("admin fn version", FUNCTION_VERSION);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    // Prefer the standard Supabase secret name, but support legacy keys.
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE");
    if (!url || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars", {
        hasUrl: !!url,
        hasAnonKey: !!anonKey,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization token" }), {
        status: 401,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // 1) Validate the caller's token (authentic user)
    const authClient = createClient(url, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("auth.getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
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
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    const isAdmin = (adminRoleRows?.length || 0) > 0;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
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
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }
      if (targetUserId === callerId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      await hardDeleteUserInternal(targetUserId);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // ==================== HARD DELETE USERS (BULK) ====================
    if (body.action === "bulkDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "Missing userIds" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
    console.log("admin fn version", FUNCTION_VERSION);
          await hardDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // ==================== SOFT DELETE USER ====================
    if (body.action === "softDeleteUser") {
      const targetUserId = body.userId;

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }
      if (targetUserId === callerId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      await softDeleteUserInternal(targetUserId);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // ==================== SOFT DELETE USERS (BULK) ====================
    if (body.action === "bulkSoftDeleteUsers") {
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      const ids = userIds.filter(Boolean).filter((id) => id !== callerId);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "Missing userIds" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
      for (const id of ids) {
        try {
    console.log("admin fn version", FUNCTION_VERSION);
          await softDeleteUserInternal(id);
          results.push({ userId: id, ok: true });
        } catch (e) {
          results.push({ userId: id, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
        }
      }

      return new Response(JSON.stringify({ ok: true, results }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // ==================== SET TEMP PASSWORD ====================
    if (body.action === "set_temp_password") {
      const { phone, password, requestId } = body;

      if (!phone || !password) {
        return new Response(JSON.stringify({ error: "Missing phone or password" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      // Normalize & generate candidate phones/emails.
      // Dora has two historical auth patterns:
      // 1) phone-based internal email: 2189xxxxxxx@phone.dora.ly (sometimes with a leading '+')
      // 2) email-based auth: 091xxxxxxx@dora.ly (Libyan local mobile as email)
      const raw = String(phone ?? "").trim();
      const cleanedPhone = raw.replace(/\s/g, "");
      const digits = raw.replace(/\D/g, ""); // numbers only

      const phoneCandidates: string[] = [];
      const pushUnique = (arr: string[], v?: string | null) => {
        if (!v) return;
        const vv = String(v).trim();
        if (!vv) return;
        if (!arr.includes(vv)) arr.push(vv);
      };

      // Helper: normalize Libya mobile formats into local (09xxxxxxxx) and international (2189xxxxxxxx) digits
      const deriveLibya = (d: string) => {
        const out = {
          localWith0: [] as string[],
          localNo0: [] as string[],
          intlNoPlus: [] as string[],
        };

        if (!d) return out;

        // If starts with 218..., treat remainder as national number (usually 9xxxxxxxx)
        if (d.startsWith("218") && d.length > 3) {
          const national = d.slice(3); // e.g. 9xxxxxxxx
          if (national) {
            pushUnique(out.localNo0, national);
            pushUnique(out.localWith0, national.startsWith("0") ? national : "0" + national);
            pushUnique(out.intlNoPlus, "218" + national.replace(/^0+/, ""));
          }
          return out;
        }

        // If starts with 0..., treat as local
        if (d.startsWith("0") && d.length >= 9) {
          const no0 = d.replace(/^0+/, "");
          pushUnique(out.localWith0, d);
          pushUnique(out.localNo0, no0);
          pushUnique(out.intlNoPlus, "218" + no0);
          return out;
        }

        // Otherwise, could already be national (9xxxxxxxx) or other.
        if (d.length >= 8) {
          pushUnique(out.localNo0, d);
          pushUnique(out.localWith0, d.startsWith("0") ? d : "0" + d);
          pushUnique(out.intlNoPlus, d.startsWith("218") ? d : "218" + d.replace(/^0+/, ""));
        }

        return out;
      };

      // Phone candidates (what profiles.phone or user_metadata.phone might contain)
      pushUnique(phoneCandidates, cleanedPhone);
      pushUnique(phoneCandidates, digits);
      pushUnique(phoneCandidates, "+" + digits);

      const lib = deriveLibya(digits);
      for (const v of lib.localWith0) pushUnique(phoneCandidates, v);
      for (const v of lib.localNo0) pushUnique(phoneCandidates, v);
      for (const v of lib.intlNoPlus) {
        pushUnique(phoneCandidates, v);
        pushUnique(phoneCandidates, "+" + v);
      }

      // Build email candidates
      const emailCandidates = new Set<string>();

      // phone.dora.ly style (expects intl digits without leading 0)
      const baseIntl = lib.intlNoPlus[0] ?? (digits.startsWith("218") ? digits : "218" + digits.replace(/^0+/, ""));
      const intlLocalPart = baseIntl.replace(/^0+/, "");
      if (intlLocalPart) {
        emailCandidates.add(`${intlLocalPart}@phone.dora.ly`.toLowerCase());
        emailCandidates.add(`+${intlLocalPart}@phone.dora.ly`.toLowerCase());
      }

      // dora.ly style based on localWith0 and localNo0 (most common in your project)
      for (const v of lib.localWith0) emailCandidates.add(`${v}@dora.ly`.toLowerCase());
      for (const v of lib.localNo0) emailCandidates.add(`${v}@dora.ly`.toLowerCase());

      console.log("set_temp_password lookup", {
        input: phone,
        phoneCandidatesCount: phoneCandidates.length,
        emailCandidatesCount: emailCandidates.size,
      });

      let targetUser: any = null;

      // Strategy 1: Resolve user_id from profiles.phone, then fetch auth user directly (fast + reliable)
      let profileUserId: string | null = null;
      for (const pf of phoneCandidates) {
        const { data: profileData } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("phone", pf)
          .maybeSingle();

        if (profileData?.user_id) {
          profileUserId = profileData.user_id;
          console.log("Found profile by phone:", pf, "user_id:", profileUserId);
          break;
        }
      }

      if (profileUserId) {
        const { data: byId, error: byIdErr } = await adminClient.auth.admin.getUserById(profileUserId);
        if (!byIdErr && byId?.user) {
          targetUser = byId.user;
          console.log("Found auth user by profile user_id:", targetUser.id);
        } else {
          console.log("Auth user not found by profile user_id (may be deleted).");
        }
      }

      // Strategy 2: paginate through auth users and match on email OR user_metadata.phone
      if (!targetUser) {
        const phoneDigitsSet = new Set(
          phoneCandidates.map((p) => String(p).replace(/\D/g, "")).filter(Boolean),
        );

        const PER_PAGE = 200;
        const MAX_PAGES = 50; // up to 10k users
        for (let page = 1; page <= MAX_PAGES; page++) {
          const { data: pageData, error: pageErr } = await adminClient.auth.admin.listUsers({ page, perPage: PER_PAGE });
          if (pageErr) {
            console.error("listUsers failed", pageErr);
            break;
          }

          const users = pageData?.users ?? [];
          const found = users.find((u: any) => {
            const em = (u.email ?? "").toLowerCase();
            if (em && emailCandidates.has(em)) return true;

            const metaPhone = u.user_metadata?.phone ?? u.user_metadata?.phone_number ?? null;
            if (metaPhone) {
              const md = String(metaPhone).replace(/\D/g, "");
              if (md && phoneDigitsSet.has(md)) return true;
            }

            // Some projects might store phone in u.phone (rare when using email provider)
            if (u.phone) {
              const pd = String(u.phone).replace(/\D/g, "");
              if (pd && phoneDigitsSet.has(pd)) return true;
            }

            return false;
          });

          if (found) {
            targetUser = found;
            console.log("Found auth user via listUsers on page", page, ":", targetUser.id);
            break;
          }

          if (users.length < PER_PAGE) break;
        }
      }

      if (!targetUser) {
        console.error("User not found for input:", phone, "version:", FUNCTION_VERSION, "emails tried:", Array.from(emailCandidates).slice(0, 20), "phones tried:", phoneCandidates.slice(0, 20));
        return new Response(
          JSON.stringify({
            error:
              "User not found for this phone. Try local format (09xxxxxxxx). If the user exists, contact support with code: "+FUNCTION_VERSION,

          }),
          {
            status: 404,
            headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
          },
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
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      // Update reset request status (best effort)
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
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

// ==================== FIX ADMIN EMAIL ====================
    if (body.action === "fix_admin_email") {
      const { userId, phone } = body;

      if (!userId || !phone) {
        return new Response(JSON.stringify({ error: "Missing userId or phone" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
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
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      console.log("Admin email updated to:", newEmail);

      return new Response(JSON.stringify({ ok: true, newEmail }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    // ==================== DELETE LISTING ====================
    if (body.action === "deleteListing") {
      const { listingId } = body;

      if (!listingId) {
        return new Response(JSON.stringify({ error: "Missing listingId" }), {
          status: 400,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      const { error: delErr } = await adminClient.from("listings").delete().eq("id", listingId);
      if (delErr) {
        console.error("deleteListing failed", delErr);
        return new Response(JSON.stringify({ error: "Failed to delete listing", details: delErr.message }), {
          status: 500,
          headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
        });
      }

      // Audit log (best effort)
      await adminClient.from("admin_audit_log").insert({
        admin_id: callerId,
        action: "delete_listing",
        target_type: "listing",
        target_id: listingId,
        details: { deleted_by: callerId },
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin function unhandled error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...(corsHeaders ?? {}), "Content-Type": "application/json" },
    });
  }
});
