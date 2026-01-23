import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BuySellStats {
  activeListings: number;
}

export function useBuySellStats() {
  return useQuery({
    queryKey: ["buy-sell-stats"],
    queryFn: async (): Promise<BuySellStats> => {
      // Get active listings count
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .is("archived_at", null);

      return {
        activeListings: listingsCount || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
