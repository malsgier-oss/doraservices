// DORA_HUB_PATCH_v4 (ticker+banner-loop+no-all-cities+sticky-fullwidth)
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Award, Bell, CheckCheck, ChevronDown, Search, Shield, MapPin, Clock, Users, Wrench, Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper, Droplets, Wind, Fuel, ClipboardCheck, X, LayoutGrid, Star, TrendingUp, BookOpen, Sparkles, Store, Tag, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

import { MOBILE_NAV_HEIGHT_PX } from "@/constants/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FeaturedHero } from "@/components/hub/FeaturedHero";
import { HubSection } from "@/components/hub/HubSection";
import { ServiceCardFeatured } from "@/components/hub/ServiceCardFeatured";
import { FeaturedProvidersCard } from "@/components/hub/FeaturedProvidersCard";
import { ServiceCardGroup } from "@/components/hub/ServiceCardGroup";
import { HubItemCard } from "@/components/hub/HubItemCard";
import { ServiceFilters } from "@/components/hub/ServiceFilters";
import { ServiceGrid } from "@/components/hub/ServiceGrid";
import { DiscoverySection } from "@/components/hub/DiscoverySection";
import { ServiceQuickView } from "@/components/hub/ServiceQuickView";
import { ViewToggle } from "@/components/hub/ViewToggle";
import { LoadMoreButton } from "@/components/hub/LoadMoreButton";
import { useServiceFilters } from "@/hooks/useServiceFilters";
import { useSimilarServices } from "@/hooks/useSimilarServices";
import { TipChip } from "@/components/hub/TipChip";
import { HubChipCard } from "@/components/hub/HubChipCard";
import { HubCategoryCard } from "@/components/hub/HubCategoryCard";
import { StatsBar } from "@/components/hub/StatsBar";
import { ActivityFeed } from "@/components/hub/ActivityFeed";
import { HubTabSwitcher } from "@/components/hub/HubTabSwitcher";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { useServicesEnabled } from "@/hooks/useServicesEnabled";
import { FeaturedDeals } from "@/components/hub/FeaturedDeals";
import { DealCard } from "@/components/hub/DealCard";
import { BuySellCategories, BUY_SELL_CATEGORIES } from "@/components/hub/BuySellCategories";
import { BuySellHubTab } from "@/components/hub/BuySellHubTab";
import { BuySellCategoryDrawer } from "@/components/hub/BuySellCategoryDrawer";
import { TrendingDeals } from "@/components/hub/TrendingDeals";
import { NewListings } from "@/components/hub/NewListings";
import { ListingCard } from "@/components/hub/ListingCard";
import { ListingCardGroup } from "@/components/hub/ListingCardGroup";
import { ListingDetailSheet } from "@/components/hub/ListingDetailSheet";
import { ListingListSheet } from "@/components/hub/ListingListSheet";
import { SearchFilters, type FilterState } from "@/components/hub/SearchFilters";
import { AnimatedSection } from "@/components/hub/AnimatedSection";
import { DealDetailSheet } from "@/components/hub/DealDetailSheet";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useListings, type Listing } from "@/hooks/useListings";
import { useListing } from "@/hooks/useListing";
import { HUB_CARD_BASE, HUB_CARD_ROW_4, HUB_CARD_SLOT_4 } from "@/components/hub/hubStyles";

import { useCategories } from "@/hooks/useCategories";
import { useCities } from "@/hooks/useCities";
import { useHubBanners } from "@/hooks/useHubBanners";
import { useHubShelves } from "@/hooks/useHubShelves";
import { useHubChips } from "@/hooks/useHubChips";
import { useHubTopCategories } from "@/hooks/useHubTopCategories";
import { useFeaturedSubcategories } from "@/hooks/useFeaturedSubcategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { useMostDemandedServices } from "@/hooks/useMostDemandedServices";
import { useGuides } from "@/hooks/useGuides";
import { useServiceRatings } from "@/hooks/useReviews";
import { CategoryBrowseSheet } from "@/components/hub/CategoryBrowseSheet";
import { supabase } from "@/integrations/supabase/client";
import { trackProviderEvent } from "@/lib/providerTelemetry";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { getCategoryIcon, HUB_ICON_MAP } from "@/lib/categoryIcons";
import { cn, normalizeCategory } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useUnreadCount, useNotificationMutations } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Safety net: prevent a whole-app white screen if ServiceDetailSheet crashes.
 * Root cause can vary (schema mismatches, missing tables, etc.).
 * We fail closed: show a toast + close the sheet instead of crashing the app.
 */
class SafeBoundary extends Component<
  { children: ReactNode; onError?: (err: unknown) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

type ServiceRow = {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
  description?: string | null;
};

type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
  display_order: number | null;
  is_active: boolean | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  city_id: string | null;
  priority: number;
  start_at?: string | null;
  end_at?: string | null;
};

type GuideCard = {
  id: string;
  icon: LucideIcon;
  title: string;
  summaryLines: [string, string];
  bullets: string[];
};

const CITY_STORAGE_KEY = "dora_city_id";

// PHASE 1 (UI scaffolding): Global guides are static for now.
// In Phase 3 we will move this to admin-controlled content.
const DEFAULT_GUIDES_AR: GuideCard[] = [
  {
    id: "guide-electricity",
    icon: Zap,
    title: "قبل ما تتصل بالكهربائي",
    summaryLines: [
      "هل المشكلة من العداد أو داخل البيت؟",
      "اسأل عن المعاينة قبل بدء التصليح",
    ],
    bullets: [
      "هل المشكلة من العداد أو داخل البيت؟",
      "اسأل لو في معاينة قبل بدء الشغل",
      "حدّد مكان المشكلة بدقة",
      "اسأل لو السعر تقريبي أو نهائي",
      "اتفق على الوقت قبل ما يطلع الفني",
    ],
  },
  {
    id: "guide-plumbing",
    icon: Droplets,
    title: "تبي سباك؟",
    summaryLines: [
      "صوّر المشكلة قبل ما تتصل",
      "اسأل لو السعر شامل القطعة",
    ],
    bullets: [
      "صوّر المشكلة قبل ما تتصل",
      "اسأل لو السعر شامل القطعة",
      "خليك واضح: تسريب ولا انسداد؟",
      "اتفق على سعر تقريبي قبل الزيارة",
      "اسأل عن مدة الشغل والضمان",
    ],
  },
  {
    id: "guide-ac",
    icon: Wind,
    title: "صيانة التكييف",
    summaryLines: [
      "تنظيف أو فريون؟ الفرق كبير بالسعر",
      "اسأل عن الضمان بعد الشغل",
    ],
    bullets: [
      "تنظيف أو فريون؟ الفرق كبير بالسعر",
      "اسأل عن الضمان بعد الشغل",
      "اسأل هل السعر شامل زيارة وفحص",
      "حدد نوع التكييف وقدرته (مثلاً 1.5 طن)",
      "اتفق لو في قطع غيار قبل التركيب",
    ],
  },
  {
    id: "guide-general",
    icon: ClipboardCheck,
    title: "كيف تختار فني صح",
    summaryLines: [
      "خليك واضح من أول مكالمة",
      "لا تدفع كامل المبلغ قبل الشغل",
    ],
    bullets: [
      "خليك واضح من أول مكالمة",
      "لا تدفع كامل المبلغ قبل الشغل",
      "اسأل عن مدة التنفيذ قبل ما يجي",
      "اتفق على السعر أو الحد الأعلى",
      "خلي كلامك بسيط ومحدد",
    ],
  },
];

const DEFAULT_GUIDES_EN: GuideCard[] = [
  {
    id: "guide-electricity",
    icon: Zap,
    title: "Before you call an electrician",
    summaryLines: [
      "Is it the meter or inside the home?",
      "Ask if there is an inspection fee",
    ],
    bullets: [
      "Is it the meter or inside the home?",
      "Ask if there is an inspection fee",
      "Describe the problem location clearly",
      "Confirm if the price is estimate or final",
      "Agree on timing before the visit",
    ],
  },
  {
    id: "guide-plumbing",
    icon: Droplets,
    title: "Need a plumber?",
    summaryLines: [
      "Take a photo before you call",
      "Ask if the part is included",
    ],
    bullets: [
      "Take a photo before you call",
      "Ask if the part is included",
      "Be clear: leak or blockage?",
      "Agree on an estimate before the visit",
      "Ask about duration and warranty",
    ],
  },
  {
    id: "guide-ac",
    icon: Wind,
    title: "AC service",
    summaryLines: [
      "Cleaning vs freon changes the price",
      "Ask about warranty",
    ],
    bullets: [
      "Cleaning vs freon changes the price",
      "Ask about warranty",
      "Ask if the visit/inspection is included",
      "Confirm the brand and unit size",
      "Agree on timing",
    ],
  },
  {
    id: "guide-general",
    icon: ClipboardCheck,
    title: "Choose a technician wisely",
    summaryLines: [
      "Be clear from the first call",
      "Don’t pay the full amount upfront",
    ],
    bullets: [
      "Be clear from the first call",
      "Don’t pay the full amount upfront",
      "Confirm what is included in the price",
      "Ask about expected time",
      "Keep messages/photos as reference",
    ],
  },
];

function useSelectedCityId() {
  const [cityId, setCityId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CITY_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (cityId) localStorage.setItem(CITY_STORAGE_KEY, cityId);
      else localStorage.removeItem(CITY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [cityId]);


  return { cityId, setCityId };
}

async function fetchShelfSubcategories(params: { categoryId: string; limit: number }) {
  const { categoryId, limit } = params;
  const { data, error } = await supabase
    .from("subcategories")
    .select("id,category_id,name,name_ar,icon,color,display_order,is_active")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("fetchShelfSubcategories error:", error);
    return [];
  }
  return (data as any[]) as SubcategoryRow[];
}



// Buy/Sell Sections Components
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
      <HubSection title={t("إعلانات للبيع", "Listings")} icon={Tag}>
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
      </HubSection>
    );
  }

  if (!listings || listings.length === 0) {
    const msg = category
      ? t("لا توجد إعلانات في هذا التصنيف", "No listings in this category")
      : t("لا توجد إعلانات حالياً", "No listings right now");
    return (
      <HubSection title={t("إعلانات للبيع", "Listings")} icon={Tag}>
        <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
          <ShoppingBag className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{msg}</p>
          {onEmptyAction ? (
            <Button variant="outline" size="sm" onClick={onEmptyAction}>
              {t("نشر إعلانك الأول", "Post your first listing")}
            </Button>
          ) : null}
        </div>
      </HubSection>
    );
  }

  const labels = {
    noPhoto: t("لا توجد صورة", "No photo"),
  };

  return (
    <HubSection title={t("إعلانات للبيع", "Listings")} icon={Tag}>
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
            labels={labels}
          />
        ))}
      </div>
    </HubSection>
  );
}

// Helper function to chunk array into groups
const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

type HubProps = { initialTab?: "services" | "buy-sell" };

export default function Hub({ initialTab }: HubProps = {}) {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  // Deal detail state
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealSheetOpen, setDealSheetOpen] = useState(false);

  const openDealDetail = (deal: Deal) => {
    // Ensure we never have two Drawers open at once
    setDealSheetOpen(false);
    setSelectedDeal(null);
    setListingSheetOpen(false);
    setSelectedListing(null);
    setBuySellCategoryDrawerOpen(false);
    setSelectedCategoryForDrawer(null);
    // Open ListingListSheet with deal's category
    setListingListCategory(deal.category || null);
    setListingListSearch(null);
    setListingListSheetOpen(true);
  };

  // Buy/Sell category filter state
  const [selectedBuySellCategory, setSelectedBuySellCategory] = useState<string | null>(null);
  const [buySellSearchQuery, setBuySellSearchQuery] = useState<string>("");
  const [buySellMode, setBuySellMode] = useState<"all" | "listings">("all");

  // Buy/Sell category drawer state
  const [buySellCategoryDrawerOpen, setBuySellCategoryDrawerOpen] = useState(false);
  const [selectedCategoryForDrawer, setSelectedCategoryForDrawer] = useState<string | null>(null);

  // Listing detail state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [listingSheetOpen, setListingSheetOpen] = useState(false);

  // ListingListSheet state (for deal card clicks)
  const [listingListSheetOpen, setListingListSheetOpen] = useState(false);
  const [listingListCategory, setListingListCategory] = useState<string | null>(null);
  const [listingListSearch, setListingListSearch] = useState<string | null>(null);

  const openListingDetail = (listing: Listing) => {
    // Ensure we never have two Drawers open at once
    setDealSheetOpen(false);
    setSelectedDeal(null);
    setBuySellCategoryDrawerOpen(false);
    setSelectedCategoryForDrawer(null);
    setListingListSheetOpen(false);
    setListingListCategory(null);
    setListingListSearch(null);
    setSelectedListing(listing);
    setListingSheetOpen(true);
  };

  const location = useLocation();
  const deepLinkParams = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return {
      listingId: p.get("listing")?.trim() || null,
      dealId: p.get("deal")?.trim() || null,
    };
  }, [location.search]);

  const { data: deepLinkListing } = useListing(deepLinkParams.listingId, !!deepLinkParams.listingId);
  const [deepLinkDeal, setDeepLinkDeal] = useState<Deal | null>(null);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    if (!deepLinkParams.dealId) {
      setDeepLinkDeal(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", deepLinkParams.dealId)
        .eq("status", "active")
        .is("archived_at", null)
        .maybeSingle();
      if (cancelled || error) return;
      setDeepLinkDeal((data as Deal) || null);
    })();
    return () => { cancelled = true; };
  }, [deepLinkParams.dealId]);

  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const { markAsRead, markAllAsRead } = useNotificationMutations();
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: citiesData } = useCities();

  const { cityId, setCityId } = useSelectedCityId();

  const selectedCity = useMemo(() => {
    return (citiesData || []).find((c) => c.id === cityId) || null;
  }, [citiesData, cityId]);

  const selectedCityName = selectedCity?.name || null;

  const { banners, publicUrlsById } = useHubBanners(cityId);
  const { chips } = useHubChips(cityId);
  const { categoryIds: topCategoryIds } = useHubTopCategories(cityId);
  const { shelves, itemsByShelf } = useHubShelves(cityId);
  const { data: allSubcategories } = useAllSubcategories();
  const { rows: featuredSubcats } = useFeaturedSubcategories(cityId);

  // City name variants (AR/EN) for system-demand filtering.
  const demandCityNames = useMemo(() => {
    const names = new Set<string>();
    if (selectedCity?.name) names.add(String(selectedCity.name));
    if ((selectedCity as any)?.name_ar) names.add(String((selectedCity as any).name_ar));
    return Array.from(names);
  }, [selectedCity]);

  const { rows: mostDemandedRows, loading: mostDemandedLoading } = useMostDemandedServices({
    cityNames: demandCityNames,
    limit: 6,
  });

  // Phase 3: Guides are DB-driven (admin-controlled) with a safe fallback to local defaults.
  const { data: guidesRows, isLoading: guidesLoading } = useGuides();
  const guidesCards: GuideCard[] = useMemo(() => {
    const fallback = language === "ar" ? DEFAULT_GUIDES_AR : DEFAULT_GUIDES_EN;
    const rows = (guidesRows || []).filter((r) => r.is_active !== false);
    if (rows.length === 0) return fallback;

    const mapped: GuideCard[] = rows.map((r: any) => {
      const Icon = getCategoryIcon(r.icon_key);
      const title = language === "ar" ? String(r.title_ar || "") : String(r.title_en || r.title_ar || "");
      const summary = language === "ar" ? (r.summary_lines_ar as string[]) : ((r.summary_lines_en as string[] | null) || (r.summary_lines_ar as string[]));
      const bullets = language === "ar" ? (r.bullets_ar as string[]) : ((r.bullets_en as string[] | null) || (r.bullets_ar as string[]));

      const s1 = summary?.[0] ? String(summary[0]) : "";
      const s2 = summary?.[1] ? String(summary[1]) : "";
      return {
        id: String(r.id),
        icon: Icon,
        title,
        summaryLines: [s1, s2],
        bullets: (bullets || []).map(String).filter(Boolean),
      };
    });

    // Final ordering (respect sort_order when present)
    return mapped;
  }, [guidesRows, language]);

  const categories = useMemo(() => {
    return (categoriesData || []).filter((c) => c.is_active !== false).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [categoriesData]);

  const categoriesById = useMemo(() => {
    const map: Record<string, (typeof categories)[number]> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  // Search
  const [query, setQuery] = useState("");
  const queryTrim = query.trim();

  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);

  // Featured services/providers shelf (horizontal cards)
  const [featuredServices, setFeaturedServices] = useState<ServiceRow[]>([]);
  const lastOpenAtRef = useRef<number>(0);

  const ratingServiceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const svc of featuredServices) {
      if (svc?.id) ids.add(String(svc.id));
    }
    for (const svc of mostDemandedRows) {
      if (svc?.id) ids.add(String(svc.id));
    }
    return Array.from(ids).sort();
  }, [featuredServices, mostDemandedRows]);

  const { ratings: serviceRatings } = useServiceRatings(ratingServiceIds);

  const getRating = (serviceId: string) => {
    const row = serviceRatings.get(serviceId);
    if (!row) return null;
    return {
      value: Number(row.averageRating || 0),
      count: Number(row.totalReviews || 0),
    };
  };

  // Create ratings Map for FeaturedProvidersCard
  const ratingsMap = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    for (const [serviceId, row] of serviceRatings.entries()) {
      map.set(serviceId, {
        value: Number(row.averageRating || 0),
        count: Number(row.totalReviews || 0),
      });
    }
    return map;
  }, [serviceRatings]);

  // Helper function to chunk array into groups of 4
  const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Group featured services into chunks of 4
  const featuredServicesChunks = useMemo(() => {
    return chunkArray(featuredServices, 4);
  }, [featuredServices]);

  const subcatByName = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      name_ar?: string | null;
      icon: LucideIcon;
      color: string | null;
    }>();

    const keyOf = (v: string) => String(v || "").trim().toLowerCase();
    const allSubs = (allSubcategories || []) as any[];

    for (const sc of allSubs) {
      const name = String(sc?.name || "").trim();
      const nameAr = String(sc?.name_ar || "").trim();
      if (!name && !nameAr) continue;
      const iconKey = String(sc?.icon || "");
      const icon = getCategoryIcon(iconKey);

      const value = {
        id: String(sc.id),
        name: name || nameAr,
        name_ar: sc?.name_ar ?? null,
        icon,
        color: (sc?.color ?? null) as string | null,
      };

      // Key by both EN + AR so services.category can be either.
      if (name) map.set(keyOf(name), value);
      if (nameAr) map.set(keyOf(nameAr), value);
    }

    // When service.category is a main-category name (no subcategory chosen), resolve to first subcategory of that category.
    for (const cat of categories || []) {
      const firstSc = allSubs
        .filter((s: any) => s?.category_id === cat.id)
        .sort((a: any, b: any) => (a?.display_order ?? 0) - (b?.display_order ?? 0))[0];
      if (!firstSc) continue;
      const iconKey = String(firstSc?.icon || "");
      const value = {
        id: String(firstSc.id),
        name: String(firstSc?.name || firstSc?.name_ar || "").trim() || (cat as any).name,
        name_ar: firstSc?.name_ar ?? (cat as any).name_ar ?? null,
        icon: getCategoryIcon(iconKey),
        color: (firstSc?.color ?? null) as string | null,
      };
      const k1 = keyOf((cat as any).name);
      const k2 = keyOf((cat as any).name_ar || "");
      if (k1) map.set(k1, value);
      if (k2) map.set(k2, value);
    }

    return map;
  }, [allSubcategories, categories]);

  useEffect(() => {
    let alive = true;

    const escOrValue = (v: string) => {
      const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    };

    const loadFeatured = async () => {
      try {
        // Base featured query
        let q = supabase
          .from("services")
          .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url,is_featured,price")
          .eq("is_featured", true)
          .eq("is_active", true)
          .eq("is_visible", true)
          .eq("is_paused", false)
          .eq("approval_status", "approved")
          .is("deleted_at", null)
          .order("views_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(12);

        // City filter (match AR/EN name variants when available)
        const cityNames = new Set<string>();
        if (selectedCity?.name) cityNames.add(String(selectedCity.name));
        if ((selectedCity as any)?.name_ar) cityNames.add(String((selectedCity as any).name_ar));

        // If cityId exists, try to fetch name_ar/name to build a stronger OR filter.
        if (cityId) {
          const { data: cityRow } = await supabase
            .from("cities")
            .select("name,name_ar")
            .eq("id", cityId)
            .maybeSingle();
          if (cityRow?.name) cityNames.add(String(cityRow.name));
          if ((cityRow as any)?.name_ar) cityNames.add(String((cityRow as any).name_ar));
        }

        const names = Array.from(cityNames).filter(Boolean);
        if (names.length > 0) {
          const cityOr = names.map((n) => `city.eq.${escOrValue(n)}`).join(",");
          q = q.or(cityOr);
        }

        const { data, error } = await q;
        if (!alive) return;
        if (error) {
          setFeaturedServices([]);
          return;
        }
        setFeaturedServices(((data || []) as any[]) as ServiceRow[]);
      } catch {
        if (alive) setFeaturedServices([]);
      }
    };

    loadFeatured();
    return () => {
      alive = false;
    };
  }, [cityId, selectedCity?.name]);

  // Single-line announcement ticker (rotates through announcements)
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  const activeAnnouncement = useMemo(() => {
    if (!announcements || announcements.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(announcementIndex, announcements.length - 1));
    return announcements[safeIndex] || null;
  }, [announcements, announcementIndex]);

  // Rotate announcement every X seconds
  useEffect(() => {
    if (!announcements || announcements.length <= 1) return;

    const interval = window.setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 5000); // every 5 seconds

    return () => window.clearInterval(interval);
  }, [announcements]);

  // Reset index when list changes (city switch / data refresh)
  useEffect(() => {
    setAnnouncementIndex(0);
  }, [cityId, announcements.length]);


  // Hub announcements (under search). City-specific first, then global.
  useEffect(() => {
    let alive = true;

    const loadAnnouncements = async () => {
      try {
        let q = supabase
          .from("announcements")
          .select("id,title,message,city_id,priority,start_at,end_at,created_at")
          .eq("is_active", true);

        if (cityId) {
          q = q.or(`city_id.eq.${cityId},city_id.is.null`);
        } else {
          q = q.is("city_id", null);
        }

        const { data, error } = await q
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false });

        if (!alive) return;

        if (error) {
          setAnnouncements([]);
          return;
        }

        const rows = (data || []) as any[];

        // City-specific first, then global; then priority desc
        rows.sort((a, b) => {
          const ac = a.city_id ? 1 : 0;
          const bc = b.city_id ? 1 : 0;
          if (ac != bc) return bc - ac;
          return (b.priority || 0) - (a.priority || 0);
        });

        // Keep all (or many) so ticker can rotate; Hub renders as one line.
        setAnnouncements(rows as AnnouncementRow[]);
      } catch {
        if (alive) setAnnouncements([]);
      }
    };

    loadAnnouncements();

    return () => {
      alive = false;
    };
  }, [cityId]);



  const filteredCategories = useMemo(() => {
    if (!queryTrim) return [];
    const ql = queryTrim.toLowerCase();
    return categories.filter((c) => (c.name_ar || c.name).toLowerCase().includes(ql)).slice(0, 10);
  }, [categories, queryTrim]);

  // Tab state for SERVICES / BUY & SELL
  const { isEnabled: buySellEnabled } = useBuySellEnabled();
  const { isEnabled: servicesEnabled } = useServicesEnabled();
  const [activeTab, setActiveTab] = useState<"services" | "buy-sell">(() => {
    // When route is /buy-sell, initialTab is passed from the Route; use it.
    if (initialTab) return initialTab;
    // Otherwise check URL hash on mount
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash === "buy-sell" || hash === "services") {
        return hash as "services" | "buy-sell";
      }
    }
    return "services";
  });

  // When pathname is /buy-sell, always show Buy & Sell (path-based tab).
  useEffect(() => {
    if (location.pathname === "/buy-sell") {
      setActiveTab("buy-sell");
    }
  }, [location.pathname]);

  // If Buy & Sell is disabled, force Services tab; if Services is disabled, force Buy & Sell tab.
  useEffect(() => {
    if (!buySellEnabled && activeTab === "buy-sell") {
      setActiveTab("services");
    }
    if (!servicesEnabled && buySellEnabled && activeTab === "services") {
      setActiveTab("buy-sell");
    }
  }, [activeTab, buySellEnabled, servicesEnabled]);

  // Sync URL hash when tab changes (only when on / so hash is relevant)
  useEffect(() => {
    if (location.pathname !== "/") return;
    if (buySellEnabled && activeTab) {
      window.location.hash = activeTab;
      // Avoid animated scroll (can feel like zoom on mobile)
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [activeTab, buySellEnabled, location.pathname]);

  // Tab change handler: when on / and switching to Buy & Sell, go to /buy-sell; when on /buy-sell and switching to Services, go to /
  const handleTabChange = (tab: "services" | "buy-sell") => {
    if (tab === "buy-sell" && location.pathname === "/") {
      navigate("/buy-sell");
      return;
    }
    if (tab === "services" && location.pathname === "/buy-sell") {
      navigate("/");
      return;
    }
    setActiveTab(tab);
  };

  // Deep links: ?listing=, ?deal= — open corresponding sheet and switch to buy-sell
  useEffect(() => {
    if (!buySellEnabled) return;
    const { listingId, dealId } = deepLinkParams;
    if (listingId && deepLinkListing && !deepLinkHandledRef.current) {
      deepLinkHandledRef.current = true;
      setActiveTab("buy-sell");
      openListingDetail(deepLinkListing);
      navigate("/", { replace: true });
      return;
    }
    if (dealId && deepLinkDeal && !deepLinkHandledRef.current) {
      deepLinkHandledRef.current = true;
      setActiveTab("buy-sell");
      openDealDetail(deepLinkDeal);
      setDeepLinkDeal(null);
      navigate("/", { replace: true });
      return;
    }
    if (!listingId && !dealId) {
      deepLinkHandledRef.current = false;
    }
  }, [buySellEnabled, deepLinkParams, deepLinkListing, deepLinkDeal, navigate]);

  // Bottom sheets
  // IMPORTANT: Do NOT mount two Drawers at the same time.
  // On mobile, Radix/shadcn Drawers can crash (minified React error) when
  // one Drawer is closing while another is mounting.
  // We use a simple state machine so only one Drawer exists in the tree.
  type ActiveSheet = "none" | "browse" | "providers" | "guide";
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>("none");

  // 3) Guide drawer (global guidance cards)
  const guideOpen = activeSheet === "guide";
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const activeGuide = useMemo(() => {
    if (!activeGuideId) return null;
    return (guidesCards || []).find((g) => g.id === activeGuideId) || null;
  }, [activeGuideId, guidesCards]);

  function openGuide(guideId: string) {
    setActiveGuideId(guideId);
    setActiveSheet("guide");
  }

  // 1) Category browse (shows subcategories)
  const browseOpen = activeSheet === "browse";
  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);

  const browseCategory = useMemo(() => {
    if (!browseCategoryId) return null;
    return categoriesById[browseCategoryId] || null;
  }, [browseCategoryId, categoriesById]);

  function openCategoryBrowse(categoryId: string) {
    setBrowseCategoryId(categoryId);
    setActiveSheet("browse");
  }

  // Search filters state
  const [searchFilters, setSearchFilters] = useState<FilterState>({
    priceRange: [0, 10000],
    minRating: 0,
    sortBy: "relevance",
  });

  // Premium service filters
  const {
    filters: serviceFilters,
    updateFilters: updateServiceFilters,
    clearFilters: clearServiceFilters,
    hasActiveFilters: hasActiveServiceFilters,
  } = useServiceFilters({
    city: cityId || null,
  });

  // Quick view state
  const [quickViewService, setQuickViewService] = useState<ServiceRow | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  // View mode (grid/list)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  function openSubcategoryProviders(subcat: { id: string; name: string; name_ar?: string | null; icon: LucideIcon; color: string | null; category_id?: string }) {
    const cid = (subcat as { category_id?: string }).category_id;
    if (cid) navigate(`/services/category/${cid}?sub=${subcat.id}`);
  }

  const openServiceFromRow = (service: ServiceRow) => {
    const now = Date.now();
    if (now - lastOpenAtRef.current < 250) return;
    lastOpenAtRef.current = now;
    if (service?.id) navigate(`/services/service/${service.id}`);
  };

  const handleQuickView = (service: ServiceRow) => {
    setQuickViewService(service);
    setQuickViewOpen(true);
  };

  const handleQuickViewFull = () => {
    if (quickViewService) {
      setQuickViewOpen(false);
      openServiceFromRow(quickViewService);
    }
  };

  // When selecting a subcategory from the browse sheet, we must close/unmount the browse Drawer
  // before mounting the provider Drawer. Otherwise mobile browsers can crash.
  // Shelves data (category shelves load subcategories)
  const [subcatsByShelfId, setSubcatsByShelfId] = useState<Record<string, SubcategoryRow[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next: Record<string, SubcategoryRow[]> = {};
      for (const shelf of shelves) {
        if (shelf.shelf_type !== "category") continue;
        if (!shelf.category_id) continue;

        const cat = categoriesById[shelf.category_id];
        if (!cat) continue;

        const rows = await fetchShelfSubcategories({
          categoryId: shelf.category_id,
          limit: Math.max(1, shelf.max_items || 10),
        });

        if (cancelled) return;
        next[shelf.id] = rows;
      }

      if (!cancelled) setSubcatsByShelfId(next);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [shelves, categoriesById]);

  // Services grid (Top 8 MAIN categories)
  const gridCategories = useMemo(() => {
    const configured = (topCategoryIds || [])
      .map((id) => categoriesById[id])
      .filter(Boolean);
    if (configured.length === 8) return configured;
    // fallback: first 8 active categories
    return categories.slice(0, 8);
  }, [topCategoryIds, categoriesById, categories]);

  
  // Auto-pick first active city when none selected (removes "All cities" option).
  useEffect(() => {
    if (cityId) return;
    const first = (citiesData || [])
      .filter((c: any) => c.is_active)
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
    if (first?.id) setCityId(first.id);
  }, [cityId, citiesData, setCityId]);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const labels = {
    call: t("اتصال", "Call"),
    whatsapp: t("واتساب", "WhatsApp"),
    providerFallback: t("مزود", "Provider"),
    noPhoto: t("بدون صورة", "No photo"),
    ratingFallback: t("جديد", "New"),
  };

  const getContactState = (service: ServiceRow) => {
    const telLink = getTelLink(String(service.provider_phone || ""));
    const waLink = getWhatsAppLink(String(service.provider_phone || ""));
    const allowWhatsapp = service.allow_whatsapp !== false;
    return {
      telLink,
      waLink,
      canCall: telLink !== "tel:",
      canWhatsApp: waLink !== "https://wa.me/" && allowWhatsapp,
      allowWhatsapp,
    };
  };

  const handleCall = (service: ServiceRow) => {
    const { telLink } = getContactState(service);
    if (telLink === "tel:") {
      toast({ title: t("رقم الهاتف غير متوفر", "Phone number not available"), variant: "destructive" });
      return;
    }
    void trackProviderEvent(service.id, "call");
    try {
      window.location.href = telLink;
    } catch {
      window.open(telLink, "_self");
    }
  };

  const handleWhatsApp = (service: ServiceRow) => {
    const { waLink, allowWhatsapp } = getContactState(service);
    if (waLink === "https://wa.me/" || !allowWhatsapp) {
      toast({ title: t("واتساب غير متوفر", "WhatsApp not available"), variant: "destructive" });
      return;
    }
    void trackProviderEvent(service.id, "whatsapp");
    try {
      const w = window.open(waLink, "_blank", "noopener,noreferrer");
      if (!w) window.location.href = waLink;
    } catch {
      window.location.href = waLink;
    }
  };

  // City label (no "All cities" option; auto-picks first city)
  const cityLabel = selectedCity ? (selectedCity.name_ar || selectedCity.name) : t("اختر المدينة", "Choose a city");

  // Header must stay frozen even if parent containers use overflow/transform.
  // Using position:fixed + measured spacer is more reliable than sticky in complex layouts.
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Measure the fixed header height so content below doesn't get hidden under it.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      // +1px safety to avoid overlap on some mobile browsers.
      setHeaderHeight(el.offsetHeight + 1);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [language, isRTL, cityId, query, announcements.length, chips.length]);


  return (
    <div
      className={`min-h-screen bg-background overflow-x-hidden relative ${isRTL ? "rtl" : ""}`}
      style={{ paddingBottom: `calc(${MOBILE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))` }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-primary/50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>
      {/* Sticky top: Header + Search/City + Chips */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 border-b border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="px-4 sm:px-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className={`text-xl font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text ${isRTL ? "text-right" : "text-left"}`}>
                {activeTab === "buy-sell" ? t("بيع وشراء", "Buy & Sell") : t("شن تحتاج اليوم؟", "What do you need today?")}
              </div>
              <div className={`text-sm text-muted-foreground mt-0.5 ${isRTL ? "text-right" : "text-left"}`}>
                {activeTab === "buy-sell"
                  ? t("تصفح الإعلانات والعروض", "Browse listings and deals")
                  : t("ابحث وتواصل مباشرة", "Search and contact directly")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle className="h-10 w-10 rounded-xl bg-background/50 backdrop-blur-sm border border-border/60 hover:bg-background transition-all duration-300 shadow-sm" />
              <ThemeToggle className="h-10 w-10 rounded-xl bg-background/50 backdrop-blur-sm border border-border/60 hover:bg-background transition-all duration-300 shadow-sm" />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Notifications"
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: t("سجّل دخولك", "Sign in"),
                          description: t("سجّل دخولك لرؤية الإشعارات", "Sign in to view notifications"),
                        });
                      }
                    }}
                    className={cn(
                      "relative h-10 w-10 rounded-xl flex items-center justify-center",
                      "bg-background/50 backdrop-blur-sm border border-border/60",
                      "hover:bg-background hover:shadow-md transition-all duration-300",
                      "shadow-sm active:scale-95"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    {user && unreadCount && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                {user && (
                  <PopoverContent
                    align={isRTL ? "start" : "end"}
                    className="w-80 p-0 bg-popover border-border"
                  >
                    <div className="p-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{t("الإشعارات", "Notifications")}</h3>

                      {unreadCount && unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11 px-3 text-xs"
                          onClick={() => markAllAsRead.mutate()}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          {t("قراءة الكل", "Mark all read")}
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-80">
                      {!notifications || notifications.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">
                          {t("لا توجد إشعارات", "No notifications")}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 hover:bg-muted cursor-pointer transition-colors ${
                                !notification.is_read ? "bg-primary/10" : ""
                              }`}
                              onClick={() => {
                                if (!notification.is_read) {
                                  markAsRead.mutate(notification.id);
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {notification.message?.title || "Notification"}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {notification.message?.content}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>

                                {!notification.is_read && (
                                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                )}
              </Popover>
            </div>
          </div>

          {/* Search + City */}
          <div className="space-y-3">
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                      "h-10 px-3 rounded-xl shrink-0 justify-between gap-2 font-medium text-sm",
                      "bg-background/50 backdrop-blur-sm border border-border/60",
                      "hover:bg-background hover:shadow-md transition-all duration-300",
                      "shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary/60"></div>
                      <span className="max-w-[8rem] truncate">{cityLabel}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                  <div className="space-y-1 max-h-64 overflow-auto">
                    {(citiesData || [])
                      .filter((c) => c.is_active)
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((c) => (
                        <Button
                          key={c.id}
                          variant={cityId === c.id ? "default" : "ghost"}
                          className="w-full justify-start h-11"
                          onClick={() => setCityId(c.id)}
                        >
                          {c.name_ar || c.name}
                        </Button>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="relative flex-1 group">
                <div className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors ${isRTL ? "right-3" : "left-3"}`}>
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  value={activeTab === "buy-sell" ? buySellSearchQuery : query}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (activeTab === "buy-sell") setBuySellSearchQuery(v);
                    else setQuery(v);
                  }}
                  className={cn(
                    "h-10 rounded-xl pl-10 pr-10 text-sm",
                    "bg-background/50 backdrop-blur-sm border-border/60",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
                    "placeholder:text-muted-foreground/60 transition-all duration-300",
                    "shadow-sm hover:shadow-md focus:shadow-lg"
                  )}
                  placeholder={
                    activeTab === "buy-sell"
                      ? t("ابحث عن عرض...", "Search deals...")
                      : t("ابحث عن خدمة… كهرباء، سباكة، تكييف", "Search services… electricity, plumbing, AC")
                  }
                />

                {(activeTab === "buy-sell" ? buySellSearchQuery : query).trim() ? (
                  <button
                    type="button"
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
                      "hover:bg-destructive/10 hover:text-destructive flex items-center justify-center",
                      "transition-all duration-200 active:scale-95",
                      isRTL ? "left-2" : "right-2",
                    )}
                    onClick={() => {
                      if (activeTab === "buy-sell") setBuySellSearchQuery("");
                      else setQuery("");
                    }}
                    aria-label={t("مسح البحث", "Clear search")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {activeTab === "services" && activeAnnouncement && (
              <div className={`${HUB_CARD_BASE} bg-muted/30 px-4 py-3`}>
                <div className="text-sm text-muted-foreground">📢 📢 {activeAnnouncement.message}</div>
              </div>
            )}

            {/* Search Filters - shown when there's a search query (Services only) */}
            {activeTab === "services" && queryTrim && filteredCategories.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <SearchFilters
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  onReset={() => setSearchFilters({
                    priceRange: [0, 10000],
                    minRating: 0,
                    sortBy: "relevance",
                  })}
                />
                <div className="text-xs text-muted-foreground">
                  {t(`${filteredCategories.length} نتيجة`, `${filteredCategories.length} results`)}
                </div>
              </div>
            )}

            {/* Search results (category matches) */}
            {activeTab === "services" && queryTrim && (
              <Card className="rounded-2xl border-border/60">
                <CardContent className="p-2 space-y-1">
                {filteredCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">{t("لا توجد نتائج", "No results")}</div>
                ) : (
                  filteredCategories.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full justify-start h-11"
                      onClick={() => {
                        setQuery("");
                        navigate(`/services/category/${c.id}`);
                      }}
                    >
                      {c.name_ar || c.name}
                    </Button>
                  ))
                )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chips (admin-controlled, subcategories) - Services only */}
          {activeTab === "services" && chips.length > 0 && (
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2 px-2">
                {chips.map((chip) => {
                  const label = (language === "ar" ? chip.label_ar : chip.label_en) || chip.label_ar || chip.label_en || "";
                  if (!label) return null;
                  return (
                    <Button
                      key={chip.id}
                      variant="secondary"
                      className="rounded-full shrink-0 px-3 h-9 text-sm"
                      onClick={() => {
                        if (chip.target_type === "category" && chip.target_category_id) {
                          navigate(`/services/category/${chip.target_category_id}`);
                        } else if (chip.target_type === "subcategory" && chip.target_subcategory_id) {
                          const sc = (allSubcategories || []).find((s: any) => s.id === chip.target_subcategory_id) as { id: string; name: string; name_ar?: string | null; icon: string; color: string | null; category_id?: string } | undefined;
                          if (!sc) return;
                          const Icon = getCategoryIcon(sc.icon);
                          openSubcategoryProviders({ ...sc, icon: Icon });
                        } else if (chip.target_type === "shelf" && chip.target_shelf_id) {
                          const el = chip.target_shelf_id === "featured-services"
                            ? document.getElementById("featured-services")
                            : document.getElementById(`shelf-${chip.target_shelf_id}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            )}
          </div>

      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: headerHeight }} aria-hidden="true" />

      {/* Tab Switcher (only shown if buy/sell is enabled) */}
      {buySellEnabled && (
        <HubTabSwitcher
          activeTab={activeTab}
          onTabChange={handleTabChange}
          headerHeight={headerHeight}
        />
      )}

      {/* Everything below the fixed header scrolls normally */}
      {buySellEnabled && !servicesEnabled ? (
        /* Services hidden: show only Buy & Sell */
        <BuySellHubTab
          cityId={cityId}
          buySellMode={buySellMode}
          onBuySellModeChange={setBuySellMode}
          selectedBuySellCategory={selectedBuySellCategory}
          onCategoryChange={setSelectedBuySellCategory}
          buySellSearchQuery={buySellSearchQuery}
          onSearchChange={setBuySellSearchQuery}
          openListingDetail={openListingDetail}
          openDealDetail={openDealDetail}
          navigate={navigate}
        />
      ) : buySellEnabled && servicesEnabled ? (
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as "services" | "buy-sell")}>
          {/* BUY & SELL Tab (first/left) */}
          <TabsContent value="buy-sell" className="mt-0">
            <BuySellHubTab
              cityId={cityId}
              buySellMode={buySellMode}
              onBuySellModeChange={setBuySellMode}
              selectedBuySellCategory={selectedBuySellCategory}
              onCategoryChange={setSelectedBuySellCategory}
              buySellSearchQuery={buySellSearchQuery}
              onSearchChange={setBuySellSearchQuery}
              openListingDetail={openListingDetail}
              openDealDetail={openDealDetail}
              navigate={navigate}
            />
          </TabsContent>
          {/* SERVICES Tab (second/right) */}
          <TabsContent value="services" className="mt-0 space-y-6">
            <FeaturedHero
          banners={banners as any}
          publicUrlsById={publicUrlsById as any}
          allSubcategories={(allSubcategories || []) as any}
          iconMap={HUB_ICON_MAP as any}
          onOpenCategory={(id) => navigate(`/services/category/${id}`)}
          onOpenSubcategory={openSubcategoryProviders as any}
          onScrollToShelf={(shelfId) => {
            const el = shelfId === "featured-services"
              ? document.getElementById("featured-services")
              : document.getElementById(`shelf-${shelfId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          language={language === "ar" ? "ar" : "en"}
          isRTL={isRTL}
          fallbackTitle={t("خدمات موثوقة بالقرب منك", "Trusted services near you")}
          fallbackCta={t("استكشف", "Explore")}
          />

          <div className="px-4 space-y-10">
            {/* Services (MAIN categories) – 6 main cards, non-scrollable */}
            <AnimatedSection direction="up" delay={100}>
              <HubSection title={t("الخدمات", "Categories")} icon={LayoutGrid}>
                {categoriesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : categoriesError ? (
                  <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground`}>
                    {t("تعذر تحميل الأقسام. حاول مرة أخرى.", "Couldn't load categories. Please try again.")}
                  </div>
                ) : gridCategories.length === 0 ? (
                  <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground`}>
                    {t("لا توجد أقسام متاحة حالياً.", "No categories available right now.")}
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-2 md:grid-cols-3 gap-3"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {gridCategories.slice(0, 6).map((c) => (
                      <HubCategoryCard
                        key={c.id}
                        label={c.name}
                        labelAr={c.name_ar}
                        language={language === "ar" ? "ar" : "en"}
                        icon={getCategoryIcon(c.icon)}
                        color={c.color}
                        onClick={() => navigate(`/services/category/${c.id}`)}
                        subtitle={t("اضغط للبحث", "Browse")}
                      />
                    ))}
                  </div>
                )}
              </HubSection>
            </AnimatedSection>

          {/* Featured providers/services (horizontal) */}
          {featuredServices.length > 0 && (
            <AnimatedSection direction="up" delay={200}>
              <HubSection id="featured-providers" title={t("مزودين مميزين", "Featured providers")} icon={Star}>
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {featuredServicesChunks.filter(chunk => chunk.length > 0).map((chunk, chunkIndex) => (
                  <FeaturedProvidersCard
                    key={chunkIndex}
                    services={chunk}
                    ratings={ratingsMap}
                    isRTL={isRTL}
                    getContactState={getContactState}
                    onOpen={openServiceFromRow}
                    onCall={handleCall}
                    onWhatsApp={handleWhatsApp}
                    labels={labels}
                  />
                ))}
              </div>
              </HubSection>
            </AnimatedSection>
          )}

          {/* Featured services (subcategories) */}
          {featuredSubcats.length > 0 && (
            <AnimatedSection direction="up" delay={300}>
              <HubSection id="featured-services" title={t("الخدمات المميزة", "Featured services")} icon={Star}>
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className={HUB_CARD_ROW_4}
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {featuredSubcats.slice(0, 6).map((sc) => {
                  const Icon = getCategoryIcon(sc.icon);
                  return (
                    <button
                      key={sc.id}
                      className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card p-4 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                      onClick={() => openSubcategoryProviders({ ...sc, icon: Icon })}
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                        <div
                          className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: (sc.color || "#888") + "1f" }}
                        >
                          <Icon className="h-7 w-7 text-foreground" strokeWidth={2.1} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[15px] line-clamp-1">{sc.name_ar || sc.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {t("اضغط لعرض المزودين", "Tap to view providers")}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              </HubSection>
            </AnimatedSection>
          )}

          {/* Most demanded services (SYSTEM) */}
          <AnimatedSection direction="up" delay={500}>
            <HubSection
              id="most-demanded-services"
              title={t("الأكثر طلباً", "Most demanded")}
              icon={TrendingUp}
              actionLabel={t("المزيد", "More")}
              onAction={() => navigate("/services/trending")}
            >
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className={HUB_CARD_ROW_4}
              style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
            >
              {mostDemandedLoading && mostDemandedRows.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={`demanded-placeholder-${i}`} className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card overflow-hidden animate-pulse`}>
                      <div className="aspect-[4/3] bg-muted/50 rounded-t-xl" />
                      <div className="p-2.5 space-y-1">
                        <div className="h-3 bg-muted/50 rounded w-2/3" />
                        <div className="h-3 bg-muted/50 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                : mostDemandedRows.length === 0
                  ? (
                      <div className={`${HUB_CARD_BASE} bg-card p-6 text-center min-w-full`}>
                        <div className="font-semibold text-sm text-muted-foreground">{t("لا توجد بيانات بعد", "No data yet")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("سيظهر هذا القسم تلقائياً بعد تفاعل المستخدمين (مشاهدات/اتصالات)", "This will appear automatically once users interact (views/calls).")}
                        </div>
                      </div>
                    )
                  : mostDemandedRows.slice(0, 8).map((svc) => (
                      <div key={svc.id} className={HUB_CARD_SLOT_4}>
                        <HubItemCard
                          imageUrl={svc.image_url}
                          priceText={t("اتصل للسعر", "Price on request")}
                          location={[svc.city, svc.sub_city].filter(Boolean).join(" • ") || "—"}
                          subtitle={svc.title}
                          isRTL={isRTL}
                          onClick={() => openServiceFromRow(svc as ServiceRow)}
                        />
                      </div>
                    ))}
            </div>
            </HubSection>
          </AnimatedSection>

          {/* Recent Activity Feed */}
          <AnimatedSection direction="up" delay={600}>
            <HubSection id="activity-feed" title={t("النشاط الأخير", "Recent Activity")} icon={Heart}>
            <ActivityFeed
              cityId={cityId}
              cityName={selectedCityName}
              onOpenService={openServiceFromRow}
              onCall={handleCall}
              onWhatsApp={handleWhatsApp}
            />
            </HubSection>
          </AnimatedSection>

          {/* Tips before you call */}
          <AnimatedSection direction="up" delay={800}>
            <HubSection id="guides" title={t("نصائح قبل ما تتصل", "Tips before you call")} icon={BookOpen}>
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className={HUB_CARD_ROW_4}
              style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
            >
              {guidesLoading && guidesCards.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`guide-placeholder-${i}`}
                      className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-muted/30 min-h-[92px] p-3`}
                    >
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="mt-2 h-3 w-40 rounded bg-muted" />
                      <div className="mt-2 h-3 w-28 rounded bg-muted" />
                    </div>
                  ))
                : guidesCards.slice(0, 4).map((g) => (
                    <div key={g.id} className={HUB_CARD_SLOT_4}>
                      <TipChip
                        title={g.title}
                        line1={g.summaryLines[0]}
                        line2={g.summaryLines[1]}
                        Icon={g.icon}
                        onClick={() => openGuide(g.id)}
                        isRTL={isRTL}
                      />
                    </div>
                  ))}
            </div>
            </HubSection>
          </AnimatedSection>

          {/* Shelves (admin-controlled) */}
          <AnimatedSection direction="up" delay={900}>
            <div className="space-y-4">
            {shelves.map((shelf) => {
              const cityOk = true;
              if (!cityOk) return null;

              if (shelf.shelf_type === "category") {
                if (!shelf.category_id) return null;
                const cat = categoriesById[shelf.category_id];
                if (!cat) return null;
                const subcats = subcatsByShelfId[shelf.id] || [];
                if (subcats.length === 0) return null;

                return (
                  <HubSection
                    key={shelf.id}
                    id={`shelf-${shelf.id}`}
                    title={shelf.title_ar}
                    actionLabel={t("عرض الكل", "See all")}
                    onAction={() => navigate(`/services/category/${cat.id}`)}
                  >
                    <div
                      dir={isRTL ? "rtl" : "ltr"}
                      className={HUB_CARD_ROW_4}
                      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                    >
                      {subcats.map((sc) => (
                        <HubCategoryCard
                          key={sc.id}
                          label={sc.name}
                          labelAr={sc.name_ar}
                          language={language === "ar" ? "ar" : "en"}
                          icon={getCategoryIcon(sc.icon)}
                          color={sc.color}
                          onClick={() => openSubcategoryProviders({ ...sc, icon: getCategoryIcon(sc.icon) })}
                          subtitle={t("اضغط لعرض المزودين", "View providers")}
                          inScrollSlot
                        />
                      ))}
                    </div>
                  </HubSection>
                );
              }

              // Manual shelf: primarily curated *subcategories*.
              // Backward compatibility: if some rows still have category_id, we show category tiles.
              const items = itemsByShelf[shelf.id] || [];

              const subcats = (items
                .map((it) => {
                  const sid = (it as any).subcategory_id as string | null | undefined;
                  if (!sid) return null;
                  return (allSubcategories || []).find((s) => s.id === sid) || null;
                })
                .filter(Boolean) as any[]) as SubcategoryRow[];

              const catsFallback = items
                .map((it) => {
                  const cid = (it as any).category_id as string | null | undefined;
                  if (!cid) return null;
                  return categoriesById[cid] || null;
                })
                .filter(Boolean) as any[];

              if (subcats.length === 0 && catsFallback.length === 0) return null;

              return (
                <HubSection key={shelf.id} id={`shelf-${shelf.id}`} title={shelf.title_ar}>
                  <div
                    dir={isRTL ? "rtl" : "ltr"}
                    className={HUB_CARD_ROW_4}
                    style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                  >
                    {subcats.map((s) => (
                        <HubCategoryCard
                          key={s.id}
                          label={s.name}
                          labelAr={s.name_ar}
                          language={language === "ar" ? "ar" : "en"}
                          icon={getCategoryIcon(s.icon)}
                          color={s.color}
                          onClick={() => openSubcategoryProviders({ ...s, icon: getCategoryIcon(s.icon) })}
                          subtitle={t("اضغط لعرض المزودين", "View providers")}
                          inScrollSlot
                        />
                    ))}

                    {catsFallback.map((c) => (
                        <HubCategoryCard
                          key={c.id}
                          label={c.name}
                          labelAr={c.name_ar}
                          language={language === "ar" ? "ar" : "en"}
                          icon={getCategoryIcon(c.icon)}
                          color={c.color}
                          onClick={() => navigate(`/services/category/${c.id}`)}
                          subtitle={t("اضغط للبحث", "Browse")}
                          inScrollSlot
                        />
                    ))}
                  </div>
                </HubSection>
              );
            })}
            </div>
          </AnimatedSection>

          {/* Footer links */}
          <div className="pt-4 pb-2 border-t text-sm text-muted-foreground space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <a className="hover:text-foreground" href="/about">{t("من نحن", "About Us")}</a>
              <a className="hover:text-foreground" href="/help">{t("مركز المساعدة", "Help Center")}</a>
              <a className="hover:text-foreground" href="/become-provider">{t("انضم كمزود خدمة", "Become a Provider")}</a>
            </div>
            <div className="flex gap-4 text-xs">
              <a className="hover:text-foreground" href="/terms">{t("الشروط", "Terms")}</a>
              <a className="hover:text-foreground" href="/privacy">{t("الخصوصية", "Privacy")}</a>
            </div>
          </div>
          </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8">
          <FeaturedHero
            banners={banners as any}
            publicUrlsById={publicUrlsById as any}
            allSubcategories={(allSubcategories || []) as any}
            iconMap={HUB_ICON_MAP as any}
            onOpenCategory={(id) => navigate(`/services/category/${id}`)}
            onOpenSubcategory={openSubcategoryProviders as any}
            onScrollToShelf={(shelfId) => {
              const el = shelfId === "featured-services"
                ? document.getElementById("featured-services")
                : document.getElementById(`shelf-${shelfId}`);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            language={language === "ar" ? "ar" : "en"}
            isRTL={isRTL}
            fallbackTitle={t("خدمات موثوقة بالقرب منك", "Trusted services near you")}
            fallbackCta={t("استكشف", "Explore")}
          />

          <StatsBar />

          <div className="px-4 space-y-8">
            {/* Services (MAIN categories) – 6 main cards, non-scrollable */}
            <AnimatedSection direction="up" delay={100}>
              <HubSection title={t("الخدمات", "Categories")} icon={LayoutGrid}>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : categoriesError ? (
                <div className={`${HUB_CARD_BASE} bg-card p-6 text-center`}>
                  <div className="text-muted-foreground mb-2">
                    <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("تعذر تحميل الأقسام. حاول مرة أخرى.", "Couldn't load categories. Please try again.")}
                  </div>
                </div>
              ) : gridCategories.length === 0 ? (
                <div className={`${HUB_CARD_BASE} bg-card p-6 text-center`}>
                  <div className="text-muted-foreground mb-2">
                    <svg className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("لا توجد أقسام متاحة حالياً.", "No categories available right now.")}
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 md:grid-cols-3 gap-3"
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  {gridCategories.slice(0, 6).map((c) => (
                    <HubCategoryCard
                      key={c.id}
                      label={c.name}
                      labelAr={c.name_ar}
                      language={language === "ar" ? "ar" : "en"}
                      icon={getCategoryIcon(c.icon)}
                      color={c.color}
                      onClick={() => navigate(`/services/category/${c.id}`)}
                      subtitle={t("اضغط للبحث", "Browse")}
                    />
                  ))}
                </div>
              )}
              </HubSection>
            </AnimatedSection>

            {/* Featured providers/services (horizontal) */}
            {featuredServices.length > 0 && (
              <AnimatedSection direction="up" delay={200}>
                <HubSection id="featured-providers" title={t("مزودين مميزين", "Featured providers")} icon={Star}>
                <div className="relative">
                  <div
                    dir={isRTL ? "rtl" : "ltr"}
                    className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory scroll-smooth"
                    style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                  >
                    {featuredServicesChunks.filter(chunk => chunk.length > 0).map((chunk, chunkIndex) => (
                      <FeaturedProvidersCard
                        key={chunkIndex}
                        services={chunk}
                        ratings={ratingsMap}
                        isRTL={isRTL}
                        getContactState={getContactState}
                        onOpen={openServiceFromRow}
                        onCall={handleCall}
                        onWhatsApp={handleWhatsApp}
                        labels={labels}
                      />
                    ))}
                  </div>
                  {/* Gradient fade effect */}
                  <div className="absolute top-0 bottom-4 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                </div>
                </HubSection>
              </AnimatedSection>
            )}

            {/* Featured services (subcategories) */}
            {featuredSubcats.length > 0 && (
              <AnimatedSection direction="up" delay={300}>
                <HubSection id="featured-services" title={t("الخدمات المميزة", "Featured services")} icon={Star}>
                <div className="relative">
                  <div
                    dir={isRTL ? "rtl" : "ltr"}
                    className={HUB_CARD_ROW_4}
                    style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                  >
                    {featuredSubcats.slice(0, 6).map((sc) => {
                      const Icon = getCategoryIcon(sc.icon);
                      return (
                        <button
                          key={sc.id}
                          className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card p-5 text-left group`}
                          onClick={() => openSubcategoryProviders({ ...sc, icon: Icon })}
                        >
                          <div className={`flex items-center gap-4 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
                            <div
                              className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105"
                              style={{ backgroundColor: (sc.color || "#888") + "15" }}
                            >
                              <Icon className="h-8 w-8 text-foreground group-hover:scale-110 transition-transform duration-300" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">{sc.name_ar || sc.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1 mt-1 group-hover:text-muted-foreground/80 transition-colors">
                                {t("اضغط لعرض المزودين", "Tap to view providers")}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Gradient fade effect */}
                  <div className="absolute top-0 bottom-4 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                </div>
                </HubSection>
              </AnimatedSection>
            )}

            {/* Most demanded services (SYSTEM) */}
            <AnimatedSection direction="up" delay={500}>
              <HubSection
                id="most-demanded-services"
                title={t("الأكثر طلباً", "Most demanded")}
                icon={TrendingUp}
                actionLabel={t("المزيد", "More")}
                onAction={() => navigate("/services/trending")}
              >
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className={HUB_CARD_ROW_4}
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {mostDemandedLoading && mostDemandedRows.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={`demanded-placeholder-${i}`} className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card overflow-hidden animate-pulse`}>
                        <div className="aspect-[4/3] bg-muted/50 rounded-t-xl" />
                        <div className="p-2.5 space-y-1">
                          <div className="h-3 bg-muted/50 rounded w-2/3" />
                          <div className="h-3 bg-muted/50 rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  : mostDemandedRows.length === 0
                    ? (
                        <div className={`${HUB_CARD_BASE} bg-card p-6 text-center min-w-full`}>
                          <div className="font-semibold text-sm text-muted-foreground">{t("لا توجد بيانات بعد", "No data yet")}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t("سيظهر هذا القسم تلقائياً بعد تفاعل المستخدمين (مشاهدات/اتصالات)", "This will appear automatically once users interact (views/calls).")}
                          </div>
                        </div>
                      )
                    : mostDemandedRows.slice(0, 8).map((svc) => (
                        <div key={svc.id} className={HUB_CARD_SLOT_4}>
                          <HubItemCard
                            imageUrl={svc.image_url}
                            priceText={t("اتصل للسعر", "Price on request")}
                            location={[svc.city, svc.sub_city].filter(Boolean).join(" • ") || "—"}
                            subtitle={svc.title}
                            isRTL={isRTL}
                            onClick={() => openServiceFromRow(svc as ServiceRow)}
                          />
                        </div>
                      ))}
              </div>
              </HubSection>
            </AnimatedSection>

            {/* Popular Services Showcase */}
            <AnimatedSection direction="up" delay={550}>
              <HubSection id="popular-showcase" title={t("خدمات مميزة", "Popular Services")} icon={Award}>
                {featuredServices.length === 0 ? (
                  <div className={`${HUB_CARD_BASE} bg-card p-6 flex flex-col items-center justify-center gap-3 text-center`}>
                    <Award className="h-10 w-10 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">{t("لا توجد خدمات مميزة حالياً", "No featured services available right now")}</p>
                  </div>
                ) : (
                  <div
                    dir={isRTL ? "rtl" : "ltr"}
                    className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4"
                    style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y", scrollSnapType: "x mandatory" }}
                  >
                    {chunkArray(featuredServices.slice(0, 8), 4).map((chunk, chunkIndex) => (
                      <ServiceCardGroup
                        key={`chunk-${chunkIndex}`}
                        services={chunk}
                        ratings={ratingsMap}
                        isRTL={isRTL}
                        onOpen={openServiceFromRow}
                        labels={labels}
                      />
                    ))}
                  </div>
                )}
              </HubSection>
            </AnimatedSection>

            {/* Recent Activity Feed */}
            <AnimatedSection direction="up" delay={650}>
              <HubSection id="activity-feed" title={t("النشاط الأخير", "Recent Activity")} icon={Heart}>
              <ActivityFeed
                cityId={cityId}
                cityName={selectedCityName}
                onOpenService={openServiceFromRow}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
              />
              </HubSection>
            </AnimatedSection>

            {/* Tips before you call */}
            <AnimatedSection direction="up" delay={850}>
              <HubSection id="guides" title={t("نصائح قبل ما تتصل", "Tips before you call")} icon={BookOpen}>
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className={HUB_CARD_ROW_4}
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {guidesLoading && guidesCards.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={`guide-placeholder-${i}`}
                        className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-muted/30 min-h-[92px] p-3`}
                      >
                        <div className="h-4 w-32 rounded bg-muted" />
                        <div className="mt-2 h-3 w-40 rounded bg-muted" />
                        <div className="mt-2 h-3 w-28 rounded bg-muted" />
                      </div>
                    ))
                  : guidesCards.slice(0, 4).map((g) => (
                      <div key={g.id} className={HUB_CARD_SLOT_4}>
                        <TipChip
                          title={g.title}
                          line1={g.summaryLines[0]}
                          line2={g.summaryLines[1]}
                          Icon={g.icon}
                          onClick={() => openGuide(g.id)}
                          isRTL={isRTL}
                        />
                      </div>
                    ))}
              </div>
              </HubSection>
            </AnimatedSection>

            {/* Shelves (admin-controlled) */}
            <AnimatedSection direction="up" delay={900}>
              <div className="space-y-4">
              {shelves.map((shelf) => {
                const cityOk = true;
                if (!cityOk) return null;

                if (shelf.shelf_type === "category") {
                  if (!shelf.category_id) return null;
                  const cat = categoriesById[shelf.category_id];
                  if (!cat) return null;
                  const subcats = subcatsByShelfId[shelf.id] || [];
                  if (subcats.length === 0) return null;

                  return (
                    <HubSection
                      key={shelf.id}
                      id={`shelf-${shelf.id}`}
                      title={shelf.title_ar}
                      actionLabel={t("عرض الكل", "View All")}
                      onAction={() => navigate(`/services/category/${cat.id}`)}
                    >
                      <div
                        dir={isRTL ? "rtl" : "ltr"}
                        className={HUB_CARD_ROW_4}
                        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                      >
                        {subcats.map((sc) => (
                          <HubCategoryCard
                            key={sc.id}
                            label={sc.name}
                            labelAr={sc.name_ar}
                            language={language === "ar" ? "ar" : "en"}
                            icon={getCategoryIcon(sc.icon)}
                            color={sc.color}
                            onClick={() => openSubcategoryProviders({ ...sc, icon: getCategoryIcon(sc.icon) })}
                            subtitle={t("اضغط لعرض المزودين", "View providers")}
                            inScrollSlot
                          />
                        ))}
                      </div>
                    </HubSection>
                  );
                }

                const items = itemsByShelf[shelf.id] || [];
                const subcats = (items
                  .map((it) => {
                    const sid = (it as any).subcategory_id as string | null | undefined;
                    if (!sid) return null;
                    return (allSubcategories || []).find((s) => s.id === sid) || null;
                  })
                  .filter(Boolean) as any[]) as SubcategoryRow[];

                const catsFallback = items
                  .map((it) => {
                    const cid = (it as any).category_id as string | null | undefined;
                    if (!cid) return null;
                    return categoriesById[cid] || null;
                  })
                  .filter(Boolean) as any[];

                if (subcats.length === 0 && catsFallback.length === 0) return null;

                return (
                  <HubSection key={shelf.id} id={`shelf-${shelf.id}`} title={shelf.title_ar}>
                    <div
                      dir={isRTL ? "rtl" : "ltr"}
                      className={HUB_CARD_ROW_4}
                      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                    >
                      {subcats.map((s) => (
                        <HubCategoryCard
                          key={s.id}
                          label={s.name}
                          labelAr={s.name_ar}
                          language={language === "ar" ? "ar" : "en"}
                          icon={getCategoryIcon(s.icon)}
                          color={s.color}
                          onClick={() => openSubcategoryProviders({ ...s, icon: getCategoryIcon(s.icon) })}
                          subtitle={t("اضغط لعرض المزودين", "View providers")}
                          inScrollSlot
                        />
                      ))}

                      {catsFallback.map((c) => (
                        <HubCategoryCard
                          key={c.id}
                          label={c.name}
                          labelAr={c.name_ar}
                          language={language === "ar" ? "ar" : "en"}
                          icon={getCategoryIcon(c.icon)}
                          color={c.color}
                          onClick={() => navigate(`/services/category/${c.id}`)}
                          subtitle={t("اضغط للبحث", "Browse")}
                          inScrollSlot
                        />
                      ))}
                    </div>
                  </HubSection>
                );
              })}
              </div>
            </AnimatedSection>

            {/* Footer links */}
            <div className="pt-4 pb-2 border-t text-sm text-muted-foreground space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <a className="hover:text-foreground" href="/about">{t("من نحن", "About Us")}</a>
              <a className="hover:text-foreground" href="/help">{t("مركز المساعدة", "Help Center")}</a>
                <a className="hover:text-foreground" href="/become-provider">{t("انضم كمزود خدمة", "Become a Provider")}</a>
              </div>
              <div className="flex gap-4 text-xs">
                <a className="hover:text-foreground" href="/terms">{t("الشروط", "Terms")}</a>
                <a className="hover:text-foreground" href="/privacy">{t("الخصوصية", "Privacy")}</a>
              </div>
            </div>
          </div>
        </div>
      )}

      <ListingDetailSheet
        open={listingSheetOpen}
        listing={selectedListing}
        onOpenChange={(open) => {
          setListingSheetOpen(open);
          if (!open) setSelectedListing(null);
        }}
        onSelectListing={(l) => {
          setSelectedListing(l);
          setListingSheetOpen(true);
        }}
      />

      {/* ListingListSheet (for deal card clicks) */}
      <ListingListSheet
        open={listingListSheetOpen}
        onOpenChange={(open) => {
          setListingListSheetOpen(open);
          if (!open) {
            setListingListCategory(null);
            setListingListSearch(null);
          }
        }}
        cityId={cityId}
        category={listingListCategory}
        search={listingListSearch}
        onSelectListing={openListingDetail}
      />

      {/* Buy/Sell Category Drawer */}
      {selectedCategoryForDrawer && (() => {
        const category = BUY_SELL_CATEGORIES.find(c => c.id === selectedCategoryForDrawer);
        return (
          <BuySellCategoryDrawer
            open={buySellCategoryDrawerOpen}
            onOpenChange={(open) => {
              setBuySellCategoryDrawerOpen(open);
              if (!open) {
                setSelectedCategoryForDrawer(null);
              }
            }}
            categoryId={selectedCategoryForDrawer}
            categoryName={category?.name}
            categoryNameAr={category?.nameAr}
            cityId={cityId}
            onListingClick={openListingDetail}
          />
        );
      })()}

      {/* Floating CTA (Buy/Sell listings) */}
      {activeTab === "buy-sell" && (buySellMode === "all" || buySellMode === "listings") ? (
        <button
          type="button"
          onClick={() => navigate("/buy-sell/create-listing")}
          className={cn(
            "fixed z-50 rounded-full shadow-lg bg-primary text-primary-foreground h-14 px-5 flex items-center gap-2 font-semibold",
            isRTL ? "left-4" : "right-4",
            "hover:scale-105 active:scale-95 transition-all duration-300",
            "ring-4 ring-primary/20 hover:ring-primary/30"
          )}
          style={{ bottom: `calc(${MOBILE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 8px)` }}
        >
          <Tag className="h-5 w-5" />
          {t("بيع الآن", "Sell")}
        </button>
      ) : null}

      {/* Quick Access Floating Button (Services Tab) */}
      {activeTab === "services" && (
        <div
          className={cn("fixed z-40 flex flex-col gap-3", isRTL ? "left-4" : "right-4")}
          style={{ bottom: `calc(${MOBILE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 8px)` }}
        >
          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => {
              const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
              searchInput?.focus();
              searchInput?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className={cn(
              "w-12 h-12 rounded-full shadow-lg flex items-center justify-center",
              "bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300",
              "hover:scale-110 active:scale-95 ring-4 ring-primary/20 hover:ring-primary/40"
            )}
            title={t("بحث سريع", "Quick Search")}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Deal Detail Sheet - kept for potential future use, but deals now open ListingListSheet */}
      <DealDetailSheet
        open={dealSheetOpen}
        onOpenChange={(open) => {
          setDealSheetOpen(open);
          if (!open) {
            setSelectedDeal(null);
          }
        }}
        deal={selectedDeal}
      />

      {activeSheet === "browse" && (
        <CategoryBrowseSheet
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveSheet("none");
              setBrowseCategoryId(null);
            }
          }}
          category={browseCategory}
          iconMap={HUB_ICON_MAP}
          onSelectSubcategory={(subcat) => {
            const cid = browseCategoryId;
            setActiveSheet("none");
            setBrowseCategoryId(null);
            if (cid && (subcat as { id?: string }).id) {
              navigate(`/services/category/${cid}?sub=${(subcat as { id: string }).id}`);
            }
          }}
        />
      )}

      {/* Quick View Modal */}
      {quickViewService && (
        <ServiceQuickView
          service={quickViewService}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          onCall={() => {
            if (quickViewService) handleCall(quickViewService);
          }}
          onWhatsApp={() => {
            if (quickViewService) handleWhatsApp(quickViewService);
          }}
          onViewFull={handleQuickViewFull}
          canCall={quickViewService ? getContactState(quickViewService).canCall : false}
          canWhatsApp={quickViewService ? getContactState(quickViewService).canWhatsApp : false}
        />
      )}

      {activeSheet === "guide" && activeGuide && (
        <Drawer
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveSheet("none");
              setActiveGuideId(null);
            }
          }}
        >
          <DrawerContent>
            <DrawerHeader className={isRTL ? "text-right" : "text-left"} dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex items-start justify-between gap-3">
                <DrawerTitle className="text-base">{activeGuide.title}</DrawerTitle>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-11 w-11 rounded-full hover:bg-muted transition flex items-center justify-center"
                  onClick={() => {
                    setActiveSheet("none");
                    setActiveGuideId(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DrawerHeader>

            <div className="px-4 pb-6" dir={isRTL ? "rtl" : "ltr"}>
              <ul className="space-y-2 text-sm">
                {activeGuide.bullets.slice(0, 6).map((b, idx) => (
                  <li key={`${activeGuide.id}-b-${idx}`} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 shrink-0" />
                    <span className="text-foreground/90 leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <MobileNav />
    </div>
  );
}
