import { useHubStats } from "@/hooks/useHubStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Store, Tag, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function StatsBar() {
  const { data: stats, isLoading } = useHubStats();
  const { isRTL } = useLanguage();

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 px-4",
          isRTL ? "rtl" : "ltr"
        )}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-[140px] shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      icon: Users,
      label: isRTL ? "مزودين" : "Providers",
      value: stats.totalServices.toLocaleString(),
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Store,
      label: isRTL ? "متاجر" : "Businesses",
      value: stats.totalBusinesses.toLocaleString(),
      color: "text-green-600 dark:text-green-400",
    },
    {
      icon: Tag,
      label: isRTL ? "عروض" : "Deals",
      value: stats.activeDeals.toLocaleString(),
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      icon: MapPin,
      label: isRTL ? "مدن" : "Cities",
      value: stats.totalCities.toLocaleString(),
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-2 px-4 hide-scrollbar",
        isRTL ? "rtl" : "ltr"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="shrink-0 w-[140px] rounded-xl bg-card border border-border/60 p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", item.color)} />
              <span className="text-xs text-muted-foreground line-clamp-1">
                {item.label}
              </span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
