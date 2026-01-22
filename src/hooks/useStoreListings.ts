import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StoreListing } from "@/types/store";

export function useStoreListings(businessId: string | null) {
  return useQuery({
    queryKey: ["store-listings", businessId],
    queryFn: async (): Promise<StoreListing[]> => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("store_listings")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching store listings:", error);
        return [];
      }
      return (data as any) as StoreListing[];
    },
    enabled: !!businessId,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMyStoreListings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-store-listings", user?.id],
    queryFn: async (): Promise<StoreListing[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("store_listings")
        .select("*")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching my store listings:", error);
        return [];
      }
      return (data as any) as StoreListing[];
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useStoreListingMutations(businessId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createListing = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string | null;
      category: string;
      price?: number | null;
      currency?: string;
      image_urls?: string[];
      status?: 'draft' | 'active' | 'paused';
    }) => {
      if (!user || !businessId) throw new Error("User or business ID missing");
      
      const { data: listing, error } = await supabase
        .from("store_listings")
        .insert({
          business_id: businessId,
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          category: data.category,
          price: data.price || null,
          currency: data.currency || 'LYD',
          image_urls: data.image_urls || [],
          status: data.status || 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return listing as StoreListing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-listings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-store-listings", user?.id] });
    },
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StoreListing> }) => {
      const { data: listing, error } = await supabase
        .from("store_listings")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return listing as StoreListing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-listings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-store-listings", user?.id] });
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_listings")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-listings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-store-listings", user?.id] });
    },
  });

  const setListingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'active' | 'paused' | 'archived' }) => {
      const { error } = await supabase
        .from("store_listings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-listings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-store-listings", user?.id] });
    },
  });

  return {
    createListing: createListing.mutateAsync,
    updateListing: updateListing.mutateAsync,
    deleteListing: deleteListing.mutateAsync,
    setListingStatus: setListingStatus.mutateAsync,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ["store-listings", businessId] });
      queryClient.invalidateQueries({ queryKey: ["my-store-listings", user?.id] });
    },
  };
}
