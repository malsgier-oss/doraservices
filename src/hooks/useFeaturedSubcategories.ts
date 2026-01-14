import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeaturedSubcategory = {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
  featured_order: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
};

export function useFeaturedSubcategories(cityId?: string | null) {
  // City targeting is intentionally NOT applied here because subcategories are global;
  // if later you want per-city featured lists, we can add a mapping table.
  const [rows, setRows] = useState<FeaturedSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      const { data, error } = await supabase
        .from("subcategories")
        .select("id,category_id,name,name_ar,icon,color,featured_order,is_featured,is_active")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("featured_order", { ascending: true, nullsFirst: false })
        .order("display_order", { ascending: true, nullsFirst: false });

      if (!mounted) return;
      if (error) {
        console.error("useFeaturedSubcategories error:", error);
        setRows([]);
      } else {
        setRows((((data as any[]) || []) as FeaturedSubcategory[]) ?? []);
      }
      setLoading(false);
    }
    run();
    return () => {
      mounted = false;
    };
  }, [cityId]);

  return { rows, loading };
}
