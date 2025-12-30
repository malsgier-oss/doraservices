import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Deal {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  discount: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeals(businessId?: string) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
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
    };

    fetchDeals();
  }, [businessId]);

  const createDeal = async (dealData: { 
    title: string; 
    description?: string; 
    discount: string; 
    expires_at?: string;
    business_id: string;
  }) => {
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

  return { deals, loading, createDeal, deleteDeal };
}
