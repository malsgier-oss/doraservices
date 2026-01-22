import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
};

export function usePublicProfileByUserId(userId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,full_name,avatar_url,phone")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching public profile:", error);
        return null;
      }

      return (data as any) as PublicProfile;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

