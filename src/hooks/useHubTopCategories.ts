import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubTopCategory = {
  id: string;
  scope: "global" | "city";
  city_id: string | null;
  category_id: string;
  display_order: number;
  is_active: boolean;
};

/**
 * Returns the configured Top-8 category IDs for the given city.
 * Resolution rules:
 * 1) If city has 8 active rows, use them.
 * 2) Else fallback to global rows.
 */
export function useHubTopCategories(cityId?: string | null) {
  const [rows, setRows] = useState<HubTopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      let q = supabase
        .from("hub_top_categories")
        .select("id,scope,city_id,category_id,display_order,is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // We fetch both city + global and resolve client-side to keep it simple and predictable.
      if (cityId) {
        q = q.or(`scope.eq.city,scope.eq.global`);
      } else {
        q = q.eq("scope", "global");
      }

      const { data, error } = await q;
      if (!mounted) return;
      if (error) {
        console.error("useHubTopCategories error:", error);
        setRows([]);
      } else {
        const all = (((data as any[]) || []) as HubTopCategory[]).filter((r) => r.is_active !== false);
        if (!cityId) {
          setRows(all.filter((r) => r.scope === "global"));
        } else {
          const city = all.filter((r) => r.scope === "city" && r.city_id === cityId);
          const global = all.filter((r) => r.scope === "global");
          // If there is any city override, use city list; otherwise global.
          setRows(city.length > 0 ? city : global);
        }
      }
      setLoading(false);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [cityId]);

  const categoryIds = useMemo(() => rows.map((r) => r.category_id), [rows]);

  return { rows, categoryIds, loading };
}
