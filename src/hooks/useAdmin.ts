import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
}

interface Business {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  authorization_status: string;
  authorization_note: string | null;
  operational_status: string;
  featured: boolean;
  created_at: string;
}

interface Deal {
  id: string;
  user_id: string;
  business_id: string;
  title: string;
  description: string | null;
  discount: string;
  status: string | null;
  featured: boolean;
  expires_at: string | null;
  created_at: string;
  businesses?: { name: string };
}

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_business_id: string | null;
  reported_deal_id: string | null;
  reported_service_id: string | null;
  call_log_id: string | null;
  report_type: string;
  reason: string;
  status: string;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface PlatformMessage {
  id: string;
  sender_id: string;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

// Dashboard Stats
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      // Dora: Stats should reflect the current services marketplace model.
      // NOTE: provider_status lives on profiles, not on legacy businesses tables.
      const [
        { count: totalUsers },
        { count: totalProviders },
        { count: pendingProviders },
        { count: approvedProviders },
        { count: totalServices },
        { count: pendingServices },
        { count: suspendedProfiles },
        { count: pendingReports },
        { count: totalViews },
        { count: totalCalls },
        { count: totalWhatsapps },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).not("provider_status", "is", null),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("provider_status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("provider_status", "approved"),
        supabase.from("services").select("*", { count: "exact", head: true }),
        supabase.from("services").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("service_events").select("*", { count: "exact", head: true }).eq("event_type", "view"),
        supabase.from("service_events").select("*", { count: "exact", head: true }).eq("event_type", "call"),
        supabase.from("service_events").select("*", { count: "exact", head: true }).eq("event_type", "whatsapp"),
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalProviders: totalProviders || 0,
        pendingProviders: pendingProviders || 0,
        approvedProviders: approvedProviders || 0,
        totalServices: totalServices || 0,
        pendingServices: pendingServices || 0,
        suspendedProfiles: suspendedProfiles || 0,
        pendingReports: pendingReports || 0,
        totalViews: totalViews || 0,
        totalCalls: totalCalls || 0,
        totalWhatsapps: totalWhatsapps || 0,
      };
    },
  });
}

// Users Management
export function useAdminUsers(filters?: { status?: string; role?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.ilike("full_name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Dora: roles are stored in profiles.role (simple + reliable).
      // We still tolerate legacy user_roles if it exists, but profiles.role is the source of truth.
      const base =
        data?.map((p: any) => {
          const r = (p.role || "user").toString().toLowerCase();
          return {
            ...p,
            roles: [r],
          };
        }) || [];

      let result = base;

      // Filter by role if needed
      if (filters?.role && filters.role !== "all") {
        result = result.filter((u) => u.roles.includes(filters.role!));
      }

      return result;
    },
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const suspendUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended", suspended_at: new Date().toISOString(), suspended_reason: reason })
        .eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "suspend_user",
        p_target_type: "user",
        p_target_id: userId,
        p_details: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User suspended successfully" });
    },
    onError: (error) => {
      toast({ title: "Error suspending user", description: error.message, variant: "destructive" });
    },
  });

  const reactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active", suspended_at: null, suspended_reason: null })
        .eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "reactivate_user",
        p_target_type: "user",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User reactivated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error reactivating user", description: error.message, variant: "destructive" });
    },
  });

  const archiveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ status: "archived" }).eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "archive_user",
        p_target_type: "user",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User archived successfully" });
    },
    onError: (error) => {
      toast({ title: "Error archiving user", description: error.message, variant: "destructive" });
    },
  });

  // Shared helper used by single + bulk hard delete.
  // Bulk hard delete can fail when one Edge Function request is asked to delete many users
  // (timeouts / termination / transient errors). Doing per-user requests keeps each call small.
  const hardDeleteUserFn = async (userId: string) => {
    // Explicitly attach the access token. In some environments, invoke() may not
    // automatically send the user's session token.
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const { data, error } = await supabase.functions.invoke("admin", {
      body: { action: "deleteUser", userId },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (error) {
      if (error instanceof FunctionsHttpError) {
        try {
          const payload = await error.context.json();
          const msg = typeof payload?.error === "string" ? payload.error : error.message;
          const details = payload?.details
            ? ` (${typeof payload.details === "string" ? payload.details : JSON.stringify(payload.details)})`
            : "";
          throw new Error(`${msg}${details}`);
        } catch {
          // fallback when body isn't JSON
          throw new Error(error.message);
        }
      }
      throw new Error(error.message);
    }

    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      throw new Error(String((data as Record<string, unknown>).error));
    }
  };

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await hardDeleteUserFn(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User deleted" });
    },
    onError: (error) => {
      const msg = error.message || "Unknown error";
      const hint = msg.toLowerCase().includes("failed to send a request to the edge function")
        ? "\n\nHint: Deploy the 'admin' Edge Function in Supabase and set secrets (SUPABASE_SERVICE_ROLE_KEY). If you can't, use Soft delete instead."
        : "";
      toast({ title: "Error deleting user", description: msg + hint, variant: "destructive" });
    },
  });

  const softDeleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const nowIso = new Date().toISOString();

      // Hide services first (best effort)
      await supabase
        .from("services")
        .update({ is_active: false, is_visible: false, is_paused: true })
        .eq("user_id", userId);

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "deleted",
          suspended_at: nowIso,
          suspended_reason: "admin_deleted",
          full_name: null,
          bio: null,
          avatar_url: null,
        })
        .eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "soft_delete_user",
        p_target_type: "user",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User soft-deleted" });
    },
    onError: (error) => {
      toast({ title: "Error soft-deleting user", description: error.message, variant: "destructive" });
    },
  });

  const bulkSoftDeleteUsers = useMutation({
    mutationFn: async (userIds: string[]) => {
      for (const id of userIds) {
        await softDeleteUser.mutateAsync(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Bulk soft delete completed" });
    },
    onError: (error) => {
      toast({ title: "Bulk soft delete failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteUsers = useMutation({
    mutationFn: async (userIds: string[]) => {
      const failed: Array<{ userId: string; error: string }> = [];

      // Sequential deletes are safer here (avoid hammering Edge Functions + auth).
      for (const id of userIds) {
        try {
          await hardDeleteUserFn(id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failed.push({ userId: id, error: msg });
        }
      }

      if (failed.length > 0) {
        const preview = failed
          .slice(0, 5)
          .map((f) => f.userId)
          .join(", ");
        const more = failed.length > 5 ? ` (+${failed.length - 5} more)` : "";
        throw new Error(`Failed to hard delete ${failed.length}/${userIds.length}: ${preview}${more}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Bulk delete completed" });
    },
    onError: (error) => {
      const msg = error.message || "Unknown error";
      const hint = msg.toLowerCase().includes("failed to send a request to the edge function")
        ? "\n\nHint: Deploy the 'admin' Edge Function in Supabase and set secrets (SUPABASE_SERVICE_ROLE_KEY). Or switch to Soft delete."
        : "";
      toast({ title: "Bulk delete failed", description: msg + hint, variant: "destructive" });
    },
  });

  const changeUserRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      action,
    }: {
      userId: string;
      role: "user" | "provider" | "admin";
      action: "add" | "remove";
    }) => {
      // Source of truth: profiles.role (single role per user for Dora P0)
      // - "add" sets the role
      // - "remove" resets back to "user" unless removing admin (still -> user)
      const nextRole = action === "add" ? role : "user";

      // If promoting to provider, default provider_status to pending (unless already approved)
      const updates: any = { role: nextRole };
      if (nextRole === "provider") {
        updates.provider_status = "pending";
      }

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: `${action}_role`,
        p_target_type: "user",
        p_target_id: userId,
        p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User role updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error updating user role", description: error.message, variant: "destructive" });
    },
  });

  const verifyUser = useMutation({
    mutationFn: async (userId: string) => {
      // Dora P0: "verification" maps to provider approval.
      // For non-provider users this is effectively a no-op.
      const { error } = await supabase.from("profiles").update({ provider_status: "approved" }).eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "verify_user",
        p_target_type: "user",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User verified successfully" });
    },
    onError: (error) => {
      toast({ title: "Error verifying user", description: error.message, variant: "destructive" });
    },
  });

  const unverifyUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ provider_status: "pending" }).eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "unverify_user",
        p_target_type: "user",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User verification removed" });
    },
    onError: (error) => {
      toast({ title: "Error removing verification", description: error.message, variant: "destructive" });
    },
  });

  return {
    suspendUser,
    reactivateUser,
    archiveUser,
    deleteUser,
    softDeleteUser,
    bulkSoftDeleteUsers,
    bulkDeleteUsers,
    changeUserRole,
    verifyUser,
    unverifyUser,
  };
}

// Businesses Management
export function useAdminBusinesses(filters?: { status?: string; authorization?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "businesses", filters],
    queryFn: async () => {
      let query = supabase.from("businesses").select("*").order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("operational_status", filters.status);
      }

      if (filters?.authorization && filters.authorization !== "all") {
        query = query.eq("authorization_status", filters.authorization);
      }

      if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Business[];
    },
  });
}

export function useBusinessMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const authorizeBusiness = useMutation({
    mutationFn: async ({ businessId, status, note }: { businessId: string; status: string; note?: string }) => {
      // Get business to find user_id
      const { data: business } = await supabase
        .from("businesses")
        .select("user_id, name")
        .eq("id", businessId)
        .single();

      const { error } = await supabase
        .from("businesses")
        .update({ authorization_status: status, authorization_note: note || null })
        .eq("id", businessId);
      if (error) throw error;

      // Send notification to business owner
      if (business?.user_id) {
        const title =
          status === "approved"
            ? "Business Approved! 🎉"
            : status === "rejected"
              ? "Business Application Update"
              : "Business Status Updated";
        const content =
          status === "approved"
            ? `Your business "${business.name}" has been approved. You can now start offering services!`
            : status === "rejected"
              ? `Your business "${business.name}" application needs attention. ${note || "Please contact support for more details."}`
              : `Your business "${business.name}" status has been updated to ${status}.`;

        await supabase.rpc("create_user_notification", {
          p_user_id: business.user_id,
          p_title: title,
          p_content: content,
        });
      }

      await supabase.rpc("log_admin_action", {
        p_action: `authorize_business_${status}`,
        p_target_type: "business",
        p_target_id: businessId,
        p_details: { note },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Business authorization updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating business", description: error.message, variant: "destructive" });
    },
  });

  const suspendBusiness = useMutation({
    mutationFn: async ({ businessId, reason }: { businessId: string; reason?: string }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ operational_status: "suspended", suspended_at: new Date().toISOString() })
        .eq("id", businessId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "suspend_business",
        p_target_type: "business",
        p_target_id: businessId,
        p_details: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Business suspended" });
    },
    onError: (error) => {
      toast({ title: "Error suspending business", description: error.message, variant: "destructive" });
    },
  });

  const reactivateBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from("businesses")
        .update({ operational_status: "active", suspended_at: null })
        .eq("id", businessId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "reactivate_business",
        p_target_type: "business",
        p_target_id: businessId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Business reactivated" });
    },
    onError: (error) => {
      toast({ title: "Error reactivating business", description: error.message, variant: "destructive" });
    },
  });

  const toggleFeaturedBusiness = useMutation({
    mutationFn: async ({ businessId, featured }: { businessId: string; featured: boolean }) => {
      const { error } = await supabase.from("businesses").update({ featured }).eq("id", businessId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: featured ? "feature_business" : "unfeature_business",
        p_target_type: "business",
        p_target_id: businessId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Business featured status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating business", description: error.message, variant: "destructive" });
    },
  });

  return { authorizeBusiness, suspendBusiness, reactivateBusiness, toggleFeaturedBusiness };
}

// Deals Management
export function useAdminDeals(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "deals", filters],
    queryFn: async () => {
      let query = supabase.from("deals").select("*, businesses(name)").order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Deal[];
    },
  });
}

export function useDealMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deactivateDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("deals").update({ status: "inactive" }).eq("id", dealId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "deactivate_deal",
        p_target_type: "deal",
        p_target_id: dealId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Deal deactivated" });
    },
    onError: (error) => {
      toast({ title: "Error deactivating deal", description: error.message, variant: "destructive" });
    },
  });

  const activateDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("deals").update({ status: "active" }).eq("id", dealId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "activate_deal",
        p_target_type: "deal",
        p_target_id: dealId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Deal activated" });
    },
    onError: (error) => {
      toast({ title: "Error activating deal", description: error.message, variant: "destructive" });
    },
  });

  const toggleFeaturedDeal = useMutation({
    mutationFn: async ({ dealId, featured }: { dealId: string; featured: boolean }) => {
      const { error } = await supabase.from("deals").update({ featured }).eq("id", dealId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: featured ? "feature_deal" : "unfeature_deal",
        p_target_type: "deal",
        p_target_id: dealId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Deal featured status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating deal", description: error.message, variant: "destructive" });
    },
  });

  const archiveDeal = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from("deals")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "archive_deal",
        p_target_type: "deal",
        p_target_id: dealId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Deal archived" });
    },
    onError: (error) => {
      toast({ title: "Error archiving deal", description: error.message, variant: "destructive" });
    },
  });

  return { deactivateDeal, activateDeal, toggleFeaturedDeal, archiveDeal };
}

// Reports Management
export function useAdminReports(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["admin", "reports", filters],
    queryFn: async () => {
      let query = supabase.from("user_reports").select("*").order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Report[];
    },
  });
}

export function useReportMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resolveReport = useMutation({
    mutationFn: async ({ reportId, note }: { reportId: string; note: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("user_reports")
        .update({
          status: "resolved",
          resolution_note: note,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "resolve_report",
        p_target_type: "report",
        p_target_id: reportId,
        p_details: { note },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast({ title: "Report resolved" });
    },
    onError: (error) => {
      toast({ title: "Error resolving report", description: error.message, variant: "destructive" });
    },
  });

  const dismissReport = useMutation({
    mutationFn: async ({ reportId, note }: { reportId: string; note?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("user_reports")
        .update({
          status: "dismissed",
          resolution_note: note || "Dismissed by admin",
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "dismiss_report",
        p_target_type: "report",
        p_target_id: reportId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast({ title: "Report dismissed" });
    },
    onError: (error) => {
      toast({ title: "Error dismissing report", description: error.message, variant: "destructive" });
    },
  });

  return { resolveReport, dismissReport };
}

// Platform Settings
export function usePlatformSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) throw error;

      // platform_settings.value is JSONB. Normalize to a friendly JS shape.
      // - If value is { enabled: boolean } -> return boolean
      // - If value is primitive json (true/false/number/string) -> return as-is
      // - Otherwise return the object
      const settings: Record<string, unknown> = {};
      data?.forEach((s: any) => {
        const v = s.value;
        if (v && typeof v === "object" && "enabled" in v) {
          settings[s.key] = Boolean((v as any).enabled);
        } else {
          settings[s.key] = v;
        }
      });

      return settings;
    },
  });
}

export function useSettingsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Always store as JSONB. For simple toggles, we store a boolean. For other
      // values, store the raw JSON value.
      const normalizedValue = value;
      // Use upsert so new settings keys can be introduced from the UI without
      // requiring a manual DB row insert.
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { key, value: normalizedValue as any, updated_at: new Date().toISOString(), updated_by: user?.id },
          { onConflict: "key" },
        );
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "update_setting",
        p_target_type: "setting",
        p_details: { key, value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating setting", description: error.message, variant: "destructive" });
    },
  });

  return { updateSetting };
}

// Audit Log
export function useAuditLog() {
  return useQuery({
    queryKey: ["admin", "audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

// Platform Messages
export function usePlatformMessages() {
  return useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PlatformMessage[];
    },
  });
}

export function useMessageMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sendMessage = useMutation({
    mutationFn: async ({
      title,
      content,
      targetAudience,
    }: {
      title: string;
      content: string;
      targetAudience: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("platform_messages").insert({
        sender_id: user!.id,
        title,
        content,
        target_audience: targetAudience,
      });
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "send_message",
        p_target_type: "message",
        p_details: { title, targetAudience },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      toast({ title: "Message sent" });
    },
    onError: (error) => {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const { error } = await supabase.from("platform_messages").delete().eq("id", messageId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "delete_message",
        p_target_type: "message",
        p_target_id: messageId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
      toast({ title: "Message deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting message", description: error.message, variant: "destructive" });
    },
  });

  return { sendMessage, deleteMessage };
}

// Admin Notes
export function useAdminNotes(targetType: string, targetId: string) {
  return useQuery({
    queryKey: ["admin", "notes", targetType, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notes")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });
}

export function useNoteMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addNote = useMutation({
    mutationFn: async ({ targetType, targetId, note }: { targetType: string; targetId: string; note: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("admin_notes").insert({
        admin_id: user!.id,
        target_type: targetType,
        target_id: targetId,
        note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      toast({ title: "Note added" });
    },
    onError: (error) => {
      toast({ title: "Error adding note", description: error.message, variant: "destructive" });
    },
  });

  return { addNote };
}
