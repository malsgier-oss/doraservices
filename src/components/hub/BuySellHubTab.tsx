import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/hub/AnimatedSection";
import { HubSection } from "@/components/hub/HubSection";
import { BuySellCategories } from "@/components/hub/BuySellCategories";
import { ListingCard } from "@/components/hub/ListingCard";
import { DealCardHub } from "@/components/hub/DealCardHub";
import { HeroSection } from "@/components/hub/HeroSection";
import { SectionDivider } from "@/components/hub/SectionDivider";
import { HUB_CARD_BASE, HUB_CARD_ROW_4, HUB_CARD_SLOT_4 } from "@/components/hub/hubStyles";
import { BUY_SELL_CATEGORIES, type BuySellCategory } from "@/components/hub/buySellCategories";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useListings, type Listing } from "@/hooks/useListings";
import { Award, Clock, Shield, ShoppingBag, Search } from "lucide-react";

/** Max cards visible per category before horizontal scroll. */
const CARDS_VISIBLE = 4;

function BuySellCategorySection({
  cat,
  cityId,
  onListingClick,
  onDealClick,
  navigate,
  delay = 0,
}: {
  cat: BuySellCategory;
  cityId?: string | null;
  onListingClick: (listing: Listing) => void;
  onDealClick: (deal: Deal) => void;
  navigate: (path: string) => void;
  delay?: number;
}) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const title = language === "ar" ? cat.nameAr : cat.name;
  const Icon = cat.icon;

  const { data: listings, isLoading: listingsLoading, isError: listingsError, refetch: refetchListings } = useListings({
    cityId,
    category: cat.id,
    limit: 6,
  });
  const { data: deals, isLoading: dealsLoading, isError: dealsError, refetch: refetchDeals } = useDeals({
    cityId,
    category: cat.id,
    limit: 4,
  });

  const isLoading = listingsLoading || dealsLoading;
  const isError = listingsError || dealsError;
  const refetch = () => {
    refetchListings();
    refetchDeals();
  };
  const items = [
    ...(listings || []).map((l) => ({ type: "listing" as const, id: l.id, listing: l })),
    ...(deals || []).map((d) => ({ type: "deal" as const, id: d.id, deal: d })),
  ];
  const hasItems = items.length > 0;

  return (
    <AnimatedSection direction="up" delay={delay}>
      <HubSection
        id={`buy-sell-cat-${cat.id}`}
        title={title}
        icon={Icon}
        actionLabel={t("المزيد", "More")}
        onAction={() => navigate(`/buy-sell/category/${cat.id}`)}
      >
        {isLoading ? (
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={HUB_CARD_ROW_4}
            style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
          >
            {Array.from({ length: CARDS_VISIBLE }).map((_, i) => (
              <div key={`skeleton-${i}`} className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card overflow-hidden animate-pulse`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-2.5 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
            <p className="text-sm text-muted-foreground">{t("حدث خطأ", "Something went wrong")}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              {t("إعادة المحاولة", "Retry")}
            </Button>
          </div>
        ) : !hasItems ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
            <ShoppingBag className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {t("لا توجد إعلانات في هذا التصنيف", "No listings in this category")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/listings")}>
                {t("استكشف الكل", "Browse all")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/create-listing")}>
                {t("نشر إعلان", "Post listing")}
              </Button>
            </div>
          </div>
        ) : (
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={HUB_CARD_ROW_4}
            style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
          >
            {items.map((item) => (
              <div key={item.id} className={HUB_CARD_SLOT_4}>
                {item.type === "listing" ? (
                  <ListingCard
                    listing={item.listing}
                    isRTL={isRTL}
                    onClick={() => onListingClick(item.listing)}
                  />
                ) : (
                  <DealCardHub
                    deal={item.deal}
                    isRTL={isRTL}
                    onClick={() => onDealClick(item.deal)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </HubSection>
    </AnimatedSection>
  );
}

function BuySellSearchResultsSection({
  searchQuery,
  cityId,
  onListingClick,
  onDealClick,
  navigate,
}: {
  searchQuery: string;
  cityId?: string | null;
  onListingClick: (listing: Listing) => void;
  onDealClick: (deal: Deal) => void;
  navigate: (path: string) => void;
}) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const q = searchQuery.trim();
  const enabled = q.length > 0;

  const { data: listings = [], isLoading: listingsLoading, isError: listingsError, refetch: refetchListings } = useListings({
    cityId,
    search: q || null,
    limit: 12,
    enabled,
  });
  const { data: deals = [], isLoading: dealsLoading, isError: dealsError, refetch: refetchDeals } = useDeals({
    search: q || null,
    limit: 12,
  });

  const isLoading = enabled && (listingsLoading || dealsLoading);
  const isError = enabled && (listingsError || dealsError);
  const refetch = () => {
    refetchListings();
    refetchDeals();
  };
  const items = [
    ...listings.map((l) => ({ type: "listing" as const, id: l.id, listing: l })),
    ...deals.map((d) => ({ type: "deal" as const, id: d.id, deal: d })),
  ];
  const hasItems = items.length > 0;

  if (!enabled) return null;

  return (
    <AnimatedSection direction="up" delay={100}>
      <HubSection
        id="buy-sell-search-results"
        title={t("نتائج البحث", "Search results")}
        icon={Search}
        actionLabel={t("عرض الكل", "View all")}
        onAction={() => navigate(`/buy-sell/listings?q=${encodeURIComponent(q)}`)}
      >
        {isError ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
            <p className="text-sm text-muted-foreground">{t("حدث خطأ", "Something went wrong")}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              {t("إعادة المحاولة", "Retry")}
            </Button>
          </div>
        ) : isLoading ? (
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={HUB_CARD_ROW_4}
            style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
          >
            {Array.from({ length: CARDS_VISIBLE }).map((_, i) => (
              <div key={`search-skeleton-${i}`} className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card overflow-hidden animate-pulse`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-2.5 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasItems ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
            <Search className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {t("لا توجد نتائج لهذا البحث", "No results for this search")}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/listings")}>
              {t("استكشف جميع الإعلانات", "Browse all listings")}
            </Button>
          </div>
        ) : (
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={HUB_CARD_ROW_4}
            style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
          >
            {items.map((item) => (
              <div key={item.id} className={HUB_CARD_SLOT_4}>
                {item.type === "listing" ? (
                  <ListingCard
                    listing={item.listing}
                    isRTL={isRTL}
                    onClick={() => onListingClick(item.listing)}
                  />
                ) : (
                  <DealCardHub
                    deal={item.deal}
                    isRTL={isRTL}
                    onClick={() => onDealClick(item.deal)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </HubSection>
    </AnimatedSection>
  );
}

type BuySellMode = "all" | "listings" | "business";

interface BuySellHubTabProps {
  cityId?: string | null;
  buySellMode: BuySellMode;
  onBuySellModeChange: (mode: BuySellMode) => void;
  selectedBuySellCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  buySellSearchQuery: string;
  onSearchChange?: (query: string) => void;
  openListingDetail: (listing: Listing) => void;
  openDealDetail: (deal: Deal) => void;
  navigate: (path: string) => void;
}

export function BuySellHubTab({
  cityId,
  buySellMode,
  selectedBuySellCategory,
  onCategoryChange,
  buySellSearchQuery,
  openListingDetail,
  openDealDetail,
  navigate,
}: BuySellHubTabProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const hasSearch = (buySellSearchQuery ?? "").trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Sticky Category Bar (Strategy A: filter on Hub, no navigate on chip click) */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 -mx-4 px-4 py-3 border-b border-border/40 space-y-2">
        <BuySellCategories
          onCategoryClick={(catId) => {
            const nextCategory = selectedBuySellCategory === catId ? null : catId;
            onCategoryChange(nextCategory);
          }}
          compact
          sticky={false}
          filterOnly
          selectedCategoryId={selectedBuySellCategory}
        />
        {selectedBuySellCategory && !hasSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground text-xs"
            onClick={() => onCategoryChange(null)}
          >
            {t("إزالة التصنيف", "Clear category filter")}
          </Button>
        )}
      </div>

      <div className="px-4 space-y-6">
        {/* Hero Section */}
        <AnimatedSection direction="up" delay={100}>
          <HeroSection
            onBrowseClick={() => navigate("/buy-sell/listings")}
            onCreateClick={() => navigate("/buy-sell/create-listing")}
          />
        </AnimatedSection>

        <SectionDivider variant="light" />

        {/* Search results (Option A: single section when query is non-empty) */}
        {hasSearch && (
          <>
            <BuySellSearchResultsSection
              searchQuery={buySellSearchQuery}
              cityId={cityId}
              onListingClick={openListingDetail}
              onDealClick={openDealDetail}
              navigate={navigate}
            />
            <SectionDivider variant="light" />
          </>
        )}

        {/* One section per category, or single section when a category is selected (Strategy A) */}
        {!hasSearch && (buySellMode === "listings" || buySellMode === "all") &&
          (selectedBuySellCategory
            ? (() => {
                const cat = BUY_SELL_CATEGORIES.find((c) => c.id === selectedBuySellCategory);
                return cat ? (
                  <BuySellCategorySection
                    key={cat.id}
                    cat={cat}
                    cityId={cityId}
                    onListingClick={openListingDetail}
                    onDealClick={openDealDetail}
                    navigate={navigate}
                    delay={200}
                  />
                ) : null;
              })()
            : BUY_SELL_CATEGORIES.map((cat, index) => (
                <BuySellCategorySection
                  key={cat.id}
                  cat={cat}
                  cityId={cityId}
                  onListingClick={openListingDetail}
                  onDealClick={openDealDetail}
                  navigate={navigate}
                  delay={200 + index * 50}
                />
              )))}

        <SectionDivider variant="light" />

        {/* Browse All CTA */}
        <div className="bg-muted/30 rounded-xl p-4 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t("لم تجد ما تبحث عنه؟", "Can't find what you're looking for?")}
          </p>
          <Button className="w-full" onClick={() => navigate("/buy-sell/listings")}>
            {t("استكشف جميع الإعلانات", "Browse All Listings")}
          </Button>
        </div>

        <SectionDivider variant="light" />

        <div className="pt-8 pb-4 border-t border-border/30">
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>{t("خدمات موثوقة", "Trusted Services")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                <span>{t("جودة مضمونة", "Quality Guaranteed")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>{t("دعم 24/7", "24/7 Support")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
