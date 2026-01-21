import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HubStats {
  totalServices: number;
  totalBusinesses: number;
  activeDeals: number;
  totalCities: number;
}

export function useHubStats() {
  return useQuery({
    queryKey: ["hub-stats"],
    queryFn: async (): Promise<HubStats> => {
      // Get total active services
      const { count: servicesCount } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get total active businesses
      const { count: businessesCount } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("operational_status", "active");

      // Get active deals (not expired)
      const { count: dealsCount } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .is("archived_at", null);

      // Get total active cities
      const { count: citiesCount } = await supabase
        .from("cities")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return {
        totalServices: servicesCount || 0,
        totalBusinesses: businessesCount || 0,
        activeDeals: dealsCount || 0,
        totalCities: citiesCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
