import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MostDemandedServiceRow = {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  // Returned by RPC (optional for UI)
  demand_score?: number | null;
};

type Params = {
  /** City names (AR/EN variants) used to filter demand. Empty = no city filter. */
  cityNames?: string[] | null;
  limit?: number;
};

export function useMostDemandedServices(params: Params) {
  const { cityNames, limit = 6 } = params;

  const cityNamesStable = useMemo(() => {
    const arr = (cityNames || []).map((s) => String(s || "").trim()).filter(Boolean);
    // Deduplicate to keep payload small.
    return Array.from(new Set(arr));
  }, [cityNames]);

  const [rows, setRows] = useState<MostDemandedServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_most_demanded_services", {
          p_city_names: cityNamesStable.length > 0 ? cityNamesStable : null,
          p_limit: limit,
        } as any);

        if (!mounted) return;

        if (error) {
          console.error("useMostDemandedServices rpc error:", error);
          // Fall back to counter-based ranking if RPC is missing/misconfigured.
          // This keeps the Hub section alive even before events are flowing.
          try {
            const base = supabase
              .from("services")
              .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,views_count,call_clicks,whatsapp_clicks")
              .eq("is_active", true)
              .eq("is_visible", true)
              .eq("is_paused", false)
              .eq("approval_status", "approved")
              .is("deleted_at", null)
              .eq("exclude_from_demand", false)
              .limit(Math.max(12, limit));

            const { data: fallbackData, error: fallbackError } = await base;

            if (fallbackError) {
              // If schema doesn't have city/sub_city/counters, just bail quietly.
              console.error("useMostDemandedServices fallback error:", fallbackError);
              setRows([]);
            } else {
              const list = ((fallbackData as any[]) || []) as any[];
              const scored = list
                .map((r) => {
                  const views = Number(r?.views_count ?? 0) || 0;
                  const call = Number(r?.call_clicks ?? 0) || 0;
                  const wa = Number(r?.whatsapp_clicks ?? 0) || 0;
                  return {
                    id: String(r.id),
                    title: String(r.title ?? ""),
                    category: String(r.category ?? ""),
                    provider_name: r.provider_name ?? null,
                    provider_phone: r.provider_phone ?? null,
                    allow_whatsapp: r.allow_whatsapp ?? null,
                    city: r.city ?? null,
                    sub_city: r.sub_city ?? null,
                    image_url: r.image_url ?? null,
                    demand_score: call * 3 + wa * 3 + views,
                  } satisfies MostDemandedServiceRow;
                })
                .sort((a, b) => (Number(b.demand_score ?? 0) - Number(a.demand_score ?? 0)) || a.id.localeCompare(b.id))
                .slice(0, limit);

              setRows(scored);
            }
          } catch (e) {
            console.error("useMostDemandedServices fallback exception:", e);
            setRows([]);
          }
        } else {
          setRows((((data as any[]) || []) as MostDemandedServiceRow[]) ?? []);
        }
      } catch (e) {
        if (!mounted) return;
        console.error("useMostDemandedServices exception:", e);
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [cityNamesStable, limit]);

  return { rows, loading };
}
