import { useMemo, useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Star,
  MapPin,
  Hammer,
  Paintbrush,
  Battery,
  Calculator,
  Sparkles,
  ChevronRight,
  LucideIcon,
  Bell,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import {
  ActiveFilterChips,
  SearchFiltersState,
} from "@/components/search/SearchFilters";
import { ReviewPromptBanner } from "@/components/review/ReviewPromptBanner";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useServiceRatings } from "@/hooks/useReviews";

// ✅ Notifications hooks (same system used elsewhere)
import {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
} from "@/hooks/useNotifications";
import type { Notification } from "@/hooks/useNotifications";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Icon mapping for dynamic icons from database
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
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Hammer,
  Paintbrush,
  Battery,
  Calculator,
  Sparkles,
};

interface ServiceItem {
  id: string; // subcategory id
  icon: LucideIcon;
  color: string;
  name: string;
  name_ar: string | null;
  category_id: string;
  is_popular?: boolean;
  popular_order?: number | null;
}

type FeaturedProviderCard = {
  service_id: string; // services.id
  category: string; // services.category
  service_title: string;
  provider_name: string;
  provider_phone: string;
  provider_avatar: string | null;
  provider_city: string | null;
  provider_sub_city: string | null;

  // IMPORTANT: to open ServiceDetailSheet correctly, we need subcategory id
  subcategory_id: string | null;
};

type DoraSuggestion = {
  id: string;
  title_en: string;
  title_ar: string;
  hint_en: string;
  hint_ar: string;
  match_en: string[];
  match_ar: string[];
  icon?: LucideIcon;
};

// Suggested by Dora
const DORA_SUGGESTIONS: DoraSuggestion[] = [
  {
    id: "power-cuts",
    title_en: "Electricity cuts?",
    title_ar: "انقطاع الكهرباء؟",
    hint_en: "Generator technicians & wiring help",
    hint_ar: "فني مولدات + صيانة كهرباء",
    match_en: ["generator", "electric", "electrician", "wiring"],
    match_ar: ["مولد", "كهرباء", "كهربائي", "تمديد"],
    icon: Zap,
  },
  {
    id: "water-issue",
    title_en: "Water pressure / leaks",
    title_ar: "ضعف الماء / تسريب",
    hint_en: "Plumber & pump specialists",
    hint_ar: "سباك + فني مضخات",
    match_en: ["plumb", "plumber", "pump", "leak", "pipes"],
    match_ar: ["سباك", "سباكة", "مضخة", "تسريب", "مواسير"],
    icon: Droplets,
  },
  {
    id: "ac-season",
    title_en: "AC not cooling?",
    title_ar: "المكيف ما يبرد؟",
    hint_en: "AC maintenance & gas refill",
    hint_ar: "صيانة تكييف + شحن غاز",
    match_en: ["ac", "air", "conditioning", "hvac", "cooling"],
    match_ar: ["تكييف", "مكيف", "تبريد", "مكيفات"],
    icon: Wind,
  },
];

function FilterSuggestionChip({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border",
        isActive
          ? "bg-[#111] text-white border-[#111]"
          : "bg-white text-[#111] border-gray-200 hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-lg font-semibold text-[#111]">{title}</h2>
      {action}
    </div>
  );
}

// -------------------- Notifications UI type (flattened for rendering) --------------------
type AppNotification = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string | null;
  is_read: boolean;
};

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL, language } = useLanguage();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: subcategories } = useAllSubcategories();
  const { data: cities } = useCities();

  const [sheetOpen, setSheetOpen] = useState(false);

  // ✅ Notifications drawer open state only (data comes from hooks now)
  const [notifOpen, setNotifOpen] = useState(false);

  // ✅ Hook-based notifications (same as other pages)
  const notifQuery = useNotifications();
  const unreadHook = useUnreadCount();
  const notifMutations = useNotificationMutations();

  // ✅ Correct: read ONLY notifQuery.data (array) + map message.title/content
  const notifLoading = Boolean(notifQuery.isLoading || notifQuery.isFetching);

  const notifications: AppNotification[] = useMemo(() => {
    const data: Notification[] = notifQuery.data ?? [];
    return data.map((n) => ({
      id: n.id,
      title: n.message?.title ?? null,
      body: n.message?.content ?? null,
      created_at: n.created_at ?? null,
      is_read: Boolean(n.is_read),
    }));
  }, [notifQuery.data]);

  const unreadCount: number = useMemo(() => {
    const u: any = unreadHook.data;
    if (typeof u === "number") return u;
    return notifications.filter((n) => !n.is_read).length;
  }, [unreadHook.data, notifications]);

  const markAsRead = (id: string) => notifMutations.markAsRead.mutateAsync(id);
  const markAllAsRead = () => notifMutations.markAllAsRead.mutateAsync();

  // Sheet service
  const [selectedService, setSelectedService] = useState<{
    id: string; // subcategory id
    titleKey: string;
    descKey: string;
    category: string;
    categoryName?: string;
    categoryNameAr?: string;
    color: string;
    icon: LucideIcon;
  } | null>(null);

  // If set, sheet opens directly to provider detail (used by Featured Providers)
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<
    string | null
  >(null);

  // Filters
  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>({
    city: null,
    subCity: null,
    minRating: false,
  });

  // Category drawer
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [drawerCategoryId, setDrawerCategoryId] = useState<string | null>(null);

  const [featuredProviders, setFeaturedProviders] = useState<
    FeaturedProviderCard[]
  >([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Ratings for featured
  const { ratings: featuredRatings } = useServiceRatings(
    featuredProviders.map((fp) => fp.service_id)
  );

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || (isRTL ? "م" : "U");

  // ✅ Convert city id -> name
  const getCityLabel = (cityIdOrName: string | null) => {
    if (!cityIdOrName) return null;

    const found = cities?.find(
      (c: any) =>
        c.id === cityIdOrName ||
        String(c.name || "").toLowerCase() ===
          String(cityIdOrName).toLowerCase()
    );

    return found
      ? language === "ar" && found.name_ar
        ? found.name_ar
        : found.name
      : cityIdOrName;
  };

  const getFeaturedRatingDisplay = (serviceId: string) => {
    const r = featuredRatings.get(serviceId);
    if (!r || r.totalReviews === 0)
      return { text: isRTL ? "جديد" : "New", hasRating: false };
    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true };
  };

  // Helper: find a city's ID by labels
  const findCityIdByLabels = (labels: string[]) => {
    const norm = (s: string) => (s || "").toLowerCase().trim();
    const wanted = new Set(labels.map(norm));
    const found = cities?.find((c: any) => {
      const en = norm(c?.name || "");
      const ar = norm(c?.name_ar || "");
      return wanted.has(en) || wanted.has(ar);
    });
    return found?.id || null;
  };

  // City matching for featured providers
  const matchesSelectedCity = (providerCity: string | null) => {
    if (!searchFilters.city) return true;
    if (!providerCity) return false;

    const selectedRaw = String(searchFilters.city).toLowerCase().trim();
    const providerRaw = String(providerCity).toLowerCase().trim();

    if (providerRaw === selectedRaw) return true;

    const providerLabel = getCityLabel(providerCity);
    if (
      providerLabel &&
      String(providerLabel).toLowerCase().trim() === selectedRaw
    )
      return true;

    const selectedLabel = getCityLabel(searchFilters.city as any);
    if (selectedLabel) {
      const sl = String(selectedLabel).toLowerCase().trim();
      if (providerRaw === sl) return true;
      if (providerLabel && String(providerLabel).toLowerCase().trim() === sl)
        return true;
    }

    const aliasMap: Record<string, { labels: string[] }> = {
      tripoli: { labels: ["tripoli", "طرابلس", "طرابلس المركز"] },
      benghazi: { labels: ["benghazi", "بنغازي"] },
      misrata: { labels: ["misrata", "مصراتة"] },
    };

    const alias = aliasMap[selectedRaw];
    if (alias) {
      const providerLabelNorm = providerLabel
        ? String(providerLabel).toLowerCase().trim()
        : "";

      const providerMatchesAlias =
        alias.labels.some((l) => providerRaw.includes(l.toLowerCase())) ||
        alias.labels.some((l) => providerLabelNorm.includes(l.toLowerCase()));

      if (providerMatchesAlias) return true;

      const aliasCityId = findCityIdByLabels(alias.labels);
      if (aliasCityId && providerRaw === String(aliasCityId).toLowerCase())
        return true;
    }

    return false;
  };

  const featuredProvidersFiltered = useMemo(() => {
    return featuredProviders.filter((fp) =>
      matchesSelectedCity(fp.provider_city)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredProviders, searchFilters.city, language, cities]);

  // Map subcategories -> service items
  const serviceItems: ServiceItem[] = useMemo(() => {
    if (!subcategories) return [];
    return subcategories
      .filter((sub: any) => sub.is_active !== false)
      .map((sub: any) => ({
        id: sub.id,
        icon: ICON_MAP[sub.icon] || Wrench,
        color:
          sub.color ||
          categories?.find((c: any) => c.id === sub.category_id)?.color ||
          "bg-[#F2F2F2]",
        name: sub.name,
        name_ar: sub.name_ar,
        category_id: sub.category_id,
        is_popular: Boolean(sub.is_popular),
        popular_order: sub.popular_order ?? null,
      }));
  }, [subcategories, categories]);

  const categoryGrid = useMemo(() => {
    const list = (categories || []).filter((c: any) => c.is_active !== false);
    return list.slice(0, 8);
  }, [categories]);

  const drawerCategory = useMemo(() => {
    if (!drawerCategoryId) return null;
    return categories?.find((c: any) => c.id === drawerCategoryId) || null;
  }, [drawerCategoryId, categories]);

  const drawerSubcategories = useMemo(() => {
    if (!drawerCategoryId) return [];
    const list = serviceItems.filter((s) => s.category_id === drawerCategoryId);

    return [...list].sort((a, b) => {
      const an = (language === "ar" && a.name_ar ? a.name_ar : a.name) || "";
      const bn = (language === "ar" && b.name_ar ? b.name_ar : b.name) || "";
      return an.localeCompare(bn);
    });
  }, [drawerCategoryId, serviceItems, language]);

  const handleRemoveFilter = (key: keyof SearchFiltersState) => {
    if (key === "city") {
      setSearchFilters((prev) => ({ ...prev, city: null, subCity: null }));
    } else {
      setSearchFilters((prev) => ({
        ...prev,
        [key]: key === "minRating" ? false : null,
      }));
    }
  };

  const openServiceSheetFromSubcategory = (service: ServiceItem) => {
    // NOTE: used for normal flows. For featured flow, we don't use this to avoid resetting provider id.
    setInitialProviderServiceId(null);

    const category = categories?.find((c: any) => c.id === service.category_id);

    setSelectedService({
      id: service.id,
      icon: service.icon,
      color: service.color,
      titleKey: service.name,
      descKey: "",
      category: service.name,
      categoryName: category?.name || "",
      categoryNameAr: category?.name_ar || "",
    });

    setSheetOpen(true);
  };

  const openCategoryDrawer = (categoryId: string) => {
    setDrawerCategoryId(categoryId);
    setCategoryDrawerOpen(true);
  };

  // ✅ Best-effort resolver for missing featured subcategory_id
  const resolveFeaturedSubcategoryId = useCallback(
    (fp: FeaturedProviderCard): string | null => {
      if (fp.subcategory_id) return fp.subcategory_id;
      if (!serviceItems.length) return null;

      const norm = (s: string) =>
        String(s || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      const hay = `${fp.category || ""} ${fp.service_title || ""}`;
      const H = norm(hay);

      // 1) direct contains match
      let found =
        serviceItems.find((s) => {
          const en = norm(s.name);
          const ar = norm(s.name_ar || "");
          return (en && H.includes(en)) || (ar && H.includes(ar));
        }) || null;

      if (found) return found.id;

      // 2) reverse contains (subcategory contains the service title/category)
      found =
        serviceItems.find((s) => {
          const en = norm(s.name);
          const ar = norm(s.name_ar || "");
          return (
            (en && en.includes(norm(fp.service_title))) ||
            (ar && ar.includes(norm(fp.service_title)))
          );
        }) || null;

      return found?.id || null;
    },
    [serviceItems]
  );

  // ✅ Featured click: open ServiceDetailSheet in correct subcategory context + deep-link provider
  const openProviderDetailsFromFeatured = useCallback(
    (fp: FeaturedProviderCard) => {
      const subId = resolveFeaturedSubcategoryId(fp);

      // pick icon/color from known subcategory if possible
      const sc = subId ? serviceItems.find((s) => s.id === subId) : null;
      const category = sc
        ? categories?.find((c: any) => c.id === sc.category_id)
        : null;

      // set both states deterministically (no reset in between)
      setInitialProviderServiceId(fp.service_id);

      setSelectedService({
        id: subId || fp.service_id,
        icon: sc?.icon || Wrench,
        color: sc?.color || "bg-[#F2F2F2]",
        titleKey: sc ? sc.name : fp.service_title,
        descKey: "",
        category: sc ? sc.name : fp.category,
        categoryName: category?.name || fp.category,
        categoryNameAr: category?.name_ar || fp.category,
      });

      setSheetOpen(true);
    },
    [resolveFeaturedSubcategoryId, serviceItems, categories]
  );

  // Featured Providers (fetch stays the same; subcategory_id will be used if available)
  useEffect(() => {
    const fetchFeaturedProviders = async () => {
      setFeaturedLoading(true);
      try {
        const selectWithSubcategory =
          "id, category, title, user_id, provider_name, provider_phone, city, sub_city, is_active, is_paused, is_featured, featured_order, created_at, subcategory_id";

        let servicesData: any[] | null = null;

        const firstTry = await supabase
          .from("services")
          .select(selectWithSubcategory)
          .eq("is_active", true)
          .eq("is_featured", true)
          .or("is_paused.is.null,is_paused.eq.false")
          .order("featured_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(50);

        if (!firstTry.error) {
          servicesData = firstTry.data || [];
        } else {
          const secondTry = await supabase
            .from("services")
            .select(
              "id, category, title, user_id, provider_name, provider_phone, city, sub_city, is_active, is_paused, is_featured, featured_order, created_at"
            )
            .eq("is_active", true)
            .eq("is_featured", true)
            .or("is_paused.is.null,is_paused.eq.false")
            .order("featured_order", { ascending: true })
            .order("created_at", { ascending: false })
            .limit(50);

          if (secondTry.error) {
            console.error("Error fetching featured services:", secondTry.error);
            setFeaturedProviders([]);
            return;
          }

          servicesData = secondTry.data || [];
        }

        const featured = servicesData || [];
        if (featured.length === 0) {
          setFeaturedProviders([]);
          return;
        }

        const userIds = [
          ...new Set(featured.map((s: any) => s.user_id).filter(Boolean)),
        ];
        let profileMap = new Map<string, any>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select(
              "user_id, full_name, avatar_url, phone, city, sub_city, provider_status"
            )
            .in("user_id", userIds)
            .eq("provider_status", "approved");

          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        }

        const cards: FeaturedProviderCard[] = featured
          .filter((svc: any) => {
            if (!svc.user_id) return svc.provider_name && svc.provider_phone;
            return profileMap.has(svc.user_id);
          })
          .map((svc: any) => {
            const p = svc.user_id ? profileMap.get(svc.user_id) : null;
            return {
              service_id: svc.id,
              category: svc.category,
              service_title: svc.title || (isRTL ? "خدمة" : "Service"),
              provider_name:
                p?.full_name ||
                svc.provider_name ||
                (isRTL ? "مقدم الخدمة" : "Provider"),
              provider_phone: p?.phone || svc.provider_phone || "",
              provider_avatar: p?.avatar_url || null,
              provider_city: p?.city || svc.city || null,
              provider_sub_city: p?.sub_city || svc.sub_city || null,
              subcategory_id: svc.subcategory_id || null,
            };
          });

        setFeaturedProviders(cards.slice(0, 12));
      } catch (e) {
        console.error("Featured providers fetch error:", e);
        setFeaturedProviders([]);
      } finally {
        setFeaturedLoading(false);
      }
    };

    fetchFeaturedProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  // Popular services = admin-picked only
  const popularServices: ServiceItem[] = useMemo(() => {
    const flagged = serviceItems.filter((s) => s.is_popular);
    if (flagged.length === 0) return [];
    return [...flagged]
      .sort((a, b) => (a.popular_order ?? 9999) - (b.popular_order ?? 9999))
      .slice(0, 12);
  }, [serviceItems]);

  // Suggested by Dora mapping
  const findBestMatchingSubcategory = (s: DoraSuggestion): ServiceItem | null => {
    const candidates = serviceItems;

    const matchAny = (text: string, keys: string[]) => {
      const t = (text || "").toLowerCase();
      return keys.some((k) => t.includes(k.toLowerCase()));
    };

    for (const item of candidates) {
      if (matchAny(item.name, s.match_en)) return item;
    }
    for (const item of candidates) {
      if (item.name_ar && matchAny(item.name_ar, s.match_ar)) return item;
    }
    for (const item of candidates) {
      if (item.name_ar && matchAny(item.name_ar, s.match_en)) return item;
      if (matchAny(item.name, s.match_ar)) return item;
    }

    return null;
  };

  const suggestedByDora = useMemo(() => {
    return DORA_SUGGESTIONS.map((s) => ({
      suggestion: s,
      target: findBestMatchingSubcategory(s),
    })).filter((x) => Boolean(x.target));
  }, [serviceItems]);

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-[#F7F7F8]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F7F7F8]/75 border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            {/* ✅ Removed avatar/profile button (left spacer keeps layout balanced) */}
            <div className="h-10 w-10" />

            {/* Center title */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex flex-col items-center leading-none"
              aria-label={t.appName}
            >
              <span className="text-[13px] font-semibold text-[#111]">
                {t.appName}
              </span>
              <span className="text-[11px] text-[#777]">
                {isRTL ? "خدمات قريبة منك" : "Local services"}
              </span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LanguageToggle />

              {/* ✅ Bell notifications (hook-based) */}
              <button
                onClick={() => setNotifOpen(true)}
                className="relative h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                aria-label={isRTL ? "الإشعارات" : "Notifications"}
              >
                <Bell className="h-5 w-5 text-[#111]" />
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center"
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search bar removed */}

          {/* City chips + rating */}
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <FilterSuggestionChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={isRTL ? "طرابلس" : "Tripoli"}
              isActive={searchFilters.city === "tripoli"}
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  city: prev.city === "tripoli" ? null : "tripoli",
                  subCity: prev.city === "tripoli" ? prev.subCity : null,
                }))
              }
            />
            <FilterSuggestionChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={isRTL ? "بنغازي" : "Benghazi"}
              isActive={searchFilters.city === "benghazi"}
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  city: prev.city === "benghazi" ? null : "benghazi",
                  subCity: prev.city === "benghazi" ? prev.subCity : null,
                }))
              }
            />
            <FilterSuggestionChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={isRTL ? "مصراتة" : "Misrata"}
              isActive={searchFilters.city === "misrata"}
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  city: prev.city === "misrata" ? null : "misrata",
                  subCity: prev.city === "misrata" ? prev.subCity : null,
                }))
              }
            />
            <FilterSuggestionChip
              icon={
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              }
              label={isRTL ? "4+ نجوم" : "4+ Stars"}
              isActive={Boolean(searchFilters.minRating)}
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  minRating: !prev.minRating,
                }))
              }
            />
          </div>

          {(searchFilters.city ||
            searchFilters.subCity ||
            searchFilters.minRating) && (
            <div className="mt-2">
              <ActiveFilterChips
                filters={searchFilters}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}
        </div>
      </header>

      {/* Scroll content */}
      <main className="px-4 pt-5 pb-10">
        <ReviewPromptBanner />

        {/* Categories */}
        <section className="mt-5">
          <SectionHeader title={isRTL ? "الفئات" : "Categories"} />
          {categoriesLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-[102px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categoryGrid.map((cat: any) => {
                const IconComponent = ICON_MAP[cat.icon] || Home;
                const displayName =
                  language === "ar" && cat.name_ar ? cat.name_ar : cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => openCategoryDrawer(cat.id)}
                    className="relative overflow-hidden h-[102px] rounded-2xl border bg-white border-gray-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <div
                      className={cn(
                        "absolute inset-0 opacity-10",
                        cat.color || "bg-[#F2F2F2]"
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/70" />

                    <div
                      className={cn(
                        "relative h-12 w-12 rounded-2xl flex items-center justify-center",
                        cat.color || "bg-[#F2F2F2]"
                      )}
                    >
                      <IconComponent
                        className="h-6 w-6 text-[#111]"
                        strokeWidth={1.7}
                      />
                    </div>
                    <span className="relative text-[11px] font-semibold text-[#111] text-center px-1 leading-tight line-clamp-1">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Featured Providers */}
        <section className="mt-8">
          <SectionHeader
            title={isRTL ? "مقدمي خدمة مختارين" : "Featured providers"}
          />
          {featuredLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[310px] h-[120px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : featuredProvidersFiltered.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
              {featuredProvidersFiltered.map((fp) => {
                const r = getFeaturedRatingDisplay(fp.service_id);

                return (
                  <button
                    key={`${fp.service_id}-${fp.provider_phone || fp.provider_name}`}
                    onClick={() => openProviderDetailsFromFeatured(fp)}
                    className={cn(
                      "snap-start flex-shrink-0 w-[310px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                      isRTL && "text-right"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={fp.provider_avatar || undefined} />
                        <AvatarFallback className="bg-[#111] text-white font-semibold">
                          {(fp.provider_name || (isRTL ? "م" : "P"))
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-[#111] truncate">
                          {fp.provider_name}
                        </h3>
                        <p className="text-xs text-[#777] mt-1 truncate">
                          {fp.service_title}
                        </p>

                        <div className="mt-1 flex items-center gap-1 text-xs">
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              r.hasRating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-[#999]"
                            )}
                          />
                          <span
                            className={cn(
                              r.hasRating
                                ? "text-[#111] font-semibold"
                                : "text-[#777]"
                            )}
                          >
                            {r.text}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className={cn(
                          "h-5 w-5 text-[#C9C9C9]",
                          isRTL && "rotate-180"
                        )}
                      />
                    </div>

                    <div className="mt-3 text-xs text-[#777]">
                      {fp.provider_city ? (isRTL ? "المدينة: " : "City: ") : ""}
                      <span className="text-[#111] font-semibold">
                        {getCityLabel(fp.provider_city) ||
                          (isRTL ? "غير محدد" : "Not set")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 p-5 text-sm text-[#777]">
              {featuredProviders.length > 0 &&
              featuredProvidersFiltered.length === 0
                ? isRTL
                  ? "لا يوجد مزودين مختارين لهذه المدينة."
                  : "No featured providers for this city."
                : isRTL
                ? "لا يوجد مزودين مختارين حالياً."
                : "No featured providers yet."}
            </div>
          )}
        </section>

        {/* Suggested by Dora */}
        {suggestedByDora.length > 0 && (
          <section className="mt-8">
            <SectionHeader title={isRTL ? "مقترحات دورة" : "Suggested by Dora"} />
            <div className="grid grid-cols-1 gap-3">
              {suggestedByDora.map(({ suggestion, target }) => {
                const targetService = target as ServiceItem;
                const Icon = suggestion.icon || Sparkles;

                return (
                  <button
                    key={suggestion.id}
                    onClick={() =>
                      openServiceSheetFromSubcategory(targetService)
                    }
                    className={cn(
                      "relative overflow-hidden w-full rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.99]",
                      isRTL && "text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 opacity-10",
                        targetService.color
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/75" />

                    <div className="relative flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white/70 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <Icon
                          className="h-6 w-6 text-[#111]"
                          strokeWidth={1.7}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#111]">
                          {isRTL ? suggestion.title_ar : suggestion.title_en}
                        </h3>
                        <p className="text-xs text-[#777] mt-1 line-clamp-2">
                          {isRTL ? suggestion.hint_ar : suggestion.hint_en}
                        </p>
                      </div>

                      <ChevronRight
                        className={cn(
                          "h-5 w-5 text-[#C9C9C9]",
                          isRTL && "rotate-180"
                        )}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Popular Services */}
        {popularServices.length > 0 && (
          <section className="mt-8">
            <SectionHeader
              title={isRTL ? "الخدمات الأكثر طلباً" : "Popular services"}
            />
            <div className="grid grid-cols-2 gap-3">
              {popularServices.map((service) => {
                const IconComponent = service.icon;
                const displayName =
                  language === "ar" && service.name_ar
                    ? service.name_ar
                    : service.name;

                return (
                  <button
                    key={service.id}
                    onClick={() => openServiceSheetFromSubcategory(service)}
                    className={cn(
                      "relative overflow-hidden h-[96px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                      isRTL && "text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 opacity-10",
                        service.color
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/75" />

                    <div className="relative flex items-center gap-3">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center",
                          service.color
                        )}
                      >
                        <IconComponent
                          className="h-6 w-6 text-[#111]"
                          strokeWidth={1.7}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#111] line-clamp-1">
                          {displayName}
                        </h3>
                        <p className="text-xs text-[#777] mt-1">
                          {isRTL ? "عرض مقدمي الخدمة" : "View providers"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom line / links */}
        <section className="mt-10">
          <div className="border-t border-gray-200 pt-4 pb-2 text-xs text-[#777] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <button
              onClick={() => window.alert(isRTL ? "قريباً" : "Coming soon")}
              className="hover:text-[#111] transition-colors"
            >
              {isRTL ? "من نحن" : "About"}
            </button>
            <button
              onClick={() => (window.location.href = "mailto:support@dora.ly")}
              className="hover:text-[#111] transition-colors"
            >
              {isRTL ? "تواصل معنا" : "Contact"}
            </button>
            <button
              onClick={() =>
                window.alert(
                  isRTL ? "سيتم إضافة الشروط قريباً" : "Terms will be added soon"
                )
              }
              className="hover:text-[#111] transition-colors"
            >
              {isRTL ? "الشروط" : "Terms"}
            </button>
            <button
              onClick={() =>
                window.alert(
                  isRTL
                    ? "سيتم إضافة الخصوصية قريباً"
                    : "Privacy will be added soon"
                )
              }
              className="hover:text-[#111] transition-colors"
            >
              {isRTL ? "الخصوصية" : "Privacy"}
            </button>

            <span className="text-[#AAA]">•</span>
            <span className="text-[#999]">© {new Date().getFullYear()} Dora</span>
          </div>
        </section>
      </main>

      <MobileNav />

      {/* ✅ Notifications Drawer (hook-based) */}
      <Drawer open={notifOpen} onOpenChange={setNotifOpen}>
        <DrawerContent className="mx-auto w-[92vw] max-w-md max-h-[80vh] overflow-hidden rounded-t-3xl rounded-b-none p-0">
          <DrawerHeader className="relative pb-2 px-4 pt-4">
            <DrawerClose
              className={cn(
                "absolute top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                isRTL ? "left-4" : "right-4"
              )}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </DrawerClose>

            <div className="flex flex-col items-center">
              <DrawerTitle className="text-lg font-bold text-foreground">
                {isRTL ? "الإشعارات" : "Notifications"}
              </DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {user
                  ? isRTL
                    ? "آخر التحديثات"
                    : "Latest updates"
                  : isRTL
                  ? "سجّل الدخول لعرض الإشعارات"
                  : "Sign in to see notifications"}
              </p>

              {user && unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="mt-3 text-xs font-semibold text-[#111] underline underline-offset-4"
                >
                  {isRTL ? "تمييز الكل كمقروء" : "Mark all as read"}
                </button>
              )}
            </div>
          </DrawerHeader>

          <ScrollArea className="px-4 pb-6">
            {!user ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-4 text-sm text-[#777]">
                {isRTL
                  ? "سجّل الدخول لعرض إشعاراتك."
                  : "Please sign in to view your notifications."}
              </div>
            ) : notifLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl bg-gray-200 animate-pulse"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-4 text-sm text-[#777]">
                {isRTL ? "لا توجد إشعارات حالياً." : "No notifications yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                    }}
                    className={cn(
                      "w-full text-left rounded-2xl bg-white border border-gray-200 p-4 transition-all active:scale-[0.99]",
                      !n.is_read && "border-[#111]",
                      isRTL && "text-right"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#111] truncate">
                          {n.title || (isRTL ? "إشعار" : "Notification")}
                        </p>
                        <p className="text-xs text-[#777] mt-1 whitespace-pre-wrap">
                          {n.body ||
                            (isRTL
                              ? "تفاصيل الإشعار"
                              : "Notification details")}
                        </p>
                        {n.created_at && (
                          <p className="text-[11px] text-[#999] mt-2">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {!n.is_read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Category Drawer */}
      <Drawer open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
        <DrawerContent className="h-[90vh] flex flex-col overflow-hidden rounded-t-3xl p-0">
          <DrawerHeader className="relative pb-2 px-4 pt-4">
            <DrawerClose
              className={cn(
                "absolute top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                isRTL ? "left-4" : "right-4"
              )}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </DrawerClose>

            <div className="flex flex-col items-center pt-2">
              <DrawerTitle className="text-lg font-bold text-foreground">
                {drawerCategory
                  ? language === "ar" && drawerCategory.name_ar
                    ? drawerCategory.name_ar
                    : drawerCategory.name
                  : isRTL
                  ? "الفئة"
                  : "Category"}
              </DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL ? "اختر خدمة" : "Choose a service"}
              </p>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1">
            <div className="px-4 pb-5" dir={isRTL ? "rtl" : "ltr"}>
              {drawerSubcategories.length > 0 ? (
                <div className="space-y-2">
                  {drawerSubcategories.map((service) => {
                    const IconComponent = service.icon;
                    const displayName =
                      language === "ar" && service.name_ar
                        ? service.name_ar
                        : service.name;

                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          setCategoryDrawerOpen(false);
                          openServiceSheetFromSubcategory(service);
                        }}
                        className={cn(
                          "relative overflow-hidden w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 transition-colors hover:bg-gray-50 active:bg-gray-100",
                          isRTL && "flex-row-reverse text-right"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute inset-0 opacity-10",
                            service.color
                          )}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/75" />

                        <div
                          className={cn(
                            "relative h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                            service.color
                          )}
                        >
                          <IconComponent
                            className="h-6 w-6 text-[#111]"
                            strokeWidth={1.7}
                          />
                        </div>

                        <div className="relative flex-1 min-w-0">
                          <h3 className="text-[15px] font-semibold text-[#111] line-clamp-1">
                            {displayName}
                          </h3>
                          <p className="text-xs text-[#777] mt-1">
                            {isRTL ? "عرض مقدمي الخدمة" : "View providers"}
                          </p>
                        </div>

                        <ChevronRight
                          className={cn(
                            "relative h-5 w-5 text-[#C9C9C9] flex-shrink-0",
                            isRTL && "rotate-180"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  {isRTL
                    ? "لا توجد خدمات في هذه الفئة"
                    : "No services in this category"}
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      <ServiceDetailSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setInitialProviderServiceId(null);
        }}
        service={selectedService}
        filters={searchFilters}
        initialProviderServiceId={initialProviderServiceId}
      />
    </div>
  );
}