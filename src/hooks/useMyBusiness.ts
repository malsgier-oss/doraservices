import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MyBusiness = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  authorization_status: string;
  operational_status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export function useMyBusiness() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: async (): Promise<MyBusiness | null> => {
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
        console.error("Error fetching my business:", error);
        return null;
      }
      return (data as any) as MyBusiness;
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });
}

