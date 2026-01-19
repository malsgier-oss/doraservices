// DORA_HUB_PATCH_v4 (ticker+banner-loop+no-all-cities+sticky-fullwidth)
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Search, Wrench, Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper, Droplets, Wind, Fuel, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

import { useCategories } from "@/hooks/useCategories";
import { useCities } from "@/hooks/useCities";
import { useHubBanners } from "@/hooks/useHubBanners";
import { useHubShelves } from "@/hooks/useHubShelves";
import { useHubChips } from "@/hooks/useHubChips";
import { useHubTopCategories } from "@/hooks/useHubTopCategories";
import { useFeaturedSubcategories } from "@/hooks/useFeaturedSubcategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { CategoryBrowseSheet } from "@/components/hub/CategoryBrowseSheet";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, useUnreadCount, useNotificationMutations } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
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

  const subcatByName = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      name_ar?: string | null;
      icon: LucideIcon;
      color: string | null;
    }>();

    for (const sc of (allSubcategories || []) as any[]) {
      const name = String(sc?.name || "").trim();
      if (!name) continue;
      const iconKey = String(sc?.icon || "");
      const icon = ICON_MAP[iconKey] || Wrench;
      map.set(name, {
        id: String(sc.id),
        name,
        name_ar: sc?.name_ar ?? null,
        icon,
        color: (sc?.color ?? null) as string | null,
      });
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
  type ActiveSheet = "none" | "browse" | "providers";
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>("none");

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
    return {
      id: selectedSubcategory.id,
      titleKey: selectedSubcategory.name_ar || selectedSubcategory.name,
      descKey: "",
      // IMPORTANT: ServiceDetailSheet filters services.category by this value.
      // We use the subcategory English name as the canonical stored value.
      category: selectedSubcategory.name,
      categoryName: selectedSubcategory.name,
      categoryNameAr: selectedSubcategory.name_ar || undefined,
      color: selectedSubcategory.color || "#888888",
      icon: selectedSubcategory.icon,
    };
  }, [selectedSubcategory]);

  function openSubcategoryProviders(subcat: { id: string; name: string; name_ar?: string | null; icon: LucideIcon; color: string | null }, providerServiceId?: string | null) {
    setSelectedSubcategory(subcat);
    setInitialProviderServiceId(providerServiceId || null);
    setActiveSheet("providers");
  }

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

  // City label (no "All cities" option; auto-picks first city)
  const cityLabel = selectedCity ? (selectedCity.name_ar || selectedCity.name) : t("اختر المدينة", "Choose a city");

  // Banner carousel: auto-advance but still swipe/scroll manually.
  const bannerRowRef = useRef<HTMLDivElement | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerPauseUntilRef = useRef<number>(0);
  const bannerScrollRaf = useRef<number | null>(null);

  // Header must stay frozen even if parent containers use overflow/transform.
  // Using position:fixed + measured spacer is more reliable than sticky in complex layouts.
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const bannerProgrammaticRef = useRef(false);

  // Measure the fixed header height so content below doesn't get hidden under it.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const measure = () => {
      // +1px safety to avoid overlap on some mobile browsers.
      setHeaderHeight(el.offsetHeight + 1);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [language, isRTL, cityId, query, announcements.length, chips.length]);

  // Keep bannerIndex in range when banners change.
  useEffect(() => {
    if (banners.length === 0) return;
    setBannerIndex((i) => Math.min(i, banners.length - 1));
  }, [banners.length]);

  // Auto-advance.
  useEffect(() => {
    if (banners.length <= 1) return;

    const id = window.setInterval(() => {
      // If user interacted recently, delay autoplay resume.
      if (Date.now() < bannerPauseUntilRef.current) return;
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4500);

    return () => window.clearInterval(id);
  }, [banners.length]);

  // Scroll to active banner.
  useEffect(() => {
    const el = bannerRowRef.current;
    if (!el) return;
    const child = el.children.item(bannerIndex) as HTMLElement | null;
    if (!child) return;
    // Prevent feedback loops: scrollIntoView triggers onScroll which would update bannerIndex again.
    bannerProgrammaticRef.current = true;
    const timeout = window.setTimeout(() => {
      bannerProgrammaticRef.current = false;
    }, 650);

    // Center the active banner (better feel on mobile)
    child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    return () => window.clearTimeout(timeout);
  }, [bannerIndex]);

  function handleBannerScroll() {
    if (bannerProgrammaticRef.current) return;
    // Pause autoplay briefly during/after manual swipe/scroll.
    bannerPauseUntilRef.current = Date.now() + 6000;
    if (bannerScrollRaf.current) return;
    bannerScrollRaf.current = window.requestAnimationFrame(() => {
      bannerScrollRaf.current = null;
      const el = bannerRowRef.current;
      if (!el) return;

      const containerRect = el.getBoundingClientRect();
      // Choose the banner whose CENTER is closest to the container CENTER.
      const targetX = (containerRect.left + containerRect.right) / 2;

      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children.item(i) as HTMLElement | null;
        if (!child) continue;
        const r = child.getBoundingClientRect();
        const anchorX = (r.left + r.right) / 2;
        const dist = Math.abs(anchorX - targetX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      setBannerIndex(bestIdx);
    });
  }

  useEffect(() => {
    return () => {
      if (bannerScrollRaf.current) window.cancelAnimationFrame(bannerScrollRaf.current);
    };
  }, []);

  return (
    <div className={`min-h-screen bg-background pb-20 overflow-x-hidden ${isRTL ? "rtl" : ""}`}>
      {/* Sticky top: Header + Search/City + Chips */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-4 space-y-4 pb-3 border-b border-border shadow-sm">
        <div className="mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-xl font-semibold leading-tight ${isRTL ? "text-right" : "text-left"}`}>{t("شن تحتاج اليوم؟", "What do you need today?")}</div>
              <div className={`text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}>{t("ابحث وتواصل مباشرة", "Search and contact directly")}</div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
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
                    className="relative h-9 w-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
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
                          className="h-7 text-xs"
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
          <div className="space-y-2">
            {/* Option 1: City inside search row */}
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 px-3 rounded-xl shrink-0 justify-between gap-2"
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
                          className="w-full justify-start"
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
                  className={`absolute top-3 h-4 w-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`}
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`${isRTL ? "pr-9" : "pl-9"} h-10 rounded-xl`}
                  placeholder={t("ابحث عن خدمة… كهرباء، سباكة، تكييف", "Search services… electricity, plumbing, AC")}
                />
              </div>
            </div>

            {activeAnnouncement && (
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <div className="text-sm text-muted-foreground">📢 📢 {activeAnnouncement.message}</div>
              </div>
            )}

            {/* Search results (category matches) */}
            {queryTrim && (
              <Card>
                <CardContent className="p-2 space-y-1">
                {filteredCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">{t("لا توجد نتائج", "No results")}</div>
                ) : (
                  filteredCategories.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full justify-start"
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
                      className="rounded-full shrink-0 px-4"
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
      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-4">

        {/* Banner carousel (auto + manual swipe/scroll) */}
        {banners.length > 0 && (
          <div className="space-y-2">
            <div
              ref={bannerRowRef}
              // Carousels are kept LTR even in RTL to avoid reversed scroll quirks on mobile.
              dir="ltr"
              className={`flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory ${banners.length === 1 ? "justify-center" : ""}`}
              style={{
                WebkitOverflowScrolling: "touch" as any,
                scrollPaddingInline: "16px",
                touchAction: "pan-y",
              }}
              onScroll={handleBannerScroll}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onPointerDown={() => {
                bannerPauseUntilRef.current = Date.now() + 6000;
              }}
              onMouseEnter={() => {
                bannerPauseUntilRef.current = Date.now() + 6000;
              }}
            >
              {banners.map((b) => {
                const url = publicUrlsById[b.id];
                const clickable = b.target_type !== "none";
                return (
                  <button
                    key={b.id}
                    // 92% ensures the first/last banner can still center nicely with 16px padding.
                    className={`shrink-0 w-[92%] md:w-[70%] rounded-xl overflow-hidden border bg-card snap-center ${clickable ? "cursor-pointer" : "cursor-default"}`}
                    style={{ scrollSnapAlign: "center" }}
                    onClick={() => {
                      if (b.target_type === "none") return;
                      if (b.target_type === "category" && b.target_category_id) {
                        openCategoryBrowse(b.target_category_id);
                      } else if (b.target_type === "subcategory" && b.target_subcategory_id) {
                        const sc = (allSubcategories || []).find((s) => s.id === b.target_subcategory_id);
                        if (!sc) return;
                        const Icon = ICON_MAP[sc.icon] || Wrench;
                        openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color });
                      } else if (b.target_type === "shelf" && b.target_shelf_id) {
                        const el = b.target_shelf_id === "featured-services"
                          ? document.getElementById("featured-services")
                          : document.getElementById(`shelf-${b.target_shelf_id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                  >
                    <div className="h-36 w-full bg-muted">
                      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Simple dots */}
            {banners.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    aria-label={`Banner ${i + 1}`}
                    className={`h-2 w-2 rounded-full transition ${i === bannerIndex ? "bg-foreground" : "bg-muted-foreground/30"}`}
                    onClick={() => {
                      bannerPauseUntilRef.current = Date.now() + 6000;
                      setBannerIndex(i);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services (MAIN categories) grid - exactly 8 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">{t("الخدمات", "Categories")}</div>
          </div>

          {categoriesLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {gridCategories.map((c) => {
                const Icon = ICON_MAP[c.icon] || Wrench;
                return (
                  <button
                    key={c.id}
                    className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent transition"
                    onClick={() => openCategoryBrowse(c.id)}
                  >
                    <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: c.color + "22" }}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-xs text-center leading-tight line-clamp-2">{c.name_ar || c.name}</div>
                  </button>
                );
              })}
            </div>
            )}
          </div>

        {/* Featured providers/services (horizontal) */}
        {featuredServices.length > 0 && (
          <div className="space-y-2" id="featured-providers">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">{t("مزودين مميزين", "Featured providers")}</div>
              <div className="text-xs text-muted-foreground">{featuredServices.length}</div>
            </div>

            <div
              dir={isRTL ? "rtl" : "ltr"}
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x" }}
            >
              {featuredServices.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  className="shrink-0 w-[68vw] max-w-[320px] snap-center cursor-pointer focus:outline-none"
                  onClick={() => {
                    const subcat = subcatByName.get(String(p.category || "").trim());
                    if (!subcat) {
                      toast({ title: t("تعذر فتح الخدمة", "Could not open"), description: t("هذه الخدمة غير مرتبطة بتصنيف معروف", "This service category is not linked to a known subcategory"), variant: "destructive" });
                      return;
                    }
                    openSubcategoryProviders(subcat, p.id);
                  }}
                  onPointerUp={() => {
                    const subcat = subcatByName.get(String(p.category || "").trim());
                    if (!subcat) return;
                    openSubcategoryProviders(subcat, p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    const subcat = subcatByName.get(String(p.category || "").trim());
                    if (!subcat) return;
                    openSubcategoryProviders(subcat, p.id);
                  }}
                >
                  <div className="rounded-2xl border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                    <div className="h-[110px] bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                          {t("بدون صورة", "No photo")}
                        </div>
                      )}
                    </div>
                    <div className="p-3" dir="rtl">
                      <div className="font-semibold text-sm text-foreground line-clamp-1">
                        {p.provider_name || t("مزود", "Provider")}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {p.title}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="line-clamp-1">{p.city || ""}</span>
                        <span className="line-clamp-1">{p.sub_city || ""}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured services (subcategories) */}
        {featuredSubcats.length > 0 && (
          <div className="space-y-2" id="featured-services">
            <div className="text-base font-semibold">{t("الخدمات المميزة", "Featured services")}</div>
            <div
              dir={isRTL ? "rtl" : "ltr"}
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
            >
              {featuredSubcats.map((sc) => {
                const Icon = ICON_MAP[sc.icon] || Wrench;
                return (
                  <button
                    key={sc.id}
                    className="shrink-0 w-[34%] md:w-[22%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                    style={{ scrollSnapAlign: "start" }}
                    onClick={() => openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color })}
                  >
                    <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: (sc.color || "#888") + "22" }}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-xs text-center leading-tight line-clamp-2">{sc.name_ar || sc.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Shelves (admin-controlled) */}
        <div className="space-y-6">
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
                <div key={shelf.id} className="space-y-2" id={`shelf-${shelf.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{shelf.title_ar}</div>
                    <Button variant="ghost" size="sm" onClick={() => openCategoryBrowse(cat.id)}>
                      عرض الكل
                    </Button>
                  </div>

                  <div
                    dir={isRTL ? "rtl" : "ltr"}
                    className="flex gap-3 overflow-x-auto pb-2"
                    style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
                  >
                      {subcats.map((sc) => {
                        const Icon = ICON_MAP[sc.icon] || Wrench;
                        return (
                        <button
                          key={sc.id}
                          className="shrink-0 w-[44%] md:w-[28%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          style={{ scrollSnapAlign: "start" }}
                          onClick={() => openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color })}
                        >
                          <div
                            className="h-12 w-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: (sc.color || "#888") + "22" }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{sc.name_ar || sc.name}</div>
                        </button>
                        );
                      })}
                  </div>
                </div>
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
              <div key={shelf.id} className="space-y-2" id={`shelf-${shelf.id}`}>
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">{shelf.title_ar}</div>
                </div>

                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
                >
                    {subcats.map((s) => {
                      const Icon = ICON_MAP[s.icon] || Wrench;
                      return (
                        <button
                          key={s.id}
                          className="shrink-0 w-[34%] md:w-[22%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          style={{ scrollSnapAlign: "start" }}
                          onClick={() => openSubcategoryProviders({ id: s.id, name: s.name, name_ar: s.name_ar, icon: Icon, color: s.color })}
                        >
                          <div
                            className="h-12 w-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: (s.color || "#888") + "22" }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{s.name_ar || s.name}</div>
                        </button>
                      );
                    })}

                    {catsFallback.map((c) => {
                      const Icon = ICON_MAP[c.icon] || Wrench;
                      return (
                        <button
                          key={c.id}
                          className="shrink-0 w-[34%] md:w-[22%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          style={{ scrollSnapAlign: "start" }}
                          onClick={() => openCategoryBrowse(c.id)}
                        >
                          <div
                            className="h-12 w-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: (c.color || "#888") + "22" }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{c.name_ar || c.name}</div>
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer links */}
        <div className="pt-6 pb-2 border-t text-sm text-muted-foreground space-y-3">
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
      )}

      <MobileNav />
    </div>
  );
}
