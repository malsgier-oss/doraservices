import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityItem {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  created_at: string;
  isNew?: boolean;
  type: "new" | "popular";
}

export function useActivityFeed(cityId?: string | null) {
  return useQuery({
    queryKey: ["activity-feed", cityId],
    queryFn: async (): Promise<ActivityItem[]> => {
      const activities: ActivityItem[] = [];

      // Get new services (last 48 hours)
      let newServicesQuery = supabase
        .from("services")
        .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,created_at")
        .eq("is_active", true)
        .eq("is_visible", true)
        .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(6);

      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .eq("id", cityId)
          .maybeSingle();

        if (cityData) {
          const cityNames = [cityData.name, cityData.name_ar].filter(Boolean);
          if (cityNames.length > 0) {
            newServicesQuery = newServicesQuery.in("city", cityNames);
          }
        }
      }

      const { data: newServices } = await newServicesQuery;

      if (newServices) {
        activities.push(
          ...newServices.map((s) => ({
            ...s,
            isNew: true,
            type: "new" as const,
          }))
        );
      }

      // Get popular services in city (by views)
      let popularQuery = supabase
        .from("services")
        .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,created_at,views_count")
        .eq("is_active", true)
        .eq("is_visible", true)
        .gt("views_count", 0)
        .order("views_count", { ascending: false })
        .limit(4);

      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .eq("id", cityId)
          .maybeSingle();

        if (cityData) {
          const cityNames = [cityData.name, cityData.name_ar].filter(Boolean);
          if (cityNames.length > 0) {
            popularQuery = popularQuery.in("city", cityNames);
          }
        }
      }

      const { data: popularServices } = await popularQuery;

      if (popularServices) {
        activities.push(
          ...popularServices.map((s) => ({
            ...s,
            isNew: false,
            type: "popular" as const,
          }))
        );
      }

      // Remove duplicates and shuffle
      const unique = Array.from(
        new Map(activities.map((item) => [item.id, item])).values()
      );

      return unique.slice(0, 8);
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 1,
  });
}
