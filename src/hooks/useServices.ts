import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Service {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_paused?: boolean;
  is_visible?: boolean;
  approval_status?: string;
  created_at: string;
  updated_at: string;

  // denormalized provider fields on services row (P0 critical)
  provider_name?: string | null;
  provider_avatar?: string | null;
  provider_phone?: string | null;

  // optional location fields if your table has them
  city?: string | null;
  sub_city?: string | null;
}

function digitsOnly(v: string) {
  return (v || "").replace(/\D/g, "");
}

function normalizeLibyaPhoneForStorage(raw: string | null | undefined) {
  const d = digitsOnly(raw || "");
  if (!d) return "";

  if (d.startsWith("218")) return d;
  if (d.length === 10 && d.startsWith("0")) return `218${d.slice(1)}`;
  if (d.length === 9) return `218${d}`;
  return d;
}

export function useServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllServices = async () => {
    setLoading(true);

    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      setServices([]);
      setLoading(false);
      return;
    }

    const base = (servicesData || []) as any[];

    // ✅ P0 rule: always rely on denormalized fields in services row.
    // Profiles may be blocked by RLS for other users (even when signed in).
    // We'll do best-effort enrichment ONLY and never overwrite existing service phone/name.
    const userIds = Array.from(new Set(base.map((s) => s.user_id).filter(Boolean))) as string[];

    let profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .in("user_id", userIds);

      if (profilesError) {
        // expected in many setups because of RLS (non-admin can't read other profiles)
        console.warn("Profiles lookup blocked/failed; using service-level fields only:", profilesError.message);
      } else {
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }
    }

    const enrichedServices: Service[] = base.map((service) => {
      const p = service.user_id ? profileMap.get(service.user_id) : null;

      const svcPhone = normalizeLibyaPhoneForStorage(service.provider_phone);
      const profPhone = normalizeLibyaPhoneForStorage(p?.phone);

      return {
        ...service,
        provider_name:
          (service.provider_name && String(service.provider_name).trim()) ||
          (p?.full_name && String(p.full_name).trim()) ||
          "Provider",
        provider_avatar: (service.provider_avatar && String(service.provider_avatar)) || (p?.avatar_url || ""),
        // ✅ never overwrite a non-empty service phone with an empty profile phone
        provider_phone: svcPhone || profPhone || "",
      };
    });

    setServices(enrichedServices);
    setLoading(false);
  };

  const fetchMyServices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my services:", error);
    } else {
      setMyServices((data || []) as any);
    }
  };

  useEffect(() => {
    fetchAllServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) fetchMyServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const createService = async (serviceData: {
    title: string;
    description?: string;
    category: string;
    price: number;
    image_url?: string;
    city?: string | null;
    sub_city?: string | null;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Dora P0: denormalize provider info into services row so call/WhatsApp works for guests.
    let provider: {
      full_name: string | null;
      phone: string | null;
      city: string | null;
      sub_city: string | null;
      avatar_url?: string | null;
    } | null = null;

    try {
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, phone, city, sub_city, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (!pErr) provider = p as any;
    } catch {
      // ignore
    }

    const providerPhone = normalizeLibyaPhoneForStorage(provider?.phone);
    const providerName = (provider?.full_name || "").trim() || "Provider";

    const { data, error } = await supabase
      .from("services")
      .insert({
        user_id: user.id,
        title: serviceData.title,
        description: serviceData.description || null,
        category: serviceData.category,
        price: serviceData.price,
        image_url: serviceData.image_url || null,

        provider_name: providerName,
        provider_phone: providerPhone || null,
        provider_avatar: provider?.avatar_url || null,

        city: serviceData.city ?? provider?.city ?? null,
        sub_city: serviceData.sub_city ?? provider?.sub_city ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      setMyServices((prev) => [data as any, ...prev]);
      await fetchAllServices();
    }

    return { data, error };
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { data, error } = await supabase.from("services").update(updates as any).eq("id", id).select().single();

    if (!error && data) {
      setMyServices((prev) => prev.map((s) => (s.id === id ? (data as any) : s)));
      await fetchAllServices();
    }

    return { data, error };
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);

    if (!error) {
      setMyServices((prev) => prev.filter((s) => s.id !== id));
      await fetchAllServices();
    }

    return { error };
  };

  return {
    services,
    myServices,
    loading,
    createService,
    updateService,
    deleteService,
    refreshServices: fetchAllServices,
    refreshMyServices: fetchMyServices,
  };
}
