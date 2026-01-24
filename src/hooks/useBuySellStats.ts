import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuySellStats {
  activeDeals: number;
}

export function useBuySellStats() {
  return useQuery({
    queryKey: ["buy-sell-stats"],
    queryFn: async (): Promise<BuySellStats> => {
      // Get active deals count
      const { count: dealsCount } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .is("archived_at", null);

      return {
        activeDeals: dealsCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
