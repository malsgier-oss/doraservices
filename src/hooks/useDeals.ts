import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Deal {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  discount: string;
  category: string | null;
  discount_type: string | null;
  start_date: string | null;
  expires_at: string | null;
  promo_code: string | null;
  terms_conditions: string | null;
  status: string | null;
  image_url: string | null;
  views_count: number | null;
  clicks_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface DealFormData {
  title: string;
  description?: string;
  discount: string;
  category?: string;
  discount_type?: string;
  start_date?: string;
  expires_at?: string;
  promo_code?: string;
  terms_conditions?: string;
  status?: string;
  image_url?: string;
  business_id: string;
}

export function useDeals(businessId?: string) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    let query = supabase.from("deals").select("*");
    
    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching deals:", error);
    } else {
      setDeals(data || []);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const createDeal = async (dealData: DealFormData) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("deals")
      .insert({
        ...dealData,
        user_id: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setDeals((prev) => [data, ...prev]);
    }

    return { data, error };
  };

  const updateDeal = async (dealId: string, dealData: Partial<DealFormData>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("deals")
      .update(dealData)
      .eq("id", dealId)
      .select()
      .single();

    if (!error && data) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? data : d)));
    }

    return { data, error };
  };

  const deleteDeal = async (dealId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId);

    if (!error) {
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
    }

    return { error };
  };

  // Get stats
  const stats = {
    active: deals.filter((d) => d.status === "active").length,
    expired: deals.filter((d) => d.status === "expired").length,
    scheduled: deals.filter((d) => d.status === "scheduled").length,
    draft: deals.filter((d) => d.status === "draft").length,
    paused: deals.filter((d) => d.status === "paused").length,
    totalViews: deals.reduce((acc, d) => acc + (d.views_count || 0), 0),
    totalClicks: deals.reduce((acc, d) => acc + (d.clicks_count || 0), 0),
  };

  return { deals, loading, stats, createDeal, updateDeal, deleteDeal, refetch: fetchDeals };
}
