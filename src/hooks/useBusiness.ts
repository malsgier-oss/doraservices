import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Business {
  id: string;
  user_id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useBusiness() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching business:", error);
      } else {
        setBusiness(data);
      }
      setLoading(false);
    };

    fetchBusiness();
  }, [user]);

  const createBusiness = async (businessData: Omit<Business, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("businesses")
      .insert({
        ...businessData,
        user_id: user.id,
      })
      .select()
      .single();

    if (!error && data) {
      setBusiness(data);
    }

    return { data, error };
  };

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!user || !business) return { error: new Error("No business to update") };

    const { data, error } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", business.id)
      .select()
      .single();

    if (!error && data) {
      setBusiness(data);
    }

    return { data, error };
  };

  return { business, loading, createBusiness, updateBusiness };
}
