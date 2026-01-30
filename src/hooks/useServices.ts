import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

async function fetchAllServices(): Promise<Service[]> {
  const { data: servicesData, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (servicesError) {
    console.error("Error fetching services:", servicesError);
    throw servicesError;
  }

  const rows = ((servicesData || []) as Record<string, unknown>[]).filter((s) => {
    const isVisible = s.is_visible ?? true;
    const isPaused = s.is_paused ?? false;
    const approval = (s.approval_status ?? "approved").toString().toLowerCase();
    return !!isVisible && !isPaused && approval === "approved";
  });

  const userIds = Array.from(new Set(rows.map((s) => s.user_id).filter(Boolean))) as string[];
  let profileMap = new Map<string, Record<string, unknown>>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, phone, city, sub_city")
      .in("user_id", userIds);

    if (!profilesError && profiles?.length) {
      profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    }
  }

  return rows.map((service) => {
    const p = service.user_id ? profileMap.get(service.user_id as string) : null;
    return {
      ...service,
      provider_name: (p?.full_name as string) || service.provider_name || "Provider",
      provider_avatar: (p?.avatar_url as string) || service.provider_avatar || "",
      provider_phone: (p?.phone as string) || service.provider_phone || "",
      city: (p?.city as string) || service.city || null,
      sub_city: (p?.sub_city as string) || service.sub_city || null,
    } as Service;
  });
}

async function fetchMyServices(userId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my services:", error);
    throw error;
  }

  return (data || []) as Service[];
}

export function useServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const allServicesQuery = useQuery({
    queryKey: ["services", "all"],
    queryFn: fetchAllServices,
    staleTime: 2 * 60 * 1000,
  });

  const myServicesQuery = useQuery({
    queryKey: ["services", "my", user?.id],
    queryFn: () => fetchMyServices(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: {
      title: string;
      description?: string;
      category: string;
      price: number;
      image_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      let provider: {
        full_name: string | null;
        phone: string | null;
        city: string | null;
        sub_city: string | null;
        avatar_url: string | null;
      } | null = null;

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, city, sub_city, avatar_url, provider_status")
        .eq("user_id", user.id)
        .single();
      if (p) provider = p as typeof provider;

      const storedPhone = normalizeLibyaPhoneForStorage(provider?.phone);
      const providerStatus = ((provider as { provider_status?: string })?.provider_status || "").toLowerCase();
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

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services", "my", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["services", "all"] });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Service> }) => {
      const { data, error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services", "my", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["services", "all"] });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          is_visible: false,
          is_paused: true,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services", "my", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["services", "all"] });
    },
  });

  const createService = async (serviceData: {
    title: string;
    description?: string;
    category: string;
    price: number;
    image_url?: string;
  }) => {
    try {
      const data = await createServiceMutation.mutateAsync(serviceData);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      const data = await updateServiceMutation.mutateAsync({ id, updates });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const deleteService = async (id: string) => {
    try {
      await deleteServiceMutation.mutateAsync(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return {
    services: allServicesQuery.data ?? [],
    myServices: myServicesQuery.data ?? [],
    loading: allServicesQuery.isLoading,
    isLoading: myServicesQuery.isLoading,
    createService,
    updateService,
    deleteService,
    refreshServices: () => queryClient.invalidateQueries({ queryKey: ["services", "all"] }),
    refreshMyServices: () => queryClient.invalidateQueries({ queryKey: ["services", "my", user?.id] }),
  };
}
