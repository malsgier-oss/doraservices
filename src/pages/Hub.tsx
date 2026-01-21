// DORA_HUB_PATCH_v4 (ticker+banner-loop+no-all-cities+sticky-fullwidth)
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bell, CheckCheck, ChevronDown, Search, Wrench, Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper, Droplets, Wind, Fuel, ClipboardCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { FeaturedHero } from "@/components/hub/FeaturedHero";
import { HubSection } from "@/components/hub/HubSection";
import { ServiceCardFeatured } from "@/components/hub/ServiceCardFeatured";
import { ServiceCardCompact } from "@/components/hub/ServiceCardCompact";
import { TipChip } from "@/components/hub/TipChip";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

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
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useUnreadCount, useNotificationMutations } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
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



export default function Hub() {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

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
      const Icon = ICON_MAP[String(r.icon_key || "")] || ClipboardCheck;
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

  const subcatByName = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      name_ar?: string | null;
      icon: LucideIcon;
      color: string | null;
    }>();

    const keyOf = (v: string) => String(v || "").trim().toLowerCase();

    for (const sc of (allSubcategories || []) as any[]) {
      const name = String(sc?.name || "").trim();
      const nameAr = String(sc?.name_ar || "").trim();
      if (!name && !nameAr) continue;
      const iconKey = String(sc?.icon || "");
      const icon = ICON_MAP[iconKey] || Wrench;

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
    return map;
  }, [allSubcategories]);

  useEffect(() => {
    let alive = true;

    const escOrValue = (v: string) => {
      const escaped = v.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
      return `"${escaped}"`;
    };

    const loadFeatured = async () => {
      try {
        // Base featured query
        let q = supabase
          .from("services")
          .select("id,title,category,provider_name,provider_phone,allow_whatsapp,city,sub_city,image_url")
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

  // 2) Provider list sheet (for a selected subcategory)
  const serviceSheetOpen = activeSheet === "providers";
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    id: string;
    name: string;
    name_ar?: string | null;
    icon: LucideIcon;
    color: string | null;
  } | null>(null);

  const selectedSheetService = useMemo(() => {
    if (!selectedSubcategory) return null;
    // Normalize category value: trim whitespace to match exactly what's stored in services.category
    const normalizedCategory = (selectedSubcategory.name || "").trim();
    return {
      id: selectedSubcategory.id,
      titleKey: selectedSubcategory.name_ar || selectedSubcategory.name,
      descKey: "",
      // IMPORTANT: ServiceDetailSheet filters services.category by this value.
      // Must match exactly what's saved in services.category (subcategory.name from ServiceCreator).
      category: normalizedCategory,
      categoryName: selectedSubcategory.name,
      categoryNameAr: selectedSubcategory.name_ar || undefined,
      color: selectedSubcategory.color || "#888888",
      icon: selectedSubcategory.icon,
    };
  }, [selectedSubcategory]);

  function openSubcategoryProviders(subcat: { id: string; name: string; name_ar?: string | null; icon: LucideIcon; color: string | null }, providerServiceId?: string | null) {
    // DEV: Log subcategory being opened
    if (import.meta.env?.DEV || import.meta.env?.MODE === "development") {
      console.log("[Hub] Opening subcategory:", {
        id: subcat.id,
        name: subcat.name,
        name_ar: subcat.name_ar || "(none)",
        cityId: cityId || "(none)",
        cityName: selectedCityName || "(none)",
      });
    }
    setSelectedSubcategory(subcat);
    setInitialProviderServiceId(providerServiceId || null);
    setActiveSheet("providers");
  }

  const openServiceFromRow = (service: ServiceRow) => {
    const subcat = subcatByName.get(String(service.category || "").trim().toLowerCase());
    if (!subcat) {
      toast({
        title: t("تعذر فتح الخدمة", "Could not open"),
        description: t("هذه الخدمة غير مرتبطة بتصنيف معروف", "This service category is not linked to a known subcategory"),
        variant: "destructive",
      });
      return;
    }
    openSubcategoryProviders(subcat, service.id);
  };

  // When selecting a subcategory from the browse sheet, we must close/unmount the browse Drawer
  // before mounting the provider Drawer. Otherwise mobile browsers can crash.
  const [pendingSubcategory, setPendingSubcategory] = useState<{
    id: string;
    name: string;
    name_ar?: string | null;
    icon: LucideIcon;
    color: string | null;
  } | null>(null);

  useEffect(() => {
    if (activeSheet !== "none") return;
    if (!pendingSubcategory) return;

    // Browse sheet is unmounted now; safe to open providers.
    openSubcategoryProviders(pendingSubcategory);
    setPendingSubcategory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSheet, pendingSubcategory]);

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
    window.open(telLink, "_self");
  };

  const handleWhatsApp = (service: ServiceRow) => {
    const { waLink, allowWhatsapp } = getContactState(service);
    if (waLink === "https://wa.me/" || !allowWhatsapp) {
      toast({ title: t("واتساب غير متوفر", "WhatsApp not available"), variant: "destructive" });
      return;
    }
    void trackProviderEvent(service.id, "whatsapp");
    window.open(waLink, "_blank");
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
    <div className={`min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-x-hidden ${isRTL ? "rtl" : ""}`}>
      {/* Sticky top: Header + Search/City + Chips */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="px-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-xl font-semibold leading-tight ${isRTL ? "text-right" : "text-left"}`}>{t("شن تحتاج اليوم؟", "What do you need today?")}</div>
              <div className={`text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}>{t("ابحث وتواصل مباشرة", "Search and contact directly")}</div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle className="h-11 w-11" />
              <ThemeToggle className="h-11 w-11" />
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
                    className="relative h-11 w-11 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
                  >
                    <Bell className="h-5 w-5" />
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
            {/* Option 1: City inside search row */}
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 px-3 rounded-xl shrink-0 justify-between gap-2"
                  >
                    <span className="max-w-[7.5rem] truncate">{cityLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
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

              <div className="relative flex-1">
                <Search
                  className={`absolute top-3.5 h-4 w-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`${isRTL ? "pr-9" : "pl-9"} h-11 rounded-xl`}
                  placeholder={t("ابحث عن خدمة… كهرباء، سباكة، تكييف", "Search services… electricity, plumbing, AC")}
                />
              </div>
            </div>

            {activeAnnouncement && (
              <div className={`${HUB_CARD_BASE} bg-muted/30 px-4 py-3`}>
                <div className="text-sm text-muted-foreground">📢 📢 {activeAnnouncement.message}</div>
              </div>
            )}

            {/* Search results (category matches) */}
            {queryTrim && (
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
                        openCategoryBrowse(c.id);
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

          {/* Chips (admin-controlled, subcategories) */}
          {chips.length > 0 && (
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-3 px-2">
                {chips.map((chip) => {
                  const label = (language === "ar" ? chip.label_ar : chip.label_en) || chip.label_ar || chip.label_en || "";
                  if (!label) return null;
                  return (
                    <Button
                      key={chip.id}
                      variant="secondary"
                      className="rounded-full shrink-0 px-4 h-11"
                      onClick={() => {
                        if (chip.target_type === "category" && chip.target_category_id) {
                          openCategoryBrowse(chip.target_category_id);
                        } else if (chip.target_type === "subcategory" && chip.target_subcategory_id) {
                          const sc = (allSubcategories || []).find((s) => s.id === chip.target_subcategory_id);
                          if (!sc) return;
                          const Icon = ICON_MAP[sc.icon] || Wrench;
                          openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color });
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

      {/* Everything below the fixed header scrolls normally */}
      <div className="space-y-4">
        <FeaturedHero
          banners={banners as any}
          publicUrlsById={publicUrlsById as any}
          allSubcategories={(allSubcategories || []) as any}
          iconMap={ICON_MAP as any}
          onOpenCategory={openCategoryBrowse}
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

        <div className="px-4 space-y-4">
          {/* Services (MAIN categories) grid - exactly 8 */}
          <HubSection title={t("الخدمات", "Categories")}>
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
              <div className="grid grid-cols-4 gap-4">
                {gridCategories.map((c) => {
                  const Icon = ICON_MAP[c.icon] || Wrench;
                  return (
                    <button
                      key={c.id}
                      className={`${HUB_CARD_BASE} bg-card min-h-[112px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                      onClick={() => openCategoryBrowse(c.id)}
                    >
                      <div
                        className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: (c.color || "#888") + "1f" }}
                      >
                        <Icon className="h-7 w-7 text-foreground" strokeWidth={2.2} />
                      </div>
                      <div className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                        {c.name_ar || c.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </HubSection>

          {/* Featured providers/services (horizontal) */}
          {featuredServices.length > 0 && (
            <HubSection id="featured-providers" title={t("مزودين مميزين", "Featured providers")}>
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {featuredServices.map((service) => {
                  const contact = getContactState(service);
                  return (
                    <div key={service.id} className="shrink-0 w-[82vw] max-w-[360px] snap-center">
                      <ServiceCardFeatured
                        service={service}
                        rating={getRating(service.id)}
                        isRTL={isRTL}
                        canCall={contact.canCall}
                        canWhatsApp={contact.canWhatsApp}
                        onOpen={() => openServiceFromRow(service)}
                        onCall={() => handleCall(service)}
                        onWhatsApp={() => handleWhatsApp(service)}
                        labels={labels}
                      />
                    </div>
                  );
                })}
              </div>
            </HubSection>
          )}

          {/* Featured services (subcategories) */}
          {featuredSubcats.length > 0 && (
            <HubSection id="featured-services" title={t("الخدمات المميزة", "Featured services")}>
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
              >
                {featuredSubcats.slice(0, 6).map((sc) => {
                  const Icon = ICON_MAP[sc.icon] || Wrench;
                  return (
                    <button
                      key={sc.id}
                      className={`${HUB_CARD_BASE} bg-card shrink-0 w-[66vw] max-w-[320px] snap-center p-4 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                      onClick={() => openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color })}
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
          )}

          {/* Most demanded services (SYSTEM) */}
          <HubSection id="most-demanded-services" title={t("الأكثر طلباً", "Most demanded")}>
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
            >
              {mostDemandedLoading && mostDemandedRows.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`demanded-placeholder-${i}`}
                      className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center overflow-hidden`}
                    >
                      <div className="aspect-[4/3] bg-muted" />
                      <div className="p-3">
                        <div className="h-4 w-36 rounded bg-muted" />
                        <div className="mt-2 h-3 w-44 rounded bg-muted" />
                        <div className="mt-2 h-3 w-32 rounded bg-muted" />
                      </div>
                    </div>
                  ))
                : mostDemandedRows.length === 0
                  ? (
                      <div className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] snap-center p-4`}>
                        <div className="font-semibold text-sm">{t("لا توجد بيانات بعد", "No data yet")}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("سيظهر هذا القسم تلقائياً بعد تفاعل المستخدمين (مشاهدات/اتصالات)", "This will appear automatically once users interact (views/calls).")}
                        </div>
                      </div>
                    )
                  : mostDemandedRows.slice(0, 6).map((service) => {
                      const contact = getContactState(service);
                      return (
                        <div key={service.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                          <ServiceCardCompact
                            service={service}
                            rating={getRating(service.id)}
                            isRTL={isRTL}
                            canCall={contact.canCall}
                            canWhatsApp={contact.canWhatsApp}
                            onOpen={() => openServiceFromRow(service)}
                            onCall={() => handleCall(service)}
                            onWhatsApp={() => handleWhatsApp(service)}
                            labels={labels}
                          />
                        </div>
                      );
                    })}
            </div>
          </HubSection>

          {/* Tips before you call */}
          <HubSection id="guides" title={t("نصائح قبل ما تتصل", "Tips before you call")}>
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
            >
              {guidesLoading && guidesCards.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`guide-placeholder-${i}`}
                      className={`${HUB_CARD_BASE} bg-muted/30 shrink-0 w-[64vw] max-w-[280px] min-h-[92px] snap-center p-3`}
                    >
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="mt-2 h-3 w-40 rounded bg-muted" />
                      <div className="mt-2 h-3 w-28 rounded bg-muted" />
                    </div>
                  ))
                : guidesCards.slice(0, 4).map((g) => (
                    <TipChip
                      key={g.id}
                      title={g.title}
                      line1={g.summaryLines[0]}
                      line2={g.summaryLines[1]}
                      Icon={g.icon}
                      onClick={() => openGuide(g.id)}
                      isRTL={isRTL}
                    />
                  ))}
            </div>
          </HubSection>

          {/* Shelves (admin-controlled) */}
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
                    onAction={() => openCategoryBrowse(cat.id)}
                  >
                    <div
                      dir={isRTL ? "rtl" : "ltr"}
                      className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                      style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                    >
                      {subcats.map((sc) => {
                        const Icon = ICON_MAP[sc.icon] || Wrench;
                        return (
                          <button
                            key={sc.id}
                          className={`${HUB_CARD_BASE} bg-card shrink-0 w-[44%] md:w-[28%] min-h-[112px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                            style={{ scrollSnapAlign: "start" }}
                            onClick={() => openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color })}
                          >
                            <div
                            className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: (sc.color || "#888") + "1f" }}
                            >
                            <Icon className="h-7 w-7 text-foreground" strokeWidth={2.1} />
                            </div>
                          <div className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                            {sc.name_ar || sc.name}
                          </div>
                          </button>
                        );
                      })}
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
                    className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                    style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
                  >
                    {subcats.map((s) => {
                      const Icon = ICON_MAP[s.icon] || Wrench;
                      return (
                        <button
                          key={s.id}
                          className={`${HUB_CARD_BASE} bg-card shrink-0 w-[34%] md:w-[22%] min-h-[112px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                          style={{ scrollSnapAlign: "start" }}
                          onClick={() => openSubcategoryProviders({ id: s.id, name: s.name, name_ar: s.name_ar, icon: Icon, color: s.color })}
                        >
                          <div
                            className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: (s.color || "#888") + "1f" }}
                          >
                            <Icon className="h-7 w-7 text-foreground" strokeWidth={2.1} />
                          </div>
                          <div className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                            {s.name_ar || s.name}
                          </div>
                        </button>
                      );
                    })}

                    {catsFallback.map((c) => {
                      const Icon = ICON_MAP[c.icon] || Wrench;
                      return (
                        <button
                          key={c.id}
                          className={`${HUB_CARD_BASE} bg-card shrink-0 w-[34%] md:w-[22%] min-h-[112px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                          style={{ scrollSnapAlign: "start" }}
                          onClick={() => openCategoryBrowse(c.id)}
                        >
                          <div
                            className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: (c.color || "#888") + "1f" }}
                          >
                            <Icon className="h-7 w-7 text-foreground" strokeWidth={2.1} />
                          </div>
                          <div className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
                            {c.name_ar || c.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </HubSection>
              );
            })}
          </div>

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
          iconMap={ICON_MAP}
          onSelectSubcategory={(subcat) => {
            // Close/unmount browse sheet first; provider sheet opens via pendingSubcategory effect.
            setPendingSubcategory(subcat);
            setActiveSheet("none");
            setBrowseCategoryId(null);
          }}
        />
      )}

      {activeSheet === "providers" && selectedSheetService && (
        <SafeBoundary
          onError={(err) => {
            console.error("ServiceDetailSheet crashed:", err);
            toast({
              title: t("تعذر فتح التفاصيل", "Could not open details"),
              description: t(
                "حدث خطأ أثناء فتح تفاصيل الخدمة. تم إغلاق النافذة لتجنب تعليق التطبيق.",
                "An error occurred while opening details. The sheet was closed to keep the app stable."
              ),
              variant: "destructive",
            });
            setActiveSheet("none");
            setInitialProviderServiceId(null);
          }}
        >
          <ServiceDetailSheet
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setActiveSheet("none");
                setInitialProviderServiceId(null);
              }
            }}
            city={selectedCityName}
            service={selectedSheetService}
            initialProviderServiceId={initialProviderServiceId}
          />
        </SafeBoundary>
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
