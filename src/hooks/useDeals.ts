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
  cityId?: string | null;
  category?: string | null;
  featured?: boolean;
  businessId?: string | null;
  limit?: number;
}

export function useDeals(options: UseDealsOptions = {}) {
  const { cityId, category, featured, businessId, limit = 20 } = options;

  return useQuery({
    queryKey: ["deals", cityId, category, featured, businessId, limit],
    queryFn: async (): Promise<Deal[]> => {
      const select = cityId
        ? "*, businesses!inner(location,operational_status,authorization_status)"
        : "*";

      let query = supabase
        .from("deals")
        .select(select)
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

      // Filter by city if cityId is provided (join to businesses and match on free-text `location`)
      if (cityId) {
        // Ensure we only show deals for approved + active businesses
        query = query.eq("businesses.operational_status", "active").eq("businesses.authorization_status", "approved");

        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .eq("id", cityId)
          .maybeSingle();

        const cityNames = [cityData?.name, cityData?.name_ar].filter(Boolean).map(String);
        if (cityNames.length > 0) {
          const or = cityNames.map((n) => `businesses.location.ilike.%${n}%`).join(",");
          query = query.or(or);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching deals:", error);
        return [];
      }

      // If we joined `businesses`, strip it before returning.
      return ((data || []) as any[]).map((row) => {
        const { businesses: _businesses, ...deal } = row || {};
        return deal as Deal;
      });
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
  });
}
