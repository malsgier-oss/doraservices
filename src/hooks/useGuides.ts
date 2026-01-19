import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GuideRow = {
  id: string;
  icon_key: string;
  title_ar: string;
  title_en: string | null;
  summary_lines_ar: string[];
  summary_lines_en: string[] | null;
  bullets_ar: string[];
  bullets_en: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select(
          "id,icon_key,title_ar,title_en,summary_lines_ar,summary_lines_en,bullets_ar,bullets_en,sort_order,is_active,created_at",
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as GuideRow[];
    },
    staleTime: 60_000,
  });
}
