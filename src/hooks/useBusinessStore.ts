import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessStore } from "@/types/store";

export function useBusinessStore(businessId: string | null) {
  return useQuery({
    queryKey: ["business-store", businessId],
    queryFn: async (): Promise<BusinessStore | null> => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .is("archived_at", null)
        .single();

      if (error) {
        console.error("Error fetching business store:", error);
        return null;
      }

      return data as BusinessStore;
    },
    enabled: !!businessId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMyBusinessStore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-business-store", user?.id],
    queryFn: async (): Promise<BusinessStore | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching my business store:", error);
        return null;
      }

      return (data as any) as BusinessStore | null;
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useBusinessStoreMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateStore = useMutation({
    mutationFn: async ({ businessId, data }: { businessId: string; data: Partial<BusinessStore> }) => {
      const { data: store, error } = await supabase
        .from("businesses")
        .update(data)
        .eq("id", businessId)
        .select()
        .single();

      if (error) throw error;
      return store as BusinessStore;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["business-store", variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-business-store", user?.id] });
    },
  });

  const pauseStore = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from("businesses")
        .update({ operational_status: 'paused' })
        .eq("id", businessId);

      if (error) throw error;
    },
    onSuccess: (_, businessId) => {
      queryClient.invalidateQueries({ queryKey: ["business-store", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-business-store", user?.id] });
    },
  });

  const resumeStore = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from("businesses")
        .update({ operational_status: 'active' })
        .eq("id", businessId);

      if (error) throw error;
    },
    onSuccess: (_, businessId) => {
      queryClient.invalidateQueries({ queryKey: ["business-store", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-business-store", user?.id] });
    },
  });

  return {
    updateStore: updateStore.mutateAsync,
    pauseStore: pauseStore.mutateAsync,
    resumeStore: resumeStore.mutateAsync,
  };
}
