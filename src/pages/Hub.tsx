import { useMemo, useState } from "react";
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
  ChevronRight,
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
  Mail,
  Shield,
  Info,
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
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";

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
  id: string;
  icon: LucideIcon;
  color: string;
  name: string;
  name_ar: string | null;
  category_id: string;

  // Optional (future/admin controlled)
  is_featured?: boolean;
  featured_order?: number | null;
}

// Filter suggestion chip component
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
        "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        isActive ? "bg-[#333] text-white" : "bg-white text-[#666] border border-gray-100 hover:bg-gray-50"
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
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>({
    city: null,
    subCity: null,
    minRating: false,
  });

  // Map subcategories to service items
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
          "bg-[#FFEBD4]",
        name: sub.name,
        name_ar: sub.name_ar,
        category_id: sub.category_id,

        // Optional (won't break if not in DB)
        is_featured: Boolean(sub.is_featured),
        featured_order: sub.featured_order ?? null,
      }));
  }, [subcategories, categories]);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || (isRTL ? "م" : "U");

  const selectedCategoryData = categories?.find((c) => c.id === selectedCategory);
  const selectedCategoryLabel = selectedCategoryData
    ? language === "ar" && selectedCategoryData.name_ar
      ? selectedCategoryData.name_ar
      : selectedCategoryData.name
    : null;

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
    setSearchQuery("");
  };

  const handleServiceClick = (service: ServiceItem) => {
    setSelectedService(service);
    setSheetOpen(true);
  };

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

  const hasActiveFilters = Boolean(
    selectedCategory ||
      searchQuery.trim() ||
      searchFilters.city ||
      searchFilters.subCity ||
      searchFilters.minRating
  );

  // Filter services based on search + selectedCategory
  const filteredServices = useMemo(() => {
    let services = serviceItems;

    if (selectedCategory) {
      services = services.filter((s) => s.category_id === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter((s) => {
        const en = s.name?.toLowerCase() || "";
        const ar = (s.name_ar || "").toLowerCase();
        return en.includes(query) || ar.includes(query);
      });
    }

    // Stable order for premium feel
    services = [...services].sort((a, b) => {
      const an = (language === "ar" && a.name_ar ? a.name_ar : a.name) || "";
      const bn = (language === "ar" && b.name_ar ? b.name_ar : b.name) || "";
      return an.localeCompare(bn);
    });

    return services;
  }, [serviceItems, selectedCategory, searchQuery, language]);

  // Featured section: only shows when NO active filters/search
  const featuredServices = useMemo(() => {
    const featured = serviceItems
      .filter((s) => s.is_featured)
      .sort((a, b) => (a.featured_order ?? 9999) - (b.featured_order ?? 9999))
      .slice(0, 8);
    return featured;
  }, [serviceItems]);

  // Categories for grid (8 max)
  const categoryGrid = useMemo(() => {
    const list = (categories || []).filter((c: any) => c.is_active !== false);
    return list.slice(0, 8);
  }, [categories]);

  const openMail = () => {
    // You can change this later to your real support email
    window.location.href = "mailto:support@dora.ly";
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-24" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky Top Bar (Premium) */}
      <header className="sticky top-0 z-40 bg-[#F7F7F8]/90 backdrop-blur supports-[backdrop-filter]:bg-[#F7F7F8]/75 border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            {/* Profile */}
            <button
              onClick={() => (user ? navigate("/profile") : navigate("/auth"))}
              className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
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

            {/* Logo */}
            <div className="flex items-center gap-2">
              <img
                src={doraLogo}
                alt="Dora Logo"
                className="h-8 w-8 rounded-full object-cover"
              />
              <h1 className="text-lg font-bold text-[#111]">{t.appName}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-[#111]" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#A0A0A0]",
                  isRTL ? "right-4" : "left-4"
                )}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isRTL
                    ? "ابحث: كهربائي، سباك، تكييف…"
                    : "Search: electrician, plumber, AC…"
                }
                className={cn(
                  "h-12 rounded-2xl bg-white border border-gray-100 shadow-none text-base placeholder:text-[#A0A0A0]",
                  isRTL ? "pr-12 pl-10" : "pl-12 pr-10"
                )}
                dir={isRTL ? "rtl" : "ltr"}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-[#F0F0F0] flex items-center justify-center",
                    isRTL ? "left-3" : "right-3"
                  )}
                >
                  <X className="h-3.5 w-3.5 text-[#666]" />
                </button>
              )}
            </div>
          </div>

          {/* Filter row (compact, still available) */}
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
              onClick={() =>
                setSearchFilters((prev) => ({ ...prev, minRating: !prev.minRating }))
              }
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

      {/* Scrollable content */}
      <main className="px-4 pt-5 pb-10">
        {/* Optional banner (kept) */}
        <ReviewPromptBanner />

        {/* Categories (premium simple grid) */}
        <section className="mt-5">
          <SectionHeader title={isRTL ? "الفئات" : "Categories"} />
          {categoriesLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-[84px] rounded-2xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categoryGrid.map((cat: any) => {
                const IconComponent = ICON_MAP[cat.icon] || Home;
                const isSelected = selectedCategory === cat.id;
                const displayName =
                  language === "ar" && cat.name_ar ? cat.name_ar : cat.name;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      "h-[84px] rounded-2xl border border-gray-100 bg-white flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]",
                      isSelected && "ring-2 ring-[#111] ring-offset-2 ring-offset-[#F7F7F8]"
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", cat.color || "bg-[#F2F2F2]")}>
                      <IconComponent className="h-5 w-5 text-[#111]" strokeWidth={1.7} />
                    </div>
                    <span className="text-[11px] font-medium text-[#111] text-center px-1 leading-tight line-clamp-1">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* If user is filtering/searching: show results section only */}
        {hasActiveFilters ? (
          <section className="mt-8">
            <SectionHeader
              title={
                searchQuery
                  ? isRTL
                    ? "نتائج البحث"
                    : "Search results"
                  : selectedCategoryLabel || (isRTL ? "الخدمات" : "Services")
              }
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
                ? `${filteredServices.length} خدمة`
                : `${filteredServices.length} service${filteredServices.length !== 1 ? "s" : ""}`}
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {filteredServices.length > 0 ? (
                filteredServices.map((service, index) => {
                  const IconComponent = service.icon;
                  const displayName =
                    language === "ar" && service.name_ar ? service.name_ar : service.name;

                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100",
                        isRTL && "text-right flex-row-reverse",
                        index < filteredServices.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      <div
                        className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                          service.color
                        )}
                      >
                        <IconComponent className="h-6 w-6 text-[#111]" strokeWidth={1.7} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-[#111] line-clamp-1">
                          {displayName}
                        </h3>
                        <p className="text-xs text-[#777] mt-1">
                          {isRTL ? "اضغط لعرض المزودين" : "Tap to view providers"}
                        </p>
                      </div>

                      <ChevronRight
                        className={cn("h-5 w-5 text-[#C9C9C9] flex-shrink-0", isRTL && "rotate-180")}
                      />
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
                    {isRTL ? "جرّب كلمات مختلفة أو امسح الفلاتر" : "Try different terms or clear filters"}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Featured Services (horizontal) */}
            {featuredServices.length > 0 && (
              <section className="mt-8">
                <SectionHeader title={isRTL ? "مختار لك" : "Featured"} />
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {featuredServices.map((service) => {
                    const IconComponent = service.icon;
                    const displayName =
                      language === "ar" && service.name_ar ? service.name_ar : service.name;

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        className={cn(
                          "flex-shrink-0 w-[240px] rounded-2xl bg-white border border-gray-100 p-4 text-left transition-all active:scale-[0.98]",
                          isRTL && "text-right"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-12 w-12 rounded-2xl flex items-center justify-center",
                              service.color
                            )}
                          >
                            <IconComponent className="h-5 w-5 text-[#111]" strokeWidth={1.7} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-semibold text-[#111] line-clamp-1">
                              {displayName}
                            </h3>
                            <p className="text-xs text-[#777] mt-1">
                              {isRTL ? "أفضل مزودين متاحين" : "Top providers available"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-[#777]">
                            {isRTL ? "عرض" : "View"}
                          </span>
                          <ChevronRight
                            className={cn("h-4 w-4 text-[#C9C9C9]", isRTL && "rotate-180")}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Browse / All Services */}
            <section className="mt-8">
              <SectionHeader title={isRTL ? "كل الخدمات" : "Browse services"} />
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {filteredServices.length > 0 ? (
                  filteredServices.slice(0, 40).map((service, index) => {
                    const IconComponent = service.icon;
                    const displayName =
                      language === "ar" && service.name_ar ? service.name_ar : service.name;

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        className={cn(
                          "w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100",
                          isRTL && "text-right flex-row-reverse",
                          index < Math.min(filteredServices.length, 40) - 1 && "border-b border-gray-100"
                        )}
                      >
                        <div
                          className={cn(
                            "h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                            service.color
                          )}
                        >
                          <IconComponent className="h-6 w-6 text-[#111]" strokeWidth={1.7} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[16px] font-semibold text-[#111] line-clamp-1">
                            {displayName}
                          </h3>
                          <p className="text-xs text-[#777] mt-1">
                            {isRTL ? "اضغط لعرض المزودين" : "Tap to view providers"}
                          </p>
                        </div>

                        <ChevronRight
                          className={cn("h-5 w-5 text-[#C9C9C9] flex-shrink-0", isRTL && "rotate-180")}
                        />
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[#777] font-medium">
                      {isRTL ? "لا توجد خدمات حالياً" : "No services yet"}
                    </p>
                  </div>
                )}
              </div>

              {/* Small hint if there are more */}
              {filteredServices.length > 40 && (
                <p className="text-xs text-[#777] mt-3">
                  {isRTL ? "استخدم البحث لإظهار المزيد" : "Use search to find more services"}
                </p>
              )}
            </section>

            {/* Footer (complete ending) */}
            <section className="mt-10">
              <div className="rounded-2xl bg-white border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111]">
                      {isRTL ? "عن دورة" : "About Dora"}
                    </h3>
                    <p className="text-sm text-[#777] mt-1 leading-relaxed">
                      {isRTL
                        ? "دورة يساعدك توصل لمزود خدمة موثوق بسرعة — اتصال مباشر، بدون تعقيد."
                        : "Dora helps you reach trusted local service providers fast — direct calling, no hassle."}
                    </p>
                  </div>
                  <img
                    src={doraLogo}
                    alt="Dora"
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2">
                  <button
                    onClick={openMail}
                    className="w-full h-11 rounded-xl bg-[#111] text-white text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {isRTL ? "تواصل معنا" : "Contact us"}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => window.alert(isRTL ? "سيتم إضافة الشروط قريباً" : "Terms will be added soon")}
                      className="h-11 rounded-xl bg-[#F3F3F3] text-[#111] text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      {isRTL ? "الشروط" : "Terms"}
                    </button>
                    <button
                      onClick={() => window.alert(isRTL ? "سيتم إضافة الخصوصية قريباً" : "Privacy will be added soon")}
                      className="h-11 rounded-xl bg-[#F3F3F3] text-[#111] text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Info className="h-4 w-4" />
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
        onOpenChange={setSheetOpen}
        service={
          selectedService
            ? {
                id: selectedService.id,
                icon: selectedService.icon,
                color: selectedService.color,
                titleKey: selectedService.name,
                descKey: "",
                category: selectedService.name,
                categoryName: categories?.find((c) => c.id === selectedService.category_id)?.name || "",
                categoryNameAr: categories?.find((c) => c.id === selectedService.category_id)?.name_ar || "",
              }
            : null
        }
        filters={searchFilters}
      />
    </div>
  );
}