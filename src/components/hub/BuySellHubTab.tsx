import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/hub/AnimatedSection";
import { HubSection } from "@/components/hub/HubSection";
import { BuySellCategories } from "@/components/hub/BuySellCategories";
import { FeaturedDeals } from "@/components/hub/FeaturedDeals";
import { DealCard } from "@/components/hub/DealCard";
import { BusinessCard } from "@/components/hub/BusinessCard";
import { TrendingDeals } from "@/components/hub/TrendingDeals";
import { NewListings } from "@/components/hub/NewListings";
import { BusinessDirectory } from "@/components/hub/BusinessDirectory";
import { ListingCardGroup } from "@/components/hub/ListingCardGroup";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { getBuySellCategoryLabel } from "@/components/hub/buySellCategories";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import { useListings, type Listing } from "@/hooks/useListings";
import { Award, Clock, LayoutGrid, Shield, ShoppingBag, Sparkles, Store, Tag, TrendingUp, X } from "lucide-react";

function BuySellDealsSection({
  cityId,
  category,
  search,
  onDealClick,
}: {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onDealClick: (deal: Deal) => void;
}) {
  const { data: deals, isLoading } = useDeals({ cityId, category, limit: 12 });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const q = (search || "").trim().toLowerCase();
  const filteredDeals = q
    ? (deals || []).filter((d) => `${d.title} ${(d.description || "")}`.toLowerCase().includes(q))
    : (deals || []);

  if (isLoading) {
    return (
      <HubSection title={t("العروض النشطة", "Active Deals")} icon={Tag}>
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`deal-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}>
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          ))}
        </div>
      </HubSection>
    );
  }

  if (filteredDeals.length === 0) {
    const msg = category
      ? (isRTL ? "لا توجد عروض في هذا التصنيف" : "No deals in this category")
      : (isRTL ? "لا توجد عروض متاحة حالياً" : "No active deals available");
    return (
      <HubSection title={t("العروض النشطة", "Active Deals")} icon={Tag}>
        <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
          <Tag className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
      </HubSection>
    );
  }

  return (
    <HubSection title={t("العروض النشطة", "Active Deals")} icon={Tag}>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {filteredDeals.map((deal) => (
          <div key={deal.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
            <DealCard
              deal={deal}
              onClick={() => onDealClick(deal)}
              isRTL={isRTL}
            />
          </div>
        ))}
      </div>
    </HubSection>
  );
}

function BuySellBusinessesSection({
  cityId,
  category,
  search,
  onBusinessClick,
}: {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onBusinessClick: (business: Business) => void;
}) {
  const { data: businesses, isLoading } = useBusinesses({ cityId, category, featured: true, limit: 8 });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const q = (search || "").trim().toLowerCase();
  const filteredBusinesses = q
    ? (businesses || []).filter((b) => {
        const hay = `${b.name} ${b.description || ""} ${b.location || ""}`.toLowerCase();
        return hay.includes(q);
      })
    : (businesses || []);

  if (isLoading) {
    return (
      <HubSection title={t("المتاجر المميزة", "Featured Businesses")} icon={Store}>
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`business-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}>
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </HubSection>
    );
  }

  if (filteredBusinesses.length === 0) {
    const msg = category
      ? (isRTL ? "لا توجد متاجر في هذا التصنيف" : "No businesses in this category")
      : (isRTL ? "لا توجد متاجر مميزة حالياً" : "No featured businesses yet");
    return (
      <HubSection title={t("المتاجر المميزة", "Featured Businesses")} icon={Store}>
        <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
          <Store className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{msg}</p>
        </div>
      </HubSection>
    );
  }

  return (
    <HubSection title={t("المتاجر المميزة", "Featured Businesses")} icon={Store}>
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {filteredBusinesses.map((business) => (
          <div key={business.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
            <BusinessCard
              business={business}
              onClick={() => onBusinessClick(business)}
              isRTL={isRTL}
            />
          </div>
        ))}
      </div>
    </HubSection>
  );
}

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
          <div key={`listing-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[90vw] max-w-[700px] snap-start overflow-hidden`}>
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
    const msg = category
      ? t("لا توجد إعلانات في هذا التصنيف", "No listings in this category")
      : t("لا توجد إعلانات حالياً", "No listings right now");
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
        <ListingCardGroup
          key={`chunk-${chunkIndex}`}
          listings={chunk}
          isRTL={isRTL}
          onOpen={onListingClick}
        />
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

type BuySellMode = "all" | "listings" | "business";

interface BuySellHubTabProps {
  cityId?: string | null;
  buySellMode: BuySellMode;
  onBuySellModeChange: (mode: BuySellMode) => void;
  selectedBuySellCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  buySellSearchQuery: string;
  openListingList: (params?: { category?: string | null; search?: string | null }) => void;
  openListingDetail: (listing: Listing) => void;
  openDealDetail: (deal: Deal) => void;
  openBusinessDetail: (business: Business) => void;
  navigate: (path: string) => void;
  showBusinesses: boolean;
}

export function BuySellHubTab({
  cityId,
  buySellMode,
  onBuySellModeChange,
  selectedBuySellCategory,
  onCategoryChange,
  buySellSearchQuery,
  openListingList,
  openListingDetail,
  openDealDetail,
  openBusinessDetail,
  navigate,
  showBusinesses,
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
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={buySellMode === "all" ? "default" : "outline"}
          size="sm"
          className="h-10"
          onClick={() => onBuySellModeChange("all")}
        >
          {t("الكل", "All")}
        </Button>
        <Button
          type="button"
          variant={buySellMode === "listings" ? "default" : "outline"}
          size="sm"
          className="h-10"
          onClick={() => onBuySellModeChange("listings")}
        >
          {t("إعلانات", "Listings")}
        </Button>
        {showBusinesses && (
          <Button
            type="button"
            variant={buySellMode === "business" ? "default" : "outline"}
            size="sm"
            className="h-10"
            onClick={() => onBuySellModeChange("business")}
          >
            {t("متاجر", "Businesses")}
          </Button>
        )}
      </div>

      {/* Categories Grid */}
      <HubSection title={t("التصنيفات", "Categories")} icon={LayoutGrid}>
        <BuySellCategories
          onCategoryClick={(catId) => {
            const nextCategory = selectedBuySellCategory === catId ? null : catId;
            onCategoryChange(nextCategory);
          }}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => openListingList({ category: selectedBuySellCategory, search: buySellSearchQuery })}
          >
            {t("عرض النتائج", "View results")}
          </Button>
          {selectedBuySellCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange(null)}
              className="text-xs"
            >
              {t("إلغاء التصفية", "Clear filter")}: {selectedCategoryLabel}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </HubSection>

      {buySellMode === "listings" || buySellMode === "all" ? (
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
              onListingClick={(listing) => {
                openListingDetail(listing);
              }}
              onEmptyAction={() => navigate("/buy-sell/create-listing")}
            />
          </HubSection>
        </AnimatedSection>
      ) : null}

      {(buySellMode === "business" || buySellMode === "all") && showBusinesses ? (
        <>
          {/* Featured Deals */}
          <AnimatedSection direction="up" delay={200}>
            <HubSection
              id="featured-deals"
              title={t("عروض مميزة", "Featured Deals")}
              icon={Tag}
              actionLabel={t("عرض الكل", "View All")}
              onAction={() => {
                const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                navigate(`/buy-sell/deals/featured${q}`);
              }}
            >
              <FeaturedDeals
                cityId={cityId}
                category={selectedBuySellCategory}
                search={buySellSearchQuery}
                limit={6}
                onDealClick={(deal) => openDealDetail(deal)}
              />
            </HubSection>
          </AnimatedSection>

          {/* Active Deals Grid */}
          <BuySellDealsSection
            cityId={cityId}
            category={selectedBuySellCategory}
            search={buySellSearchQuery}
            onDealClick={openDealDetail}
          />

          {/* Trending Deals */}
          <AnimatedSection direction="up" delay={400}>
            <HubSection
              id="trending-deals"
              title={t("عروض ترند", "Trending Deals")}
              icon={TrendingUp}
              actionLabel={t("عرض الكل", "View All")}
              onAction={() => {
                const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                navigate(`/buy-sell/deals/trending${q}`);
              }}
            >
              <TrendingDeals
                cityId={cityId}
                category={selectedBuySellCategory}
                search={buySellSearchQuery}
                limit={8}
                onDealClick={openDealDetail}
              />
            </HubSection>
          </AnimatedSection>

          {/* New Deals */}
          <AnimatedSection direction="up" delay={500}>
            <HubSection
              id="new-listings"
              title={t("عروض جديدة", "New Listings")}
              icon={Sparkles}
              actionLabel={t("عرض الكل", "View All")}
              onAction={() => {
                const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                navigate(`/buy-sell/deals/new${q}`);
              }}
            >
              <NewListings
                cityId={cityId}
                category={selectedBuySellCategory}
                search={buySellSearchQuery}
                limit={8}
                onDealClick={openDealDetail}
              />
            </HubSection>
          </AnimatedSection>

          {/* Featured Businesses */}
          {showBusinesses && (
            <BuySellBusinessesSection
              cityId={cityId}
              category={selectedBuySellCategory}
              search={buySellSearchQuery}
              onBusinessClick={openBusinessDetail}
            />
          )}

          {/* Business Directory */}
          {showBusinesses && (
            <AnimatedSection direction="up" delay={600}>
              <HubSection
                id="business-directory"
                title={t("دليل المتاجر", "Business Directory")}
                icon={Store}
                actionLabel={t("عرض الكل", "View All")}
                onAction={() => {
                  const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                  navigate(`/buy-sell/businesses${q}`);
                }}
              >
                <BusinessDirectory
                  cityId={cityId}
                  category={selectedBuySellCategory}
                  search={buySellSearchQuery}
                  limit={12}
                  onBusinessClick={openBusinessDetail}
                />
              </HubSection>
            </AnimatedSection>
          )}
        </>
      ) : null}

      {/* Enhanced Footer */}
      <div className="pt-8 pb-4 border-t border-border/30">
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
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
  );
}
