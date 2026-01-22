import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreStats } from "@/types/store";

export function useStoreStats(businessId: string | null) {
  return useQuery({
    queryKey: ["store-stats", businessId],
    queryFn: async (): Promise<StoreStats> => {
      if (!businessId) {
        return {
          total_views: 0,
          total_calls: 0,
          total_whatsapp: 0,
          active_listings_count: 0,
        };
      }

      // Get aggregated stats from store_listings
      const { data: listings, error } = await supabase
        .from("store_listings")
        .select("views_count, calls_count, whatsapp_count, status")
        .eq("business_id", businessId)
        .is("archived_at", null);

      if (error) {
        console.error("Error fetching store stats:", error);
        return {
          total_views: 0,
          total_calls: 0,
          total_whatsapp: 0,
          active_listings_count: 0,
        };
      }

      const stats = (listings || []).reduce(
        (acc, listing) => {
          acc.total_views += listing.views_count || 0;
          acc.total_calls += listing.calls_count || 0;
          acc.total_whatsapp += listing.whatsapp_count || 0;
          if (listing.status === 'active') {
            acc.active_listings_count += 1;
          }
          return acc;
        },
        {
          total_views: 0,
          total_calls: 0,
          total_whatsapp: 0,
          active_listings_count: 0,
        }
      );

      return stats;
    },
    enabled: !!businessId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useStoreListingStats(listingId: string | null) {
  return useQuery({
    queryKey: ["store-listing-stats", listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from("store_listings")
        .select("views_count, calls_count, whatsapp_count")
        .eq("id", listingId)
        .single();

      if (error) {
        console.error("Error fetching listing stats:", error);
        return null;
      }

      return {
        views_count: data.views_count || 0,
        calls_count: data.calls_count || 0,
        whatsapp_count: data.whatsapp_count || 0,
      };
    },
    enabled: !!listingId,
    staleTime: 60_000,
    retry: 1,
  });
}
