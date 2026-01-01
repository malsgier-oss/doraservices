import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  user_registration_enabled?: boolean;
  maintenance_mode?: boolean;
  [key: string]: unknown;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value");

      if (error) throw error;

      // Convert array to object
      const settings: PlatformSettings = {};
      data.forEach(item => {
        // Parse the JSONB value
        const value = item.value;
        if (typeof value === 'object' && value !== null && 'enabled' in value) {
          settings[item.key] = (value as { enabled: boolean }).enabled;
        } else {
          settings[item.key] = value;
        }
      });

      return settings;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useRegistrationEnabled() {
  const { data: settings, isLoading } = usePlatformSettings();
  
  // Default to true if setting doesn't exist or is loading
  const isEnabled = settings?.user_registration_enabled !== false;
  
  return { isEnabled, isLoading };
}
