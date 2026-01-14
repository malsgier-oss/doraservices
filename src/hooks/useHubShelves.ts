import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubShelfType = "category" | "manual";

export interface HubShelf {
  id: string;
  title_ar: string;
  shelf_type: HubShelfType;
  category_id: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
  max_items: number;
}

export interface HubShelfItem {
  id: string;
  shelf_id: string;
  // P0: manual shelves should curate *subcategories* (services) primarily.
  // For backward compatibility, some rows may still have category_id.
  subcategory_id?: string | null;
  category_id?: string | null;
  display_order: number;
}

export function useHubShelves(cityId?: string | null) {
  const [shelves, setShelves] = useState<HubShelf[]>([]);
  const [itemsByShelf, setItemsByShelf] = useState<Record<string, HubShelfItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);

      let q = supabase
        .from("hub_shelves")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cityId) {
        q = q.or(`city_id.is.null,city_id.eq.${cityId}`);
      } else {
        q = q.is("city_id", null);
      }

      const { data, error } = await q;
      if (!isMounted) return;

      if (error) {
        console.error("useHubShelves error:", error);
        setShelves([]);
        setItemsByShelf({});
        setLoading(false);
        return;
      }

      const shelvesRows = (data as any[]) as HubShelf[];
      setShelves(shelvesRows);

      // Load manual items for shelves in one query
      const manualShelfIds = shelvesRows.filter(s => s.shelf_type === "manual").map(s => s.id);

      if (manualShelfIds.length === 0) {
        setItemsByShelf({});
        setLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("hub_shelf_items")
        .select("*")
        .in("shelf_id", manualShelfIds)
        .order("display_order", { ascending: true });

      if (!isMounted) return;

      if (itemsError) {
        console.error("useHubShelves items error:", itemsError);
        setItemsByShelf({});
      } else {
        const grouped: Record<string, HubShelfItem[]> = {};
        for (const row of (itemsData as any[]) as HubShelfItem[]) {
          (grouped[row.shelf_id] ||= []).push(row);
        }
        setItemsByShelf(grouped);
      }

      setLoading(false);
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [cityId]);

  return { shelves, itemsByShelf, loading };
}
