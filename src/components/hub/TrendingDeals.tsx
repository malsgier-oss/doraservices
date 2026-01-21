import { Tag } from "lucide-react";
import { DealCard } from "./DealCard";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendingDealsProps {
  cityId?: string | null;
  limit?: number;
  onDealClick?: (deal: Deal) => void;
}

export function TrendingDeals({ cityId, limit = 8, onDealClick }: TrendingDealsProps) {
  const { data: deals, isLoading } = useDeals({ cityId, limit });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Sort by views_count + clicks_count for trending
  const trendingDeals = deals
    ? [...deals].sort((a, b) => {
        const aScore = (a.views_count || 0) + (a.clicks_count || 0);
        const bScore = (b.views_count || 0) + (b.clicks_count || 0);
        return bScore - aScore;
      }).slice(0, limit)
    : [];

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`trending-deal-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}>
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!trendingDeals || trendingDeals.length === 0) {
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
        {t("لا توجد عروض ترند حالياً", "No trending deals at the moment")}
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
    >
      {trendingDeals.map((deal) => (
        <div key={deal.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center relative">
          <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {t("ترند", "TRENDING")}
          </div>
          <DealCard
            deal={deal}
            onClick={() => onDealClick?.(deal)}
            isRTL={isRTL}
          />
        </div>
      ))}
    </div>
  );
}
