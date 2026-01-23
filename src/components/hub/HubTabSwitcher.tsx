import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { useBuySellStats } from "@/hooks/useBuySellStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface HubTabSwitcherProps {
  activeTab: "services" | "buy-sell";
  onTabChange: (tab: "services" | "buy-sell") => void;
  className?: string;
}

export function HubTabSwitcher({
  activeTab,
  onTabChange,
  className,
}: HubTabSwitcherProps) {
  const { isEnabled, isLoading } = useBuySellEnabled();
  const { data: stats } = useBuySellStats();
  const { isRTL, t } = useLanguage();

  // Don't show tabs if buy/sell is not enabled
  if (isLoading || !isEnabled) {
    return null;
  }

  const totalCount = stats?.activeListings || 0;

  return (
    <div
      className={cn(
        "sticky top-[calc(env(safe-area-inset-top)+88px)] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/60",
        className
      )}
    >
      <div className="px-4 py-3">
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as "services" | "buy-sell")}>
          <TabsList className="w-full grid grid-cols-2 h-12">
            <TabsTrigger
              value="services"
              className="text-sm font-medium"
            >
              {isRTL ? "الخدمات" : "SERVICES"}
            </TabsTrigger>
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
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
