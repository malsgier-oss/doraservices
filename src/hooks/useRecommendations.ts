import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Recommendation {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  views_count: number;
  created_at: string;
  reason?: string; // Why it's recommended
}

export function useRecommendations(cityId?: string | null, userId?: string | null, limit = 8) {
  return useQuery({
    queryKey: ["recommendations", cityId, userId, limit],
    queryFn: async (): Promise<Recommendation[]> => {
      // For now, return popular services in city
      // TODO: Add logic for user-based recommendations (favorites, history)
      let query = supabase
        .from("services")
        .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,views_count,created_at")
        .eq("is_active", true)
        .eq("is_visible", true)
        .eq("is_paused", false)
        .eq("approval_status", "approved")
        .is("deleted_at", null)
        .order("views_count", { ascending: false })
        .limit(limit);

      // Filter by city if provided
      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .eq("id", cityId)
          .maybeSingle();

        if (cityData) {
          const cityNames = [cityData.name, cityData.name_ar].filter(Boolean);
          if (cityNames.length > 0) {
            query = query.in("city", cityNames);
          }
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recommendations:", error);
        return [];
      }

      return (data || []).map((s) => ({
        ...s,
        reason: cityId ? "Popular in your area" : "Trending now",
      })) as Recommendation[];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
    enabled: true,
  });
}
