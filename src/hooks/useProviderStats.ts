import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProviderStats {
  provider_id: string;
  total_calls: number;
  total_favorites: number;
  profile_views: number;
  updated_at: string;
}

export function useProviderStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["provider-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("provider_stats")
        .select("*")
        .eq("provider_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return default stats if none exist yet
      return data || {
        provider_id: user.id,
        total_calls: 0,
        total_favorites: 0,
        profile_views: 0,
        updated_at: new Date().toISOString(),
      };
    },
    enabled: !!user,
  });
}

export function useServiceStats(providerId?: string) {
  const { user } = useAuth();
  const id = providerId || user?.id;

  return useQuery({
    queryKey: ["service-stats", id],
    queryFn: async () => {
      if (!id) return [];

      // Get call counts per service
      const { data: callData, error: callError } = await supabase
        .from("call_logs")
        .select("service_id")
        .eq("provider_id", id);

      if (callError) throw callError;

      // Get services with views count
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("id, title, views_count")
        .eq("user_id", id);

      if (servicesError) throw servicesError;

      // Count calls per service
      const callCounts = callData.reduce((acc, log) => {
        acc[log.service_id] = (acc[log.service_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return services.map(service => ({
        id: service.id,
        title: service.title,
        calls: callCounts[service.id] || 0,
        favorites: 0,
        views: service.views_count || 0,
      }));
    },
    enabled: !!id,
  });
}
