import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select(
          "id, name, name_ar, icon, color, display_order, is_active, created_at, updated_at"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("[useCategories] error:", error);
        throw error;
      }

      return (data ?? []) as Category[];
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
    retry: 1,
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("[useAllCategories] error:", error);
        throw error;
      }

      return (data ?? []) as Category[];
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}