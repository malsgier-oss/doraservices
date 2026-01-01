import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CallLogInsert {
  service_id: string;
  provider_id: string;
}

export function useCallLogs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logCall = useMutation({
    mutationFn: async ({ service_id, provider_id }: CallLogInsert) => {
      if (!user) throw new Error("Must be logged in to log calls");

      const { data, error } = await supabase
        .from("call_logs")
        .insert({
          service_id,
          provider_id,
          caller_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-stats"] });
    },
  });

  return { logCall };
}

export function useProviderCallLogs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["call-logs", "provider", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("call_logs")
        .select(`
          id,
          service_id,
          caller_id,
          created_at,
          services(title, category)
        `)
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
