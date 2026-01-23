import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/hub/AnimatedSection";
import { HubSection } from "@/components/hub/HubSection";
import { BuySellCategories } from "@/components/hub/BuySellCategories";
import { ListingCardGroup } from "@/components/hub/ListingCardGroup";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { getBuySellCategoryLabel } from "@/components/hub/buySellCategories";
import { useListings, type Listing } from "@/hooks/useListings";
import { Award, Clock, LayoutGrid, Shield, ShoppingBag, Tag, X } from "lucide-react";

function BuySellListingsSection({
  cityId,
  category,
  search,
  onListingClick,
  onEmptyAction,
}: {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onListingClick: (listing: Listing) => void;
  onEmptyAction?: () => void;
}) {
  const { data: listings, isLoading } = useListings({ cityId, category, search, limit: 12 });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y", scrollSnapType: "x mandatory" }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={`listing-loading-${i}`}
            className={`${HUB_CARD_BASE} bg-card shrink-0 w-[90vw] max-w-[700px] snap-start overflow-hidden`}
          >
            <div className="grid grid-cols-2 gap-3 p-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={`listing-loading-${i}-${j}`} className="rounded-xl overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-2.5">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    const msg = category ? t("لا توجد إعلانات في هذا التصنيف", "No listings in this category") : t("لا توجد إعلانات حالياً", "No listings right now");
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
        <ShoppingBag className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{msg}</p>
        {onEmptyAction ? (
          <Button variant="outline" size="sm" onClick={onEmptyAction}>
            {t("نشر إعلانك الأول", "Post your first listing")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4"
      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y", scrollSnapType: "x mandatory" }}
    >
      {chunkArray(listings.slice(0, 8), 4).map((chunk, chunkIndex) => (
        <ListingCardGroup key={`chunk-${chunkIndex}`} listings={chunk} isRTL={isRTL} onOpen={onListingClick} />
      ))}
    </div>
  );
}

const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

interface BuySellHubTabProps {
  cityId?: string | null;
  selectedBuySellCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  buySellSearchQuery: string;
  openListingList: (params?: { category?: string | null; search?: string | null }) => void;
  openListingDetail: (listing: Listing) => void;
  navigate: (path: string) => void;
}

export function BuySellHubTab({
  cityId,
  selectedBuySellCategory,
  onCategoryChange,
  buySellSearchQuery,
  openListingList,
  openListingDetail,
  navigate,
}: BuySellHubTabProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const selectedCategoryLabel = getBuySellCategoryLabel(selectedBuySellCategory, language);

  const buildQueryString = (category: string | null, search: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const trimmed = search.trim();
    if (!trimmed) return qs;
    return qs ? `${qs}&q=${encodeURIComponent(trimmed)}` : `?q=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="px-4 space-y-6">
      {/* Categories Grid */}
      <HubSection title={t("التصنيفات", "Categories")} icon={LayoutGrid}>
        <BuySellCategories
          onCategoryClick={(catId) => {
            const nextCategory = selectedBuySellCategory === catId ? null : catId;
            onCategoryChange(nextCategory);
          }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => openListingList({ category: selectedBuySellCategory, search: buySellSearchQuery })}>
            {t("عرض النتائج", "View results")}
          </Button>
          {selectedBuySellCategory && (
            <Button variant="outline" size="sm" onClick={() => onCategoryChange(null)} className="text-xs">
              {t("إلغاء التصفية", "Clear filter")}: {selectedCategoryLabel}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </HubSection>

      {/* Listings */}
      <AnimatedSection direction="up" delay={200}>
        <HubSection
          id="listings"
          title={t("إعلانات للبيع", "Listings")}
          icon={Tag}
          actionLabel={t("عرض الكل", "View All")}
          onAction={() => {
            const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
            navigate(`/buy-sell/listings${q}`);
          }}
        >
          <BuySellListingsSection
            cityId={cityId}
            category={selectedBuySellCategory}
            search={buySellSearchQuery}
            onListingClick={(listing) => openListingDetail(listing)}
            onEmptyAction={() => navigate("/buy-sell/create-listing")}
          />
        </HubSection>
      </AnimatedSection>

      {/* Footer */}
      <div className="pt-8 pb-4 border-t border-border/30">
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>{t("تواصل مباشر", "Direct contact")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              <span>{t("سهل وسريع", "Fast & simple")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>{t("محدث باستمرار", "Always updated")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
