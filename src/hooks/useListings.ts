import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ListingStatus = "draft" | "active" | "sold" | "archived";

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  currency: string;
  city_id: string | null;
  location: string | null;
  image_urls: string[] | null;
  status: ListingStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseListingsOptions {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  status?: ListingStatus;
  limit?: number;
  excludeId?: string | null;
  enabled?: boolean;
}

export function useListings(options: UseListingsOptions = {}) {
  const { cityId, category, search, status = "active", limit = 20, excludeId, enabled = true } = options;

  return useQuery({
    queryKey: ["listings", cityId, category, search, status, limit, excludeId],
    queryFn: async (): Promise<Listing[]> => {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", status)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cityId) query = query.eq("city_id", cityId);
      if (category) query = query.eq("category", category);
      if (excludeId) query = query.neq("id", excludeId);

      const q = (search || "").trim();
      if (q) {
        // Best-effort text match across title/description
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching listings:", error);
        return [];
      }

      return (data || []) as Listing[];
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
    enabled,
  });
}

