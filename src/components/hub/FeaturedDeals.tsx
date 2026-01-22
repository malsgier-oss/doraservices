import { useDeals } from "@/hooks/useDeals";
import { DealCard } from "./DealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { HUB_CARD_BASE } from "./hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeaturedDealsProps {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  limit?: number;
  onDealClick?: (deal: any) => void;
}

export function FeaturedDeals({ cityId, category, search, limit = 6, onDealClick }: FeaturedDealsProps) {
  const { data: deals, isLoading } = useDeals({ cityId, category, featured: true, limit });
  const { isRTL } = useLanguage();

  const q = (search || "").trim().toLowerCase();
  const filtered = q
    ? (deals || []).filter((d) => `${d.title} ${(d.description || "")}`.toLowerCase().includes(q))
    : (deals || []);

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`deal-placeholder-${i}`}
            className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}
          >
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

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
    >
      {filtered.slice(0, limit).map((deal) => (
        <div key={deal.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
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
