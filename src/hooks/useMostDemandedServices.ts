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
          console.error("useMostDemandedServices error:", error);
          setRows([]);
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
