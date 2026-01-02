import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  value: string;
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
      const [
        { count: totalUsers },
        { count: businessUsers },
        { count: pendingBusinesses },
        { count: approvedBusinesses },
        { count: activeDeals },
        { count: suspendedProfiles },
        { count: pendingReports },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "business"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("authorization_status", "pending"),
        supabase.from("businesses").select("*", { count: "exact", head: true }).eq("authorization_status", "approved"),
        supabase.from("deals").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("user_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalUsers: totalUsers || 0,
        businessUsers: businessUsers || 0,
        pendingBusinesses: pendingBusinesses || 0,
        approvedBusinesses: approvedBusinesses || 0,
        activeDeals: activeDeals || 0,
        suspendedProfiles: suspendedProfiles || 0,
        pendingReports: pendingReports || 0,
      };
    },
  });
}

// Users Management
export function useAdminUsers(filters?: { status?: string; role?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.ilike("full_name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get roles for each user
      const userIds = data?.map((p) => p.user_id) || [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        roleMap.set(r.user_id, [...existing, r.role]);
      });

      let result = data?.map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) || [],
      })) || [];

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
      const { error } = await supabase
        .from("profiles")
        .update({ status: "archived" })
        .eq("user_id", userId);
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

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: { action: "deleteUser", userId },
      });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
        throw new Error(String((data as Record<string, unknown>).error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "User deleted" });
    },
    onError: (error) => {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    },
  });

  const changeUserRole = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: "user" | "business" | "admin"; action: "add" | "remove" }) => {
      if (action === "add") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }

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

  return { suspendUser, reactivateUser, archiveUser, deleteUser, changeUserRole };
}

// Businesses Management
export function useAdminBusinesses(filters?: { status?: string; authorization?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "businesses", filters],
    queryFn: async () => {
      let query = supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

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
        const title = status === "approved" 
          ? "Business Approved! 🎉" 
          : status === "rejected" 
          ? "Business Application Update" 
          : "Business Status Updated";
        const content = status === "approved"
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
      const { error } = await supabase
        .from("businesses")
        .update({ featured })
        .eq("id", businessId);
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
      let query = supabase
        .from("deals")
        .select("*, businesses(name)")
        .order("created_at", { ascending: false });

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
      const { error } = await supabase
        .from("deals")
        .update({ status: "inactive" })
        .eq("id", dealId);
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
      const { error } = await supabase
        .from("deals")
        .update({ status: "active" })
        .eq("id", dealId);
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
      const { error } = await supabase
        .from("deals")
        .update({ featured })
        .eq("id", dealId);
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
      let query = supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false });

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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*");
      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        settings[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value);
      });
      return settings;
    },
  });
}

export function useSettingsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: value, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("key", key);
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
    mutationFn: async ({ title, content, targetAudience }: { title: string; content: string; targetAudience: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("platform_messages")
        .insert({
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

  return { sendMessage };
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("admin_notes")
        .insert({
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
