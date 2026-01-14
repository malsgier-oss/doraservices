import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubBannerTargetType = "category" | "url";

export interface HubBanner {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  cta_text_ar: string | null;
  image_path: string;
  target_type: HubBannerTargetType;
  target_category_id: string | null;
  target_url: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
}

export function useHubBanners(cityId?: string | null) {
  const [banners, setBanners] = useState<HubBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoading(true);

      const nowIso = new Date().toISOString();

      // RLS only allows selecting active rows, so we don't need to add is_active filter for safety.
      // Still, we keep it explicit for clarity and future-proofing.
      let q = supabase
        .from("hub_banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (cityId) {
        // show city-specific banners + global banners
        q = q.or(`city_id.is.null,city_id.eq.${cityId}`);
      } else {
        q = q.is("city_id", null);
      }

      // Date windows: show if (start_at is null or <= now) AND (end_at is null or >= now)
      q = q.or(`start_at.is.null,start_at.lte.${nowIso}`);
      q = q.or(`end_at.is.null,end_at.gte.${nowIso}`);

      const { data, error } = await q;

      if (!isMounted) return;

      if (error) {
        console.error("useHubBanners error:", error);
        setBanners([]);
      } else {
        setBanners((data as any[]) as HubBanner[]);
      }
      setLoading(false);
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [cityId]);

  const publicUrlsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of banners) {
      const { data } = supabase.storage.from("hub-banners").getPublicUrl(b.image_path);
      map[b.id] = data.publicUrl;
    }
    return map;
  }, [banners]);

  return { banners, loading, publicUrlsById };
}
