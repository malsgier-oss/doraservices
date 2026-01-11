import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface City {
  id: string;
  name: string;
  name_ar: string | null;
  region: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as City[];
    },
  });
}

export function useAllCities() {
  return useQuery({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("*").order("display_order", { ascending: true });

      if (error) throw error;
      return data as City[];
    },
  });
}
