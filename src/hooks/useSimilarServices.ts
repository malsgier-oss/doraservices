import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SimilarService {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
}

export function useSimilarServices(
  category: string,
  excludeServiceId?: string,
  city?: string | null,
  limit = 8
) {
  return useQuery({
    queryKey: ["similar-services", category, excludeServiceId, city, limit],
    queryFn: async (): Promise<SimilarService[]> => {
      let query = supabase
        .from("services")
        .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,is_featured,is_verified,price")
        .eq("is_active", true)
        .eq("is_visible", true)
        .eq("is_paused", false)
        .eq("approval_status", "approved")
        .eq("category", category)
        .order("views_count", { ascending: false })
        .limit(limit + 1); // Get one extra to exclude the current service

      if (excludeServiceId) {
        query = query.neq("id", excludeServiceId);
      }

      if (city) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .or(`name.eq.${city},name_ar.eq.${city}`)
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
        console.error("Error fetching similar services:", error);
        return [];
      }

      return ((data || []).slice(0, limit) as SimilarService[]) || [];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
    enabled: !!category,
  });
}
