import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Business {
  id: string;
  user_id?: string;
  name: string;
  category: string | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  rating?: number;
  rating_count?: number;
  operational_status: string;
  authorization_status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export function useBusiness(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["business", businessId],
    queryFn: async (): Promise<Business | null> => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("operational_status", "active")
        .eq("authorization_status", "approved")
        .is("archived_at", null)
        .single();

      if (error) {
        console.error("Error fetching business:", error);
        return null;
      }

      return (data as Business) || null;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
