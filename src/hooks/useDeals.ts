import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Deal {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  discount: string;
  category: string;
  discount_type: "percentage" | "fixed" | "free_item";
  start_date: string;
  expires_at: string | null;
  promo_code: string | null;
  terms_conditions: string | null;
  status: string;
  image_url: string | null;
  views_count: number;
  clicks_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseDealsOptions {
  /** Not applied: businesses table has no city_id. Deals are shown for all cities until schema supports it. */
  cityId?: string | null;
  category?: string | null;
  featured?: boolean;
  businessId?: string | null;
  search?: string | null;
  limit?: number;
}

function escapeForLike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export function useDeals(options: UseDealsOptions = {}) {
  const { category, featured, businessId, search, limit = 20 } = options;

  return useQuery({
    queryKey: ["deals", category, featured, businessId, search, limit],
    queryFn: async (): Promise<Deal[]> => {
      let query = supabase
        .from("deals")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .is("archived_at", null)
        .order("featured", { ascending: false })
        .order("views_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (featured !== undefined) {
        query = query.eq("featured", featured);
      }

      if (category) {
        query = query.eq("category", category);
      }

      if (businessId) {
        query = query.eq("business_id", businessId);
      }

      const q = (search ?? "").trim();
      if (q) {
        const escaped = escapeForLike(q);
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching deals:", error);
        throw error;
      }

      return (data || []) as Deal[];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
  });
}
