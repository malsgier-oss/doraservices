import { usePlatformSettings as useAdminPlatformSettings } from "./useAdmin";

/**
 * Hook to check if the Services tab is enabled on the Hub.
 * Uses the same platform_settings as AdminSettings.
 * @returns { isEnabled: boolean, isLoading: boolean }
 */
export function useServicesEnabled() {
  const { data: settings, isLoading } = useAdminPlatformSettings();

  // Default to true if setting doesn't exist or is loading (show services by default)
  const isEnabled = settings?.services_enabled !== "false";

  return { isEnabled, isLoading };
}
