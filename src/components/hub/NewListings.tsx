import { Sparkles } from "lucide-react";
import { DealCard } from "./DealCard";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";

interface NewListingsProps {
  cityId?: string | null;
  limit?: number;
  onDealClick?: (deal: Deal) => void;
}

export function NewListings({ cityId, limit = 8, onDealClick }: NewListingsProps) {
  const { data: deals, isLoading } = useDeals({ cityId, limit: limit * 2 });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Filter and sort by created_at (newest first)
  const newDeals = deals
    ? [...deals]
        .filter((deal) => {
          const createdDate = new Date(deal.created_at);
          const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCreated <= 7; // Show deals from last 7 days
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
    : [];

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`new-listing-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}>
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

  if (!newDeals || newDeals.length === 0) {
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
        {t("لا توجد عروض جديدة", "No new listings")}
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
    >
      {newDeals.map((deal) => (
        <div key={deal.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center relative">
          <div className="absolute -top-2 -right-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {t("جديد", "NEW")}
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
