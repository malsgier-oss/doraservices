import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubSectionKey = "banner" | "services" | "shelves" | "active";

export type HubLayout = {
  order: HubSectionKey[];
  enabled: Record<HubSectionKey, boolean>;
};

const DEFAULT_LAYOUT: HubLayout = {
  order: ["banner", "services", "shelves", "active"],
  enabled: { banner: true, services: true, shelves: true, active: true },
};

function coerceLayout(value: any): HubLayout {
  try {
    const order = Array.isArray(value?.order) ? (value.order as HubSectionKey[]) : DEFAULT_LAYOUT.order;
    const enabled = typeof value?.enabled === "object" && value.enabled ? value.enabled : DEFAULT_LAYOUT.enabled;

    const sanitizedOrder = order.filter((k) => ["banner", "services", "shelves", "active"].includes(k));
    const fullOrder: HubSectionKey[] = Array.from(new Set([...sanitizedOrder, ...DEFAULT_LAYOUT.order]));

    const fullEnabled: Record<HubSectionKey, boolean> = {
      banner: enabled.banner !== false,
      services: enabled.services !== false,
      shelves: enabled.shelves !== false,
      active: enabled.active !== false,
    };

    return { order: fullOrder, enabled: fullEnabled };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function useHubLayout(cityId: string | null) {
  const [layout, setLayout] = useState<HubLayout>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Prefer city-specific row, fallback to default (city_id null)
        let q = supabase
          .from("hub_layout_settings")
          .select("id, city_id, sections")
          .order("city_id", { ascending: false })
          .limit(5);

        if (cityId) {
          q = q.or(`city_id.eq.${cityId},city_id.is.null`);
        } else {
          q = q.is("city_id", null);
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data as any[]) || [];
        const best = cityId ? rows.find((r) => r.city_id === cityId) ?? rows.find((r) => r.city_id == null) : rows[0];
        const next = coerceLayout(best?.sections);

        if (!cancelled) setLayout(next);
      } catch (e) {
        console.warn("useHubLayout: failed to load layout, using defaults", e);
        if (!cancelled) setLayout(DEFAULT_LAYOUT);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  return useMemo(() => ({ layout, loading }), [layout, loading]);
}
