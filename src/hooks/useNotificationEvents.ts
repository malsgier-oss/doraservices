import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationEvent {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function useNotificationEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("notification_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as NotificationEvent[];
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-events", "unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from("notification_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useNotificationEventMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notification_events")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-events"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from("notification_events")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-events"] });
    },
  });

  return { markAsRead, markAllAsRead };
}
