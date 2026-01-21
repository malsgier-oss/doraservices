import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Service {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_paused?: boolean;
  is_visible?: boolean;
  approval_status?: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;

  // Dora P0: denormalized provider fields (so guests can call/WhatsApp even if profiles are RLS-protected)
  provider_name?: string | null;
  provider_avatar?: string | null;
  provider_phone?: string | null;
  /** If false, hide WhatsApp CTA everywhere */
  allow_whatsapp?: boolean | null;
  city?: string | null;
  sub_city?: string | null;
}

function digitsOnly(v: string) {
  return (v || "").replace(/\D/g, "");
}

// Dora P0: store phone in services row so anonymous users can call/WhatsApp.
// We store digits-only with Libya country code when possible.
export function normalizeLibyaPhoneForStorage(raw: string | null | undefined) {
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
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      setServices([]);
      setLoading(false);
      return;
    }

    // IMPORTANT:
    // Treat NULL as the legacy/default value for older rows.
    // Some rows may have NULL for is_visible / is_paused / approval_status.
    // If we filter strictly at the query level, the Hub can appear empty.
    const rows = ((servicesData || []) as any[]).filter((s) => {
      const isVisible = s.is_visible ?? true;
      const isPaused = s.is_paused ?? false;
      const approval = (s.approval_status ?? "approved").toString().toLowerCase();
      return Boolean(isVisible) && !Boolean(isPaused) && approval === "approved";
    });

    // Optional enrichment from profiles (may fail for guests due to RLS).
    // IMPORTANT: never overwrite service-level provider_phone/name with empty values.
    const userIds = Array.from(new Set(rows.map((s) => s.user_id).filter(Boolean))) as string[];
    let profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone, city, sub_city")
        .in("user_id", userIds);

      if (profilesError) {
        // Guest browsing or restrictive RLS: this is expected.
        profileMap = new Map();
      } else {
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }
    }

    const enrichedServices: Service[] = rows.map((service) => {
      const p = service.user_id ? profileMap.get(service.user_id) : null;
      return {
        ...service,
        provider_name: p?.full_name || service.provider_name || "Provider",
        provider_avatar: p?.avatar_url || service.provider_avatar || "",
        // keep DB value if present
        provider_phone: p?.phone || service.provider_phone || "",
        city: p?.city || service.city || null,
        sub_city: p?.sub_city || service.sub_city || null,
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
      .is("deleted_at", null)
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
    if (user) void fetchMyServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createService = async (serviceData: {
    title: string;
    description?: string;
    category: string;
    price: number;
    image_url?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Dora P0: denormalize provider fields into the service row.
    let provider: {
      full_name: string | null;
      phone: string | null;
      city: string | null;
      sub_city: string | null;
      avatar_url: string | null;
    } | null = null;

    try {
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, phone, city, sub_city, avatar_url, provider_status, status")
        .eq("user_id", user.id)
        .single();
      if (!pErr) provider = p as any;
    } catch {
      // ignore
    }

    const storedPhone = normalizeLibyaPhoneForStorage(provider?.phone);

    // Dora P0: services should not be visible until provider/service is approved.
    // - Approved providers: default approved + visible
    // - Pending/rejected providers: default pending + hidden
    const providerStatus = ((provider as any)?.provider_status || "").toLowerCase();
    const isApprovedProvider = providerStatus === "approved";

    const { data, error } = await supabase
      .from("services")
      .insert({
        user_id: user.id,
        title: serviceData.title,
        description: serviceData.description || null,
        category: serviceData.category,
        price: serviceData.price,
        image_url: serviceData.image_url || null,
        provider_name: provider?.full_name || null,
        provider_avatar: provider?.avatar_url || null,
        provider_phone: storedPhone || null,
        city: provider?.city || null,
        sub_city: provider?.sub_city || null,
        approval_status: isApprovedProvider ? "approved" : "pending",
        is_visible: isApprovedProvider,
        is_active: true,
        is_paused: false,
        allow_whatsapp: true,
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
    const { data, error } = await supabase.from("services").update(updates).eq("id", id).select().single();

    if (!error && data) {
      setMyServices((prev) => prev.map((s) => (s.id === id ? (data as any) : s)));
      await fetchAllServices();
    }

    return { data, error };
  };

  const deleteService = async (id: string) => {
    // Dora P0: soft-delete (do not hard-delete rows).
    const { error } = await supabase
      .from("services")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        is_visible: false,
        is_paused: true,
      })
      .eq("id", id);

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
