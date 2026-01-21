import { usePlatformSettings as useAdminPlatformSettings } from "./useAdmin";

/**
 * Hook to check if buy/sell marketplace features are enabled
 * Uses the same hook as AdminSettings for consistency
 * @returns { isEnabled: boolean, isLoading: boolean }
 */
export function useBuySellEnabled() {
  const { data: settings, isLoading } = useAdminPlatformSettings();
  
  // Settings are stored as strings ("true"/"false") in the admin hook
  // Default to false if setting doesn't exist or is loading
  const isEnabled = settings?.buy_sell_enabled === "true";
  
  return { isEnabled, isLoading };
}
