import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Business {
  id: string;
  user_id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  authorization_status: string;
  operational_status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseBusinessesOptions {
  cityId?: string | null;
  category?: string | null;
  featured?: boolean;
  limit?: number;
}

export function useBusinesses(options: UseBusinessesOptions = {}) {
  const { cityId, category, featured, limit = 20 } = options;

  return useQuery({
    queryKey: ["businesses", cityId, category, featured, limit],
    queryFn: async (): Promise<Business[]> => {
      let query = supabase
        .from("businesses")
        .select("*")
        .eq("operational_status", "active")
        .eq("authorization_status", "approved")
        .is("archived_at", null)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);

      if (featured !== undefined) {
        query = query.eq("featured", featured);
      }

      if (category) {
        query = query.eq("category", category);
      }

      // Filter by city if cityId is provided (best-effort: match on free-text `location`)
      if (cityId) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name,name_ar")
          .eq("id", cityId)
          .maybeSingle();

        const cityNames = [cityData?.name, cityData?.name_ar].filter(Boolean).map(String);
        if (cityNames.length > 0) {
          // PostgREST OR across multiple ILIKE patterns
          const or = cityNames.map((n) => `location.ilike.%${n}%`).join(",");
          query = query.or(or);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching businesses:", error);
        return [];
      }

      return (data || []) as Business[];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
  });
}
