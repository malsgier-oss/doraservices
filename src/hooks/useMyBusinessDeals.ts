import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/hooks/useDeals";

export function useMyBusinessDeals(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["deals", "my-business", businessId],
    queryFn: async (): Promise<Deal[]> => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching my business deals:", error);
        return [];
      }
      return (data || []) as Deal[];
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyBusinessDealMutations(businessId: string | null) {
  const queryClient = useQueryClient();

  const createDeal = async (payload: {
    title: string;
    description: string | null;
    discount: string;
    category: string;
    discount_type: "percentage" | "fixed" | "free_item";
    start_date: string;
    expires_at: string | null;
    promo_code: string | null;
    terms_conditions: string | null;
    user_id: string;
  }) => {
    if (!businessId) throw new Error("No business");
    const { error } = await supabase.from("deals").insert({
      business_id: businessId,
      user_id: payload.user_id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      discount: payload.discount.trim(),
      category: payload.category,
      discount_type: payload.discount_type,
      start_date: payload.start_date,
      expires_at: payload.expires_at || null,
      promo_code: payload.promo_code?.trim() || null,
      terms_conditions: payload.terms_conditions?.trim() || null,
      status: "draft",
    });
    if (error) throw error;
  };

  const updateDeal = async (
    dealId: string,
    payload: {
      title?: string;
      description?: string | null;
      discount?: string;
      category?: string;
      discount_type?: "percentage" | "fixed" | "free_item";
      start_date?: string;
      expires_at?: string | null;
      promo_code?: string | null;
      terms_conditions?: string | null;
    },
  ) => {
    const updates: Record<string, unknown> = {};
    if (payload.title !== undefined) updates.title = payload.title.trim();
    if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
    if (payload.discount !== undefined) updates.discount = payload.discount.trim();
    if (payload.category !== undefined) updates.category = payload.category;
    if (payload.discount_type !== undefined) updates.discount_type = payload.discount_type;
    if (payload.start_date !== undefined) updates.start_date = payload.start_date;
    if (payload.expires_at !== undefined) updates.expires_at = payload.expires_at || null;
    if (payload.promo_code !== undefined) updates.promo_code = payload.promo_code?.trim() || null;
    if (payload.terms_conditions !== undefined) updates.terms_conditions = payload.terms_conditions?.trim() || null;
    const { error } = await supabase.from("deals").update(updates).eq("id", dealId);
    if (error) throw error;
  };

  const setDealStatus = async (dealId: string, status: "active" | "inactive" | "archived") => {
    const updates: Record<string, unknown> = { status };
    if (status === "archived") updates.archived_at = new Date().toISOString();
    else updates.archived_at = null;
    const { error } = await supabase.from("deals").update(updates).eq("id", dealId);
    if (error) throw error;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deals", "my-business", businessId] });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
  };

  return { createDeal, updateDeal, setDealStatus, invalidate };
}
