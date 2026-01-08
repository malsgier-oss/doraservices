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
  Search,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import { ReviewPromptBanner } from "@/components/review/ReviewPromptBanner";

import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useServiceRatings } from "@/hooks/useReviews";

import { useNotifications, useUnreadCount, useNotificationMutations } from "@/hooks/useNotifications";
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
  subcategory_id: string | null;
};

type AppNotification = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string | null;
  is_read: boolean;
};

type SearchFiltersState = {
  city: string | null; // "tripoli" | "benghazi" | "misrata" | null
  subCity: string | null;
  minRating: boolean; // kept for ServiceDetailSheet compatibility
};

// -------- Header suggestion chips (static for now; connect to control panel later) ----------
type HubSuggestionChip = {
  id: string;
  title_en: string;
  title_ar: string;
  subcategory_match: string[]; // used to find a subcategory by name
  icon?: LucideIcon;
};

const HUB_SUGGESTIONS: HubSuggestionChip[] = [
  {
    id: "ac",
    title_en: "Fix AC",
    title_ar: "تصليح مكيف",
    subcategory_match: ["ac", "air", "conditioning", "تكييف", "مكيف"],
    icon: Wind,
  },
  {
    id: "washing",
    title_en: "Washing machine broke",
    title_ar: "غسالة خربت",
    subcategory_match: ["washing", "washer", "غسالة"],
    icon: Wrench,
  },
  {
    id: "water",
    title_en: "Water leaking",
    title_ar: "تسريب ماء",
    subcategory_match: ["plumb", "plumber", "water", "leak", "سباك", "تسريب", "سباكة"],
    icon: Droplets,
  },
  {
    id: "electric",
    title_en: "Electricity issue",
    title_ar: "مشكلة كهرباء",
    subcategory_match: ["electric", "electrician", "كهرباء", "كهربائي"],
    icon: Zap,
  },
  {
    id: "car",
    title_en: "Car issue",
    title_ar: "مشكلة سيارة",
    subcategory_match: ["car", "auto", "سيارة"],
    icon: Car,
  },
  {
    id: "cleaning",
    title_en: "Home cleaning",
    title_ar: "تنظيف منزل",
    subcategory_match: ["clean", "cleaning", "تنظيف"],
    icon: Home,
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
        "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold transition-all border",
        isActive ? "bg-[#111] text-white border-[#111]" : "bg-white text-[#111] border-gray-200 hover:bg-gray-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-[18px] font-semibold text-[#111]">{title}</h2>
      {action}
    </div>
  );
}

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL, language } = useLanguage();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: subcategories } = useAllSubcategories();
  const { data: cities } = useCities();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const notifQuery = useNotifications();
  const unreadHook = useUnreadCount();
  const notifMutations = useNotificationMutations();

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

  const [selectedService, setSelectedService] = useState<{
    id: string; // subcategory id or fallback
    titleKey: string;
    descKey: string;
    category: string; // MUST match services.category in DB (you already use it this way)
    categoryName?: string;
    categoryNameAr?: string;
    color: string;
    icon: LucideIcon;
  } | null>(null);

  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);

  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>({
    city: null,
    subCity: null,
    minRating: false,
  });

  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [drawerCategoryId, setDrawerCategoryId] = useState<string | null>(null);

  const [featuredProviders, setFeaturedProviders] = useState<FeaturedProviderCard[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  const { ratings: featuredRatings } = useServiceRatings(featuredProviders.map((fp) => fp.service_id));

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  type SearchResult = {
    id: string; // service id
    kind: "provider" | "service";
    title: string;
    subtitle: string;
    avatar?: string | null;
    category: string; // services.category
    provider_name?: string;
    provider_city?: string | null;
  };

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [recentCards, setRecentCards] = useState<FeaturedProviderCard[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const getCityLabel = (cityIdOrName: string | null) => {
    if (!cityIdOrName) return null;
    const found = cities?.find(
      (c: any) => c.id === cityIdOrName || String(c.name || "").toLowerCase() === String(cityIdOrName).toLowerCase(),
    );
    return found ? (language === "ar" && found.name_ar ? found.name_ar : found.name) : cityIdOrName;
  };

  const norm = (s: string | null | undefined) =>
    String(s || "")
      .toLowerCase()
      .trim();

  const cityAliasMap: Record<string, string[]> = {
    tripoli: ["tripoli", "طرابلس", "طرابلس المركز"],
    benghazi: ["benghazi", "بنغازي"],
    misrata: ["misrata", "مصراتة"],
  };

  const matchesSelectedCity = (providerCity: string | null) => {
    if (!searchFilters.city) return true;
    if (!providerCity) return false;

    const selected = norm(searchFilters.city);
    const providerRaw = norm(providerCity);

    if (providerRaw === selected) return true;

    const providerLabel = getCityLabel(providerCity);
    if (providerLabel && norm(providerLabel) === selected) return true;

    const selectedLabel = getCityLabel(searchFilters.city);
    if (selectedLabel) {
      const sl = norm(selectedLabel);
      if (providerRaw === sl) return true;
      if (providerLabel && norm(providerLabel) === sl) return true;
    }

    const labels = cityAliasMap[selected];
    if (labels) {
      const pl = providerLabel ? norm(providerLabel) : "";
      return labels.some((l) => providerRaw.includes(norm(l)) || pl.includes(norm(l)));
    }

    return false;
  };

  const getFeaturedRatingDisplay = (serviceId: string) => {
    const r = featuredRatings.get(serviceId);
    if (!r || r.totalReviews === 0) return { text: isRTL ? "جديد" : "New", hasRating: false };
    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true };
  };

  const serviceItems: ServiceItem[] = useMemo(() => {
    if (!subcategories) return [];
    return subcategories
      .filter((sub: any) => sub.is_active !== false)
      .map((sub: any) => ({
        id: sub.id,
        icon: ICON_MAP[sub.icon] || Wrench,
        color: sub.color || categories?.find((c: any) => c.id === sub.category_id)?.color || "bg-[#F2F2F2]",
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

  const openServiceSheetFromSubcategory = (service: ServiceItem) => {
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

  const resolveFeaturedSubcategoryId = useCallback(
    (fp: FeaturedProviderCard): string | null => {
      if (fp.subcategory_id) return fp.subcategory_id;
      if (!serviceItems.length) return null;

      const n = (s: string) =>
        String(s || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
      const H = n(`${fp.category || ""} ${fp.service_title || ""}`);

      let found =
        serviceItems.find((s) => {
          const en = n(s.name);
          const ar = n(s.name_ar || "");
          return (en && H.includes(en)) || (ar && H.includes(ar));
        }) || null;

      if (found) return found.id;

      found =
        serviceItems.find((s) => {
          const en = n(s.name);
          const ar = n(s.name_ar || "");
          return (en && en.includes(n(fp.service_title))) || (ar && ar.includes(n(fp.service_title)));
        }) || null;

      return found?.id || null;
    },
    [serviceItems],
  );

  const openProviderDetailsFromFeatured = useCallback(
    (fp: FeaturedProviderCard) => {
      const subId = resolveFeaturedSubcategoryId(fp);
      const sc = subId ? serviceItems.find((s) => s.id === subId) : null;
      const category = sc ? categories?.find((c: any) => c.id === sc.category_id) : null;

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
    [resolveFeaturedSubcategoryId, serviceItems, categories],
  );

  useEffect(() => {
    const fetchFeaturedProviders = async () => {
      setFeaturedLoading(true);
      try {
        const selectWithSubcategory =
          "id, category, title, user_id, provider_name, provider_phone, city, sub_city, is_active, is_paused, is_featured, featured_order, created_at, subcategory_id";

        const { data: servicesData, error } = await supabase
          .from("services")
          .select(selectWithSubcategory)
          .eq("is_active", true)
          .eq("is_featured", true)
          .or("is_paused.is.null,is_paused.eq.false")
          .order("featured_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching featured services:", error);
          setFeaturedProviders([]);
          return;
        }

        const featured = servicesData || [];
        if (featured.length === 0) {
          setFeaturedProviders([]);
          return;
        }

        const userIds = [...new Set(featured.map((s: any) => s.user_id).filter(Boolean))];
        let profileMap = new Map<string, any>();

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, phone, city, sub_city, provider_status")
            .in("user_id", userIds)
            .eq("provider_status", "approved");

          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        }

        const cards: FeaturedProviderCard[] = featured
          .filter((svc: any) => svc.user_id)
          .map((svc: any) => {
            const p = profileMap.get(svc.user_id);
            return {
              service_id: svc.id,
              category: svc.category,
              service_title: svc.title || (isRTL ? "خدمة" : "Service"),
              provider_name: p?.full_name || svc.provider_name || (isRTL ? "مقدم الخدمة" : "Provider"),
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
  }, [isRTL]);

  const featuredProvidersFiltered = useMemo(() => {
    return featuredProviders.filter((fp) => matchesSelectedCity(fp.provider_city));
  }, [featuredProviders, searchFilters.city, language, cities]);

  const popularServices: ServiceItem[] = useMemo(() => {
    const flagged = serviceItems.filter((s) => s.is_popular);
    if (flagged.length === 0) return [];
    return [...flagged].sort((a, b) => (a.popular_order ?? 9999) - (b.popular_order ?? 9999)).slice(0, 12);
  }, [serviceItems]);

  const resolveSuggestionTarget = useCallback(
    (chip: HubSuggestionChip): ServiceItem | null => {
      const keys = chip.subcategory_match.map((k) => norm(k));
      const matchAny = (txt: string | null) => {
        const t = norm(txt);
        return keys.some((k) => t.includes(k));
      };

      for (const item of serviceItems) {
        if (matchAny(item.name)) return item;
      }
      for (const item of serviceItems) {
        if (item.name_ar && matchAny(item.name_ar)) return item;
      }
      return null;
    },
    [serviceItems],
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || q.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSearchLoading(true);
      try {
        const { data: svc, error } = await supabase
          .from("services")
          .select("id, title, category, user_id, provider_name, provider_phone, city, sub_city, is_active, is_paused")
          .eq("is_active", true)
          .or("is_paused.is.null,is_paused.eq.false")
          .or(
            [
              `title.ilike.%${q}%`,
              `category.ilike.%${q}%`,
              `provider_name.ilike.%${q}%`,
              `provider_phone.ilike.%${q}%`,
            ].join(","),
          )
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("search error:", error);
          if (!cancelled) setSearchResults([]);
          return;
        }

        const rows = (svc || []) as any[];

        const filtered = rows.filter((r) => matchesSelectedCity(r.city || null));

        const mapped: SearchResult[] = filtered.map((r) => ({
          id: r.id,
          kind: r.provider_name || r.provider_phone ? "provider" : "service",
          title: r.provider_name || r.title || (isRTL ? "مقدم خدمة" : "Provider"),
          subtitle: r.title || r.category || "",
          category: r.category,
          provider_name: r.provider_name || "",
          provider_city: r.city || null,
        }));

        if (!cancelled) setSearchResults(mapped);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };

    const timer = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchOpen, searchQuery, searchFilters.city]);

  useEffect(() => {
    const loadRecent = async () => {
      const key = `dora_recent_service_ids_${user?.id || "guest"}`;
      let ids: string[] = [];
      try {
        ids = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        ids = [];
      }
      ids = (ids || []).filter(Boolean).slice(0, 8);
      if (ids.length === 0) {
        setRecentCards([]);
        return;
      }

      setRecentLoading(true);
      try {
        const { data: servicesData, error } = await supabase
          .from("services")
          .select("id, category, title, user_id, city, sub_city, subcategory_id, is_active, is_paused")
          .in("id", ids)
          .eq("is_active", true)
          .or("is_paused.is.null,is_paused.eq.false");

        if (error) {
          console.error("recent services error:", error);
          setRecentCards([]);
          return;
        }

        const list = (servicesData || []) as any[];

        const userIds = [...new Set(list.map((s) => s.user_id).filter(Boolean))];

        let profileMap = new Map<string, any>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url, phone, city, sub_city, provider_status")
            .in("user_id", userIds)
            .eq("provider_status", "approved");

          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        }

        const mapById = new Map(list.map((s) => [s.id, s]));
        const ordered = ids.map((id) => mapById.get(id)).filter(Boolean);

        const cards: FeaturedProviderCard[] = ordered
          .filter((svc: any) => svc.user_id && profileMap.has(svc.user_id))
          .map((svc: any) => {
            const p = profileMap.get(svc.user_id);
            return {
              service_id: svc.id,
              category: svc.category,
              service_title: svc.title || (isRTL ? "خدمة" : "Service"),
              provider_name: p?.full_name || (isRTL ? "مقدم الخدمة" : "Provider"),
              provider_phone: p?.phone || "",
              provider_avatar: p?.avatar_url || null,
              provider_city: p?.city || svc.city || null,
              provider_sub_city: p?.sub_city || svc.sub_city || null,
              subcategory_id: svc.subcategory_id || null,
            };
          })
          .filter((c) => matchesSelectedCity(c.provider_city));

        setRecentCards(cards);
      } finally {
        setRecentLoading(false);
      }
    };

    loadRecent();
  }, [user?.id, searchFilters.city, sheetOpen]);

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-[#F7F7F8]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F7F7F8]/75 border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10" />

            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex flex-col items-center leading-none"
              aria-label={t.appName}
            >
              <span className="text-[14px] font-semibold text-[#111]">{t.appName}</span>
              <span className="text-[12px] text-[#777] mt-0.5">{isRTL ? "خدمات قريبة منك" : "Local services"}</span>
            </button>

            <div className="flex items-center gap-2">
              <LanguageToggle />

              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center"
                    aria-label={isRTL ? "الإشعارات" : "Notifications"}
                  >
                    <Bell className="h-5 w-5 text-[#111]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align={isRTL ? "start" : "end"}
                  side="bottom"
                  sideOffset={10}
                  className="w-[92vw] max-w-sm p-0 overflow-hidden rounded-2xl border border-gray-200 bg-white"
                >
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn("min-w-0", isRTL && "text-right")}>
                        <p className="text-[14px] font-bold text-[#111]">{isRTL ? "الإشعارات" : "Notifications"}</p>
                        <p className="text-[12px] text-[#777] mt-1">
                          {user
                            ? isRTL
                              ? "آخر التحديثات"
                              : "Latest updates"
                            : isRTL
                              ? "سجّل الدخول لعرض الإشعارات"
                              : "Sign in to see notifications"}
                        </p>
                      </div>

                      {user && unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-[12px] font-semibold text-[#111] underline underline-offset-4"
                        >
                          {isRTL ? "تمييز الكل كمقروء" : "Mark all as read"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[55vh]">
                    <ScrollArea className="h-[55vh] px-4 py-4">
                      {!user ? (
                        <div className="rounded-2xl bg-white border border-gray-200 p-4 text-[13px] text-[#777]">
                          {isRTL ? "سجّل الدخول لعرض إشعاراتك." : "Please sign in to view your notifications."}
                        </div>
                      ) : notifLoading ? (
                        <div className="space-y-2">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 rounded-2xl bg-gray-200 animate-pulse" />
                          ))}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="rounded-2xl bg-white border border-gray-200 p-4 text-[13px] text-[#777]">
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
                                isRTL && "text-right",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-semibold text-[#111] truncate">
                                    {n.title || (isRTL ? "إشعار" : "Notification")}
                                  </p>
                                  <p className="text-[12px] text-[#777] mt-1 whitespace-pre-wrap">
                                    {n.body || (isRTL ? "تفاصيل الإشعار" : "Notification details")}
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
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row: Search icon + City chips */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0"
              aria-label={isRTL ? "بحث" : "Search"}
            >
              <Search className="h-5 w-5 text-[#111]" />
            </button>

            <FilterSuggestionChip
              icon={<MapPin className="h-4 w-4" />}
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
              icon={<MapPin className="h-4 w-4" />}
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
              icon={<MapPin className="h-4 w-4" />}
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
          </div>

          {/* Inline search input */}
          {searchOpen && (
            <div className="mt-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                <Search className="h-4 w-4 text-[#777]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "ابحث عن مقدم خدمة أو خدمة..." : "Search providers or services..."}
                  className="flex-1 text-[14px] outline-none bg-transparent"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                    aria-label={isRTL ? "مسح" : "Clear"}
                  >
                    <X className="h-4 w-4 text-[#777]" />
                  </button>
                )}
              </div>

              {(searchLoading || searchResults.length > 0 || (searchQuery.trim().length >= 2 && !searchLoading)) && (
                <div className="mt-2 rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-[13px] text-[#777]">{isRTL ? "جاري البحث..." : "Searching..."}</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-[13px] text-[#777]">{isRTL ? "لا توجد نتائج." : "No results."}</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {searchResults.slice(0, 10).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setInitialProviderServiceId(r.id);

                            setSelectedService({
                              id: r.id,
                              titleKey: r.subtitle || r.title,
                              descKey: "",
                              category: r.category,
                              categoryName: r.category,
                              categoryNameAr: r.category,
                              color: "bg-[#F2F2F2]",
                              icon: Wrench,
                            });

                            setSheetOpen(true);
                          }}
                          className={cn("w-full px-4 py-3 text-left hover:bg-gray-50", isRTL && "text-right")}
                        >
                          <div className="text-[14px] font-semibold text-[#111] truncate">{r.title}</div>
                          <div className="text-[12px] text-[#777] truncate mt-0.5">{r.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Header service suggestions (chips) */}
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {HUB_SUGGESTIONS.map((chip) => {
              const Icon = chip.icon || Sparkles;
              const label = isRTL ? chip.title_ar : chip.title_en;

              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    const target = resolveSuggestionTarget(chip);
                    if (target) openServiceSheetFromSubcategory(target);
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold bg-white text-[#111] border border-gray-200 hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Scroll content */}
      <main className="px-4 pt-5 pb-10">
        <ReviewPromptBanner />

        {/* Categories FIRST */}
        <section className="mt-5">
          <SectionHeader title={isRTL ? "الفئات" : "Categories"} />
          {categoriesLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[108px] rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categoryGrid.map((cat: any) => {
                const IconComponent = ICON_MAP[cat.icon] || Home;
                const displayName = language === "ar" && cat.name_ar ? cat.name_ar : cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => openCategoryDrawer(cat.id)}
                    className="relative overflow-hidden h-[108px] rounded-2xl border bg-white border-gray-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <div className={cn("absolute inset-0 opacity-10", cat.color || "bg-[#F2F2F2]")} />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/70" />

                    <div
                      className={cn(
                        "relative h-14 w-14 rounded-2xl flex items-center justify-center",
                        cat.color || "bg-[#F2F2F2]",
                      )}
                    >
                      <IconComponent className="h-7 w-7 text-[#111]" strokeWidth={1.7} />
                    </div>

                    <span className="relative text-[12px] font-semibold text-[#111] text-center px-1 leading-tight line-clamp-1">
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
          <SectionHeader title={isRTL ? "مقدمي خدمة مختارين" : "Featured providers"} />
          {featuredLoading ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[330px] h-[128px] rounded-2xl bg-gray-200 animate-pulse" />
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
                      "snap-start flex-shrink-0 w-[330px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                      isRTL && "text-right",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14">
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
                        <h3 className="text-[16px] font-semibold text-[#111] truncate">{fp.provider_name}</h3>
                        <p className="text-[13px] text-[#777] mt-1 truncate">{fp.service_title}</p>

                        <div className="mt-1.5 flex items-center gap-1 text-[12px]">
                          <Star
                            className={cn("h-4 w-4", r.hasRating ? "text-yellow-500 fill-yellow-500" : "text-[#999]")}
                          />
                          <span className={cn(r.hasRating ? "text-[#111] font-semibold" : "text-[#777]")}>
                            {r.text}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={cn("h-6 w-6 text-[#C9C9C9]", isRTL && "rotate-180")} />
                    </div>

                    <div className="mt-3 text-[12px] text-[#777]">
                      {fp.provider_city ? (isRTL ? "المدينة: " : "City: ") : ""}
                      <span className="text-[#111] font-semibold">
                        {getCityLabel(fp.provider_city) || (isRTL ? "غير محدد" : "Not set")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {/* Recently viewed (providers) */}
        {recentLoading ? (
          <section className="mt-8">
            <SectionHeader title={isRTL ? "شوهد مؤخراً" : "Recently viewed"} />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[330px] h-[128px] rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          </section>
        ) : recentCards.length > 0 ? (
          <section className="mt-8">
            <SectionHeader title={isRTL ? "شوهد مؤخراً" : "Recently viewed"} />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
              {recentCards.map((fp) => (
                <button
                  key={`recent-${fp.service_id}`}
                  onClick={() => openProviderDetailsFromFeatured(fp)}
                  className={cn(
                    "snap-start flex-shrink-0 w-[330px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                    isRTL && "text-right",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
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
                      <h3 className="text-[16px] font-semibold text-[#111] truncate">{fp.provider_name}</h3>
                      <p className="text-[13px] text-[#777] mt-1 truncate">{fp.service_title}</p>
                    </div>

                    <ChevronRight className={cn("h-6 w-6 text-[#C9C9C9]", isRTL && "rotate-180")} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Popular Services (horizontal) */}
        {popularServices.length > 0 ? (
          <section className="mt-8">
            <SectionHeader title={isRTL ? "الخدمات الأكثر طلباً" : "Popular services"} />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
              {popularServices.map((service) => {
                const IconComponent = service.icon;
                const displayName = language === "ar" && service.name_ar ? service.name_ar : service.name;

                return (
                  <button
                    key={service.id}
                    onClick={() => openServiceSheetFromSubcategory(service)}
                    className={cn(
                      "snap-start flex-shrink-0 w-[260px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                      isRTL && "text-right",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", service.color)}>
                        <IconComponent className="h-7 w-7 text-[#111]" strokeWidth={1.7} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#111] line-clamp-1">{displayName}</h3>
                        <p className="text-[12px] text-[#777] mt-1">{isRTL ? "عرض مقدمي الخدمة" : "View providers"}</p>
                      </div>

                      <ChevronRight className={cn("h-6 w-6 text-[#C9C9C9]", isRTL && "rotate-180")} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Footer */}
        <section className="mt-10">
          <div className="border-t border-gray-200 pt-4 pb-2 text-[12px] text-[#777] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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
              onClick={() => window.alert(isRTL ? "سيتم إضافة الشروط قريباً" : "Terms will be added soon")}
              className="hover:text-[#111] transition-colors"
            >
              {isRTL ? "الشروط" : "Terms"}
            </button>
            <button
              onClick={() => window.alert(isRTL ? "سيتم إضافة الخصوصية قريباً" : "Privacy will be added soon")}
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

      {/* Category Drawer */}
      <Drawer open={categoryDrawerOpen} onOpenChange={setCategoryDrawerOpen}>
        <DrawerContent className="h-[90vh] flex flex-col overflow-hidden rounded-t-3xl p-0">
          <DrawerHeader className="relative pb-2 px-4 pt-4">
            <DrawerClose
              className={cn(
                "absolute top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                isRTL ? "left-4" : "right-4",
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
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? "اختر خدمة" : "Choose a service"}</p>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1">
            <div className="px-4 pb-5" dir={isRTL ? "rtl" : "ltr"}>
              {drawerSubcategories.length > 0 ? (
                <div className="space-y-2">
                  {drawerSubcategories.map((service) => {
                    const IconComponent = service.icon;
                    const displayName = language === "ar" && service.name_ar ? service.name_ar : service.name;

                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          setCategoryDrawerOpen(false);
                          openServiceSheetFromSubcategory(service);
                        }}
                        className={cn(
                          "relative overflow-hidden w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 transition-colors hover:bg-gray-50 active:bg-gray-100",
                          isRTL && "flex-row-reverse text-right",
                        )}
                      >
                        <div className={cn("absolute inset-0 opacity-10", service.color)} />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/75" />

                        <div
                          className={cn(
                            "relative h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                            service.color,
                          )}
                        >
                          <IconComponent className="h-7 w-7 text-[#111]" strokeWidth={1.7} />
                        </div>

                        <div className="relative flex-1 min-w-0">
                          <h3 className="text-[16px] font-semibold text-[#111] line-clamp-1">{displayName}</h3>
                          <p className="text-[13px] text-[#777] mt-1">
                            {isRTL ? "عرض مقدمي الخدمة" : "View providers"}
                          </p>
                        </div>

                        <ChevronRight
                          className={cn("relative h-6 w-6 text-[#C9C9C9] flex-shrink-0", isRTL && "rotate-180")}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  {isRTL ? "لا توجد خدمات في هذه الفئة" : "No services in this category"}
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
