import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  User,
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
  X,
  Search,
  Star,
  MapPin,
  Hammer,
  Paintbrush,
  Battery,
  Calculator,
  Sparkles,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import {
  SearchFilters,
  ActiveFilterChips,
  SearchFiltersState,
} from "@/components/search/SearchFilters";
import { ReviewPromptBanner } from "@/components/review/ReviewPromptBanner";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
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

  // Optional (admin-controlled in the future)
  is_popular?: boolean;
  popular_order?: number | null;
}

type FeaturedProviderCard = {
  service_id: string; // services.id
  category: string; // services.category
  service_title: string; // services.title (provider’s service title)
  provider_name: string;
  provider_phone: string;
  provider_avatar: string | null;
  provider_city: string | null;
  provider_sub_city: string | null;
};

function FilterSuggestionChip({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
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

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL, language } = useLanguage();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: subcategories } = useAllSubcategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sheet service (subcategory-based) OR featured-provider-based
  const [selectedService, setSelectedService] = useState<{
    id: string;
    titleKey: string;
    descKey: string;
    category: string;
    categoryName?: string;
    categoryNameAr?: string;
    color: string;
    icon: LucideIcon;
  } | null>(null);

  // If set, sheet opens directly to provider detail
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);

  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>({
    city: null,
    subCity: null,
    minRating: false,
  });

  const [featuredProviders, setFeaturedProviders] = useState<FeaturedProviderCard[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || (isRTL ? "م" : "U");

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
          categories?.find((c) => c.id === sub.category_id)?.color ||
          "bg-[#F2F2F2]",
        name: sub.name,
        name_ar: sub.name_ar,
        category_id: sub.category_id,

        // Optional future fields (won’t break if not in DB)
        is_popular: Boolean(sub.is_popular),
        popular_order: sub.popular_order ?? null,
      }));
  }, [subcategories, categories]);

  const categoryGrid = useMemo(() => {
    const list = (categories || []).filter((c: any) => c.is_active !== false);
    return list.slice(0, 8);
  }, [categories]);

  const selectedCategoryData = categories?.find((c) => c.id === selectedCategory);

  // “Popular services” (practical grid)
  const popularServices: ServiceItem[] = useMemo(() => {
    let list = serviceItems;

    // If category selected, popular should feel “smart”
    if (selectedCategory) {
      list = list.filter((s) => s.category_id === selectedCategory);
    }

    // Prefer admin-picked popular if available, otherwise fallback
    const flagged = list.filter((s) => s.is_popular);
    if (flagged.length > 0) {
      return [...flagged]
        .sort((a, b) => (a.popular_order ?? 9999) - (b.popular_order ?? 9999))
        .slice(0, 12);
    }

    // Fallback: stable alphabetical list (practical and safe)
    const sorted = [...list].sort((a, b) => {
      const an = (language === "ar" && a.name_ar ? a.name_ar : a.name) || "";
      const bn = (language === "ar" && b.name_ar ? b.name_ar : b.name) || "";
      return an.localeCompare(bn);
    });

    return sorted.slice(0, 12);
  }, [serviceItems, selectedCategory, language]);

  const hasActiveFilters = Boolean(
    selectedCategory ||
      searchQuery.trim() ||
      searchFilters.city ||
      searchFilters.subCity ||
      searchFilters.minRating
  );

  // Filter services ONLY used for search results section (when user searches)
  const searchedServices = useMemo(() => {
    let list = serviceItems;

    if (selectedCategory) list = list.filter((s) => s.category_id === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const en = (s.name || "").toLowerCase();
        const ar = (s.name_ar || "").toLowerCase();
        return en.includes(q) || ar.includes(q);
      });
    }

    list = [...list].sort((a, b) => {
      const an = (language === "ar" && a.name_ar ? a.name_ar : a.name) || "";
      const bn = (language === "ar" && b.name_ar ? b.name_ar : b.name) || "";
      return an.localeCompare(bn);
    });

    return list;
  }, [serviceItems, selectedCategory, searchQuery, language]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setSearchFilters({ city: null, subCity: null, minRating: false });
  };

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
    // Clear “open directly to provider” mode
    setInitialProviderServiceId(null);

    const category = categories?.find((c) => c.id === service.category_id);

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

  const openProviderDetailsFromFeatured = (fp: FeaturedProviderCard) => {
    // We open ServiceDetailSheet for the provider’s category,
    // then auto-select the provider by services.id (initialProviderServiceId).
    setInitialProviderServiceId(fp.service_id);

    setSelectedService({
      id: fp.service_id,
      icon: Wrench,
      color: "bg-[#F2F2F2]",
      titleKey: fp.service_title,
      descKey: "",
      category: fp.category,
      categoryName: fp.category,
      categoryNameAr: fp.category,
    });

    setSheetOpen(true);
  };

  // Fetch featured providers (from services table)
  useEffect(() => {
    const fetchFeaturedProviders = async () => {
      setFeaturedLoading(true);
      try {
        // Select * to avoid breaking if is_featured doesn’t exist yet
        const { data: servicesData, error } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .or("is_paused.is.null,is_paused.eq.false")
          .order("created_at", { ascending: false })
          .limit(80);

        if (error) {
          console.error("Error fetching services for featured providers:", error);
          setFeaturedProviders([]);
          return;
        }

        const featured = (servicesData || []).filter((s: any) => s.is_featured === true);
        if (featured.length === 0) {
          setFeaturedProviders([]);
          return;
        }

        // Pull profiles for claimed services (approved only)
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

        // Enrich and keep both: unclaimed bulk + claimed approved
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
            };
          });

        // If featured_order exists, sort by it; otherwise keep stable
        const sorted = [...cards].sort((a: any, b: any) => {
          const ao = (featured.find((x: any) => x.id === a.service_id)?.featured_order ?? 9999);
          const bo = (featured.find((x: any) => x.id === b.service_id)?.featured_order ?? 9999);
          return ao - bo;
        });

        setFeaturedProviders(sorted.slice(0, 12));
      } catch (e) {
        console.error("Featured providers fetch error:", e);
        setFeaturedProviders([]);
      } finally {
        setFeaturedLoading(false);
      }
    };

    fetchFeaturedProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Top Bar (no logo) */}
      <header className="sticky top-0 z-40 bg-[#F7F7F8]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F7F7F8]/75 border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            {/* Profile */}
            <button
              onClick={() => (user ? navigate("/profile") : navigate("/auth"))}
              className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center"
            >
              {user ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#111] text-white text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-5 w-5 text-[#111]" />
              )}
            </button>

            {/* Center: simple title (no logo) */}
            <div className="flex flex-col items-center leading-none">
              <span className="text-[13px] font-semibold text-[#111]">
                {t.appName}
              </span>
              <span className="text-[11px] text-[#777]">
                {isRTL ? "خدمات قريبة منك" : "Local services"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <Bell className="h-5 w-5 text-[#111]" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#8F8F8F]",
                  isRTL ? "right-4" : "left-4"
                )}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? "ابحث: كهربائي، سباك، تكييف…" : "Search: electrician, plumber, AC…"}
                className={cn(
                  "h-12 rounded-2xl bg-white border border-gray-200 shadow-none text-base placeholder:text-[#8F8F8F]",
                  isRTL ? "pr-12 pl-10" : "pl-12 pr-10"
                )}
                dir={isRTL ? "rtl" : "ltr"}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#EFEFEF] flex items-center justify-center",
                    isRTL ? "left-3" : "right-3"
                  )}
                >
                  <X className="h-3.5 w-3.5 text-[#666]" />
                </button>
              )}
            </div>
          </div>

          {/* Filter row (stronger visibility in English) */}
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <FilterSuggestionChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={isRTL ? "طرابلس" : "Tripoli"}
              isActive={searchFilters.city === "tripoli"}
              onClick={() =>
                setSearchFilters((prev) => ({
                  ...prev,
                  city: prev.city === "tripoli" ? null : "tripoli",
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
                }))
              }
            />
            <FilterSuggestionChip
              icon={<Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
              label={isRTL ? "4+ نجوم" : "4+ Stars"}
              isActive={Boolean(searchFilters.minRating)}
              onClick={() => setSearchFilters((prev) => ({ ...prev, minRating: !prev.minRating }))}
            />
            <SearchFilters filters={searchFilters} onFiltersChange={setSearchFilters} />
          </div>

          {(searchFilters.city || searchFilters.subCity || searchFilters.minRating) && (
            <div className="mt-2">
              <ActiveFilterChips filters={searchFilters} onRemoveFilter={handleRemoveFilter} />
            </div>
          )}
        </div>
      </header>

      {/* Scroll content */}
      <main className="px-4 pt-5 pb-10">
        <ReviewPromptBanner />

        {/* Categories (bigger tiles) */}
        <section className="mt-5">
          <SectionHeader title={isRTL ? "الفئات" : "Categories"} />
          {categoriesLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[102px] rounded-2xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categoryGrid.map((cat: any) => {
                const IconComponent = ICON_MAP[cat.icon] || Home;
                const isSelected = selectedCategory === cat.id;
                const displayName = language === "ar" && cat.name_ar ? cat.name_ar : cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory((prev) => (prev === cat.id ? null : cat.id))}
                    className={cn(
                      "h-[102px] rounded-2xl border bg-white border-gray-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]",
                      isSelected && "ring-2 ring-[#111] ring-offset-2 ring-offset-[#F7F7F8]"
                    )}
                  >
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", cat.color || "bg-[#F2F2F2]")}>
                      <IconComponent className="h-6 w-6 text-[#111]" strokeWidth={1.7} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#111] text-center px-1 leading-tight line-clamp-1">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* If user is searching/filtering, show search results (services) */}
        {hasActiveFilters && searchQuery.trim() ? (
          <section className="mt-8">
            <SectionHeader
              title={isRTL ? "نتائج البحث" : "Search results"}
              action={
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-[#777] hover:text-[#111] transition-colors"
                >
                  <X className="h-4 w-4" />
                  {isRTL ? "مسح الكل" : "Clear all"}
                </button>
              }
            />

            <p className="text-sm text-[#777] mb-4">
              {isRTL
                ? `${searchedServices.length} خدمة`
                : `${searchedServices.length} service${searchedServices.length !== 1 ? "s" : ""}`}
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {searchedServices.length > 0 ? (
                searchedServices.map((service, index) => {
                  const IconComponent = service.icon;
                  const displayName = language === "ar" && service.name_ar ? service.name_ar : service.name;

                  return (
                    <button
                      key={service.id}
                      onClick={() => openServiceSheetFromSubcategory(service)}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100",
                        isRTL && "text-right flex-row-reverse",
                        index < searchedServices.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0", service.color)}>
                        <IconComponent className="h-6 w-6 text-[#111]" strokeWidth={1.7} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-[#111] line-clamp-1">{displayName}</h3>
                        <p className="text-xs text-[#777] mt-1">
                          {isRTL ? "اضغط لعرض مقدمي الخدمة" : "Tap to view providers"}
                        </p>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 text-[#C9C9C9] flex-shrink-0", isRTL && "rotate-180")} />
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-[#777] font-medium">
                    {isRTL ? "لم نجد خدمات مطابقة" : "No matching services found"}
                  </p>
                  <p className="text-sm text-[#999] mt-1">
                    {isRTL ? "جرّب كلمات مختلفة" : "Try different search terms"}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Featured Providers (horizontal big cards) */}
            <section className="mt-8">
              <SectionHeader title={isRTL ? "مقدمي خدمة مختارين" : "Featured providers"} />
              {featuredLoading ? (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[310px] h-[120px] rounded-2xl bg-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : featuredProviders.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {featuredProviders.map((fp) => (
                    <button
                      key={fp.service_id}
                      onClick={() => openProviderDetailsFromFeatured(fp)}
                      className={cn(
                        "flex-shrink-0 w-[310px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
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
                        </div>

                        <ChevronRight className={cn("h-5 w-5 text-[#C9C9C9]", isRTL && "rotate-180")} />
                      </div>

                      <div className="mt-3 text-xs text-[#777]">
                        {fp.provider_city ? (isRTL ? "المدينة: " : "City: ") : ""}
                        <span className="text-[#111] font-semibold">
                          {fp.provider_city || (isRTL ? "غير محدد" : "Not set")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-gray-200 p-5 text-sm text-[#777]">
                  {isRTL
                    ? "لا يوجد مزودين مختارين حالياً (يمكن إضافتهم من لوحة التحكم لاحقاً)."
                    : "No featured providers yet (you can manage this from the admin panel later)."}
                </div>
              )}
            </section>

            {/* Popular Services (grid, practical like option 2) */}
            <section className="mt-8">
              <SectionHeader title={isRTL ? "الخدمات الأكثر طلباً" : "Popular services"} />
              <div className="grid grid-cols-2 gap-3">
                {popularServices.map((service) => {
                  const IconComponent = service.icon;
                  const displayName = language === "ar" && service.name_ar ? service.name_ar : service.name;

                  return (
                    <button
                      key={service.id}
                      onClick={() => openServiceSheetFromSubcategory(service)}
                      className={cn(
                        "h-[96px] rounded-2xl bg-white border border-gray-200 p-4 text-left transition-all active:scale-[0.98]",
                        isRTL && "text-right"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", service.color)}>
                          <IconComponent className="h-6 w-6 text-[#111]" strokeWidth={1.7} />
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

              {selectedCategoryData && (
                <p className="text-xs text-[#777] mt-3">
                  {isRTL
                    ? `النتائج داخل فئة: ${language === "ar" && selectedCategoryData.name_ar ? selectedCategoryData.name_ar : selectedCategoryData.name}`
                    : `Filtered by: ${language === "ar" && selectedCategoryData.name_ar ? selectedCategoryData.name_ar : selectedCategoryData.name}`}
                </p>
              )}
            </section>

            {/* Footer */}
            <section className="mt-10">
              <div className="rounded-2xl bg-white border border-gray-200 p-5">
                <h3 className="text-[15px] font-semibold text-[#111]">
                  {isRTL ? "عن دورة" : "About Dora"}
                </h3>
                <p className="text-sm text-[#777] mt-2 leading-relaxed">
                  {isRTL
                    ? "دورة يساعدك توصل لمزود خدمة بسرعة — اتصال مباشر، بدون تعقيد."
                    : "Dora helps you reach local providers fast — direct calling, no hassle."}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => (window.location.href = "mailto:support@dora.ly")}
                    className="w-full h-11 rounded-xl bg-[#111] text-white text-sm font-semibold"
                  >
                    {isRTL ? "تواصل معنا" : "Contact us"}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        window.alert(isRTL ? "سيتم إضافة الشروط قريباً" : "Terms will be added soon")
                      }
                      className="h-11 rounded-xl bg-[#F3F3F3] text-[#111] text-sm font-semibold"
                    >
                      {isRTL ? "الشروط" : "Terms"}
                    </button>
                    <button
                      onClick={() =>
                        window.alert(isRTL ? "سيتم إضافة الخصوصية قريباً" : "Privacy will be added soon")
                      }
                      className="h-11 rounded-xl bg-[#F3F3F3] text-[#111] text-sm font-semibold"
                    >
                      {isRTL ? "الخصوصية" : "Privacy"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <MobileNav />

      <ServiceDetailSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) {
            // reset “open provider directly” mode when closing
            setInitialProviderServiceId(null);
          }
        }}
        service={selectedService}
        filters={searchFilters}
        initialProviderServiceId={initialProviderServiceId}
      />
    </div>
  );
}