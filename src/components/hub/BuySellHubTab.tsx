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
import { HeroSection } from "@/components/hub/HeroSection";
import { ProgressiveSection } from "@/components/hub/ProgressiveSection";
import { SectionDivider } from "@/components/hub/SectionDivider";
import { BuySellSearchBar } from "@/components/hub/BuySellSearchBar";
import { HUB_CARD_BASE, HUB_DIVIDER_LIGHT } from "@/components/hub/hubStyles";
import { getBuySellCategoryLabel } from "@/components/hub/buySellCategories";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import { useListings, type Listing } from "@/hooks/useListings";
import { Award, Clock, LayoutGrid, Shield, ShoppingBag, Sparkles, Store, Tag, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

function BuySellDealsSection({
  cityId,
  category,
  search,
  onDealClick,
  limit = 4,
}: {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onDealClick: (deal: Deal) => void;
  limit?: number;
}) {
  const { data: deals, isLoading } = useDeals({ cityId, category, limit });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const q = (search || "").trim().toLowerCase();
  const filteredDeals = q
    ? (deals || []).filter((d) => `${d.title} ${(d.description || "")}`.toLowerCase().includes(q))
    : (deals || []);

  const displayedDeals = filteredDeals;

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`deal-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
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

  if (filteredDeals.length === 0) {
    const msg = category
      ? (isRTL ? "لا توجد عروض في هذا التصنيف" : "No deals in this category")
      : (isRTL ? "لا توجد عروض متاحة حالياً" : "No active deals available");
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
        <Tag className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {displayedDeals.map((deal) => (
        <div key={deal.id}>
          <DealCard
            deal={deal}
            onClick={() => onDealClick(deal)}
            isRTL={isRTL}
          />
        </div>
      ))}
    </div>
  );
}

function BuySellBusinessesSection({
  cityId,
  category,
  search,
  onBusinessClick,
  limit = 4,
}: {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onBusinessClick: (business: Business) => void;
  limit?: number;
}) {
  const { data: businesses, isLoading } = useBusinesses({ cityId, category, featured: true, limit });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const q = (search || "").trim().toLowerCase();
  const filteredBusinesses = q
    ? (businesses || []).filter((b) => {
        const hay = `${b.name} ${b.description || ""} ${b.location || ""}`.toLowerCase();
        return hay.includes(q);
      })
    : (businesses || []);

  const displayedBusinesses = filteredBusinesses;

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`business-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredBusinesses.length === 0) {
    const msg = category
      ? (isRTL ? "لا توجد متاجر في هذا التصنيف" : "No businesses in this category")
      : (isRTL ? "لا توجد متاجر مميزة حالياً" : "No featured businesses yet");
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
        <Store className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {displayedBusinesses.map((business) => (
        <div key={business.id}>
          <BusinessCard
            business={business}
            onClick={() => onBusinessClick(business)}
            isRTL={isRTL}
          />
        </div>
      ))}
    </div>
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`listing-loading-${i}`} className={`${HUB_CARD_BASE} bg-card rounded-2xl overflow-hidden`}>
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-3 w-16" />
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
    <ListingCardGroup
      listings={listings.slice(0, 12)}
      isRTL={isRTL}
      onOpen={onListingClick}
    />
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
  onSearchChange,
  openListingList,
  openListingDetail,
  openDealDetail,
  openBusinessDetail,
  navigate,
  showBusinesses,
}: BuySellHubTabProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const selectedCategoryLabel = getBuySellCategoryLabel(selectedBuySellCategory, language);

  const buildQueryString = (category: string | null, search: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const trimmed = search.trim();
    if (!trimmed) return qs;
    return qs ? `${qs}&q=${encodeURIComponent(trimmed)}` : `?q=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="space-y-6">
      {/* Sticky Category Bar */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 -mx-4 px-4 py-3 border-b border-border/40">
        <BuySellCategories
          onCategoryClick={(catId) => {
            const nextCategory = selectedBuySellCategory === catId ? null : catId;
            onCategoryChange(nextCategory);
          }}
          compact
          sticky={false}
        />
      </div>

      {/* Search Bar */}
      <div className="px-4">
        <BuySellSearchBar
          value={buySellSearchQuery}
          onChange={onSearchChange || (() => {})}
          onCategoryFilter={onCategoryChange}
          selectedCategory={selectedBuySellCategory}
        />
      </div>

      <div className="px-4 space-y-6">
        {/* Hero Section */}
        <AnimatedSection direction="up" delay={100}>
          <HeroSection
            onBrowseClick={() => navigate("/buy-sell/listings")}
            onCreateClick={() => navigate("/buy-sell/create-listing")}
          />
        </AnimatedSection>

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

        {/* Full Categories Grid */}
        <HubSection title={t("جميع التصنيفات", "All Categories")} icon={LayoutGrid}>
          <BuySellCategories
            onCategoryClick={(catId) => {
              const nextCategory = selectedBuySellCategory === catId ? null : catId;
              onCategoryChange(nextCategory);
            }}
          />
          {selectedBuySellCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCategoryChange(null)}
              className="w-full text-xs mt-3"
            >
              {t("إلغاء التصفية", "Clear filter")}: {selectedCategoryLabel}
              <X className="h-3 w-3 ml-1" />
            </Button>
          )}
        </HubSection>

        <SectionDivider variant="light" />

        {/* Primary Content Section */}
        {buySellMode === "listings" || buySellMode === "all" ? (
          <>
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
                  onListingClick={openListingDetail}
                  onEmptyAction={() => navigate("/buy-sell/create-listing")}
                />
              </HubSection>
            </AnimatedSection>

            {/* Trending Section - Primary for mobile */}
            <AnimatedSection direction="up" delay={250}>
              <HubSection 
                id="trending-deals" 
                title={t("الأكثر طلباً الآن", "Trending Now")} 
                icon={TrendingUp}
                actionLabel={t("عرض الكل", "View All")}
                onAction={() => {
                  const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                  navigate(`/buy-sell/deals/trending${q}`);
                }}
              >
                <BuySellDealsSection
                  cityId={cityId}
                  category={selectedBuySellCategory}
                  search={buySellSearchQuery}
                  onDealClick={openDealDetail}
                  limit={4}
                />
              </HubSection>
            </AnimatedSection>

            {/* New Listings Section */}
            <AnimatedSection direction="up" delay={300}>
              <HubSection 
                id="new-listings" 
                title={t("أضيف للتو", "Recently Added")} 
                icon={Sparkles}
                actionLabel={t("عرض الكل", "View All")}
                onAction={() => {
                  const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                  navigate(`/buy-sell/deals/new${q}`);
                }}
              >
                <BuySellDealsSection
                  cityId={cityId}
                  category={selectedBuySellCategory}
                  search={buySellSearchQuery}
                  onDealClick={openDealDetail}
                  limit={4}
                />
              </HubSection>
            </AnimatedSection>

            <SectionDivider variant="light" />

            {/* Browse All CTA */}
            <div className="bg-muted/30 rounded-xl p-4 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">
                {t("لم تجد ما تبحث عنه؟", "Can't find what you're looking for?")}
              </p>
              <Button 
                className="w-full"
                onClick={() => navigate("/buy-sell/listings")}
              >
                {t("استكشف جميع الإعلانات", "Browse All Listings")}
              </Button>
            </div>

            <SectionDivider variant="light" />

            {/* Secondary sections (collapsed by default) */}
            <ProgressiveSection
              title={t("عروض مميزة", "Featured Deals")}
              defaultExpanded={false}
            >
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
                  onDealClick={openDealDetail}
                />
              </HubSection>
            </ProgressiveSection>

            {/* Active Deals Grid - Secondary */}
            <ProgressiveSection
              title={t("العروض النشطة", "Active Deals")}
              defaultExpanded={false}
            >
              <BuySellDealsSection 
                cityId={cityId} 
                category={selectedBuySellCategory} 
                search={buySellSearchQuery} 
                onDealClick={openDealDetail}
                limit={8}
              />
            </ProgressiveSection>
          </>
        ) : null}

        {/* Business mode sections */}
        {(buySellMode === "business" || buySellMode === "all") && showBusinesses ? (
          <>
            {/* Featured Businesses */}
            <AnimatedSection direction="up" delay={200}>
              <HubSection
                id="featured-businesses"
                title={t("المتاجر المميزة", "Featured Businesses")}
                icon={Store}
                actionLabel={t("عرض الكل", "View All")}
                onAction={() => {
                  const q = buildQueryString(selectedBuySellCategory, buySellSearchQuery);
                  navigate(`/buy-sell/businesses${q}`);
                }}
              >
                <BuySellBusinessesSection
                  cityId={cityId}
                  category={selectedBuySellCategory}
                  search={buySellSearchQuery}
                  onBusinessClick={openBusinessDetail}
                  limit={4}
                />
              </HubSection>
            </AnimatedSection>

            {/* Business Directory */}
            <AnimatedSection direction="up" delay={300}>
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
          </>
        ) : null}

        {/* Enhanced Footer */}
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
