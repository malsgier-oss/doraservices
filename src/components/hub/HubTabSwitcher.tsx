import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { useServicesEnabled } from "@/hooks/useServicesEnabled";
import { useBuySellStats } from "@/hooks/useBuySellStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface HubTabSwitcherProps {
  activeTab: "services" | "buy-sell";
  onTabChange: (tab: "services" | "buy-sell") => void;
  className?: string;
  /** Measured height of the fixed header; used for sticky top offset. Falls back to 88px if not provided. */
  headerHeight?: number;
}

const FALLBACK_HEADER_OFFSET_PX = 88;

export function HubTabSwitcher({
  activeTab,
  onTabChange,
  className,
  headerHeight = FALLBACK_HEADER_OFFSET_PX,
}: HubTabSwitcherProps) {
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();
  const { isEnabled: servicesEnabled, isLoading: servicesLoading } = useServicesEnabled();
  const { data: stats } = useBuySellStats();
  const { isRTL, t } = useLanguage();

  // Show tab bar only when both tabs are enabled (otherwise Hub shows single-tab content without switcher)
  const isLoading = buySellLoading || servicesLoading;
  const bothEnabled = buySellEnabled && servicesEnabled;
  if (isLoading || !bothEnabled) {
    return null;
  }

  const dealsCount = stats?.activeDeals || 0;
  const totalCount = dealsCount;
  const stickyTop = `calc(env(safe-area-inset-top, 0px) + ${headerHeight}px)`;

  return (
    <div
      className={cn(
        "sticky z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60",
        className
      )}
      style={{ top: stickyTop }}
    >
      <div className="px-4 py-3">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "services" | "buy-sell")}>
          <TabsList className="w-full grid grid-cols-2 h-12">
            <TabsTrigger
              value="buy-sell"
              className="text-sm font-medium"
            >
              {isRTL ? "شراء وبيع" : "BUY & SELL"}
              {totalCount > 0 && (
                <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="text-sm font-medium"
            >
              {isRTL ? "الخدمات" : "SERVICES"}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
