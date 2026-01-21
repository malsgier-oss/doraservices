import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingService {
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
  calls_count?: number;
  created_at: string;
}

export function useTrendingServices(cityId?: string | null, limit = 12) {
  return useQuery({
    queryKey: ["trending-services", cityId, limit],
    queryFn: async (): Promise<TrendingService[]> => {
      let query = supabase
        .from("services")
        .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,views_count,created_at")
        .eq("is_active", true)
        .eq("is_visible", true)
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
        console.error("Error fetching trending services:", error);
        return [];
      }

      // Sort by combined engagement (views + calls if available)
      const sorted = (data || []).map((service) => ({
        ...service,
        calls_count: 0, // Add if you track calls_count
      })).sort((a, b) => {
        const scoreA = (a.views_count || 0) + (a.calls_count || 0);
        const scoreB = (b.views_count || 0) + (b.calls_count || 0);
        return scoreB - scoreA;
      });

      return sorted as TrendingService[];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
  });
}
