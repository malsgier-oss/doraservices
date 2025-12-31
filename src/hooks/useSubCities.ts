import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubCity {
  id: string;
  city_id: string;
  name: string;
  name_ar: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export function useSubCities(cityId?: string | null) {
  return useQuery({
    queryKey: ["sub_cities", cityId],
    queryFn: async () => {
      let query = supabase
        .from("sub_cities")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cityId) {
        query = query.eq("city_id", cityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SubCity[];
    },
    enabled: cityId !== undefined,
  });
}

export function useAllSubCities() {
  return useQuery({
    queryKey: ["sub_cities", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_cities")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SubCity[];
    },
  });
}
