import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReviewPrompt {
  id: string;
  user_id: string;
  service_id: string;
  provider_id: string;
  call_log_id: string | null;
  status: string;
  trigger_at: string;
  prompt_sent_at: string | null;
  reviewed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  service_title?: string;
  provider_name?: string;
}

export function useReviewPrompts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["review-prompts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get pending prompts that are ready to show
      const { data, error } = await supabase
        .from("review_prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .lte("trigger_at", new Date().toISOString())
        .order("trigger_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Enrich with service and provider info
      const serviceIds = [...new Set(data.map((p) => p.service_id))];

      const { data: services } = await supabase
        .from("services")
        .select("id, title, provider_name")
        .in("id", serviceIds);

      const serviceTitleMap = new Map(services?.map((s: any) => [s.id, s.title]) || []);
      const serviceProviderNameMap = new Map(services?.map((s: any) => [s.id, s.provider_name]) || []);

      return data.map((prompt) => ({
        ...prompt,
        service_title: serviceTitleMap.get(prompt.service_id) || "Service",
        provider_name: serviceProviderNameMap.get(prompt.service_id) || "Provider",
      })) as ReviewPrompt[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  });

  const dismissPrompt = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase
        .from("review_prompts")
        .update({
          status: "dismissed",
          dismissed_at: new Date().toISOString(),
        })
        .eq("id", promptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-prompts"] });
    },
  });

  const markReviewed = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase
        .from("review_prompts")
        .update({
          status: "completed",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", promptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-prompts"] });
    },
  });

  return {
    prompts: prompts || [],
    isLoading,
    dismissPrompt,
    markReviewed,
    hasPrompts: (prompts?.length || 0) > 0,
  };
}
