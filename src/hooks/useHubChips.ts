import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubChipTargetType = "category" | "subcategory" | "shelf";

export type HubChip = {
  id: string;
  label_ar: string | null;
  label_en: string | null;
  target_type: HubChipTargetType;
  target_category_id: string | null;
  target_subcategory_id: string | null;
  target_shelf_id: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
};

export function useHubChips(cityId?: string | null) {
  const [chips, setChips] = useState<HubChip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      let q = supabase
        .from("hub_chips")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cityId) {
        q = q.or(`city_id.is.null,city_id.eq.${cityId}`);
      } else {
        q = q.is("city_id", null);
      }

      const { data, error } = await q;
      if (!mounted) return;
      if (error) {
        console.error("useHubChips error:", error);
        setChips([]);
      } else {
        setChips(((data as any[]) || []) as HubChip[]);
      }
      setLoading(false);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [cityId]);

  return { chips, loading };
}
