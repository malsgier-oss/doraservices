import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/hooks/useListings";

export function useListing(listingId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["listing", listingId],
    queryFn: async (): Promise<Listing | null> => {
      if (!listingId) return null;
      const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
      if (error) {
        console.error("Error fetching listing:", error);
        return null;
      }
      return (data as any) as Listing;
    },
    enabled: enabled && !!listingId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

