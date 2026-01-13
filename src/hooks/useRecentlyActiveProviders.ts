import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HubProviderCard = {
  service_id: string;
  category: string;
  service_title: string;
  provider_name: string;
  provider_phone: string;
  provider_avatar: string | null;
  provider_city: string | null;
  provider_sub_city: string | null;
  subcategory_id: string | null;
  last_activity_at: string | null;
};

type Args = {
  limit?: number;
};

/**
 * Recently active providers for Hub.
 * Uses services.last_activity_at (updated server-side) so the Hub doesn't need to read raw events.
 */
export function useRecentlyActiveProviders({ limit = 10 }: Args) {
  const [data, setData] = useState<HubProviderCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = supabase
          .from("services")
          .select(
            "id, category, title, user_id, provider_name, provider_phone, city, sub_city, is_active, is_paused, is_visible, approval_status, last_activity_at",
          )
          .eq("is_active", true)
          .eq("is_visible", true)
          .eq("is_paused", false)
          .eq("approval_status", "approved")
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(limit);

        const { data: services, error: svcErr } = await query;
        if (svcErr) throw svcErr;

        const rows = services || [];

        // Fetch avatars for claimed services
        const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
        let avatarByUser: Record<string, string | null> = {};

        if (userIds.length) {
          const { data: profiles, error: profErr } = await supabase
            .from("profiles")
            .select("user_id, avatar_url")
            .in("user_id", userIds);
          if (profErr) throw profErr;
          for (const p of profiles || []) {
            avatarByUser[p.user_id] = (p as any).avatar_url || null;
          }
        }

        const cards: HubProviderCard[] = rows.map((svc: any) => ({
          service_id: svc.id,
          category: svc.category,
          service_title: svc.title,
          provider_name: svc.provider_name || "",
          provider_phone: String(svc.provider_phone || ""),
          provider_avatar: svc.user_id ? avatarByUser[svc.user_id] ?? null : null,
          provider_city: svc.city || null,
          provider_sub_city: svc.sub_city || null,
          subcategory_id: null,
          last_activity_at: svc.last_activity_at || null,
        }));

        if (!cancelled) {
          setData(cards);
        }
      } catch (e: any) {
        console.error("useRecentlyActiveProviders error", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load recently active providers");
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { data, loading, error };
}
