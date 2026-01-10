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
  created_at: string;
  updated_at: string;
  provider_name?: string;
  provider_avatar?: string;
  provider_phone?: string;
}

export function useServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllServices = async () => {
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (servicesError) {
      console.error("Error fetching services:", servicesError);
      return;
    }

    // Get provider profiles for each service
    const userIds = [...new Set(servicesData?.map((s) => s.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, phone")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enrichedServices = (servicesData || []).map((service) => ({
      ...service,
      provider_name: profileMap.get(service.user_id)?.full_name || "Provider",
      provider_avatar: profileMap.get(service.user_id)?.avatar_url || "",
      provider_phone: profileMap.get(service.user_id)?.phone || "",
    }));

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
      setMyServices(data || []);
    }
  };

  useEffect(() => {
    fetchAllServices();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyServices();
    }
  }, [user]);

  const createService = async (serviceData: {
    title: string;
    description?: string;
    category: string;
    price: number;
    image_url?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Dora P0: ensure call/WhatsApp works even for anonymous users.
    // We denormalize provider_name/phone/city/sub_city into the service row at creation time.
    let provider: {
      full_name: string | null;
      phone: string | null;
      city: string | null;
      sub_city: string | null;
    } | null = null;
    try {
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, phone, city, sub_city")
        .eq("user_id", user.id)
        .single();
      if (!pErr) provider = p as any;
    } catch {
      // ignore
    }

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
        provider_phone: provider?.phone || null,
        city: provider?.city || null,
        sub_city: provider?.sub_city || null,
      })
      .select()
      .single();

    if (!error && data) {
      setMyServices((prev) => [data, ...prev]);
      await fetchAllServices(); // Refresh all services
    }

    return { data, error };
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { data, error } = await supabase.from("services").update(updates).eq("id", id).select().single();

    if (!error && data) {
      setMyServices((prev) => prev.map((s) => (s.id === id ? data : s)));
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
