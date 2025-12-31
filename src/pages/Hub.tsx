import { useState, useMemo } from "react";
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
  LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import { SearchFilters, ActiveFilterChips, SearchFiltersState } from "@/components/search/SearchFilters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { cn } from "@/lib/utils";

// Icon mapping for dynamic icons from database
const ICON_MAP: Record<string, LucideIcon> = {
  Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper,
  Wrench, Droplets, Wind, Fuel, ClipboardCheck, Sun, Cog, Scale,
  Languages, Camera, UtensilsCrossed, Stethoscope, Activity,
  Hammer, Paintbrush, Battery, Calculator, Sparkles
};

interface ServiceItem {
  id: string;
  icon: LucideIcon;
  color: string;
  name: string;
  name_ar: string | null;
  category_id: string;
}

// Filter suggestion chip component
function FilterSuggestionChip({ 
  icon, 
  label, 
  isActive, 
  onClick 
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
        isActive 
          ? "bg-[#333] text-white" 
          : "bg-white text-[#666] shadow-sm hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
    </button>
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
      .filter(sub => sub.is_active !== false)
      .map(sub => ({
        id: sub.id,
        icon: ICON_MAP[sub.icon] || Wrench,
        color: sub.color || categories?.find(c => c.id === sub.category_id)?.color || "bg-[#FFEBD4]",
        name: sub.name,
        name_ar: sub.name_ar,
        category_id: sub.category_id,
      }));
  }, [subcategories, categories]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
    setSearchQuery(""); // Clear search when selecting category
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
      // Also clear sub-city when clearing city
      setSearchFilters(prev => ({ ...prev, city: null, subCity: null }));
    } else {
      setSearchFilters(prev => ({
        ...prev,
        [key]: key === "minRating" ? false : null,
      }));
    }
  };

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    let services = serviceItems;

    // Filter by category
    if (selectedCategory) {
      services = services.filter(s => s.category_id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter(s => {
        return s.name.toLowerCase().includes(query) || 
               (s.name_ar && s.name_ar.toLowerCase().includes(query));
      });
    }

    return services;
  }, [selectedCategory, searchQuery, serviceItems]);

  const hasActiveFilters = selectedCategory || searchQuery.trim() || searchFilters.city || searchFilters.subCity || searchFilters.minRating;

  const selectedCategoryData = categories?.find(c => c.id === selectedCategory);
  const selectedCategoryLabel = selectedCategoryData
    ? (language === "ar" && selectedCategoryData.name_ar ? selectedCategoryData.name_ar : selectedCategoryData.name)
    : null;

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || (isRTL ? "م" : "U");

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-20" dir={isRTL ? "rtl" : "ltr"}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#F9F9F9] px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Profile Icon */}
          <button 
            onClick={() => user ? navigate("/profile") : navigate("/auth")}
            className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            {user ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-[#333] text-white text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-5 w-5 text-[#333]" />
            )}
          </button>

          {/* Logo */}
          <h1 className="text-xl font-bold text-[#333]">{t.appName}</h1>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Bell className="h-5 w-5 text-[#333]" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#999]",
                isRTL ? "right-4" : "left-4"
              )}
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? "ابحث عن كهربائي، سباك، محامي..." : "Search for electrician, plumber, lawyer..."}
              className={cn(
                "h-12 rounded-[20px] bg-white border-0 shadow-sm text-base placeholder:text-[#999]",
                isRTL ? "pr-12 pl-10" : "pl-12 pr-10"
              )}
              dir={isRTL ? "rtl" : "ltr"}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#EEE] flex items-center justify-center",
                  isRTL ? "left-3" : "right-3"
                )}
              >
                <X className="h-3 w-3 text-[#666]" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Suggestions */}
        <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <FilterSuggestionChip
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={isRTL ? "طرابلس" : "Tripoli"}
            isActive={searchFilters.city === "tripoli"}
            onClick={() => setSearchFilters(prev => ({ 
              ...prev, 
              city: prev.city === "tripoli" ? null : "tripoli" 
            }))}
          />
          <FilterSuggestionChip
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={isRTL ? "بنغازي" : "Benghazi"}
            isActive={searchFilters.city === "benghazi"}
            onClick={() => setSearchFilters(prev => ({ 
              ...prev, 
              city: prev.city === "benghazi" ? null : "benghazi" 
            }))}
          />
          <FilterSuggestionChip
            icon={<MapPin className="h-3.5 w-3.5" />}
            label={isRTL ? "مصراتة" : "Misrata"}
            isActive={searchFilters.city === "misrata"}
            onClick={() => setSearchFilters(prev => ({ 
              ...prev, 
              city: prev.city === "misrata" ? null : "misrata" 
            }))}
          />
          <FilterSuggestionChip
            icon={<Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
            label={isRTL ? "4+ نجوم" : "4+ Stars"}
            isActive={searchFilters.minRating}
            onClick={() => setSearchFilters(prev => ({ ...prev, minRating: !prev.minRating }))}
          />
          <SearchFilters 
            filters={searchFilters} 
            onFiltersChange={setSearchFilters} 
          />
        </div>

        {/* Active Filter Chips */}
        {(searchFilters.city || searchFilters.subCity || searchFilters.minRating) && (
          <div className="mt-2">
            <ActiveFilterChips 
              filters={searchFilters} 
              onRemoveFilter={handleRemoveFilter} 
            />
          </div>
        )}
      </header>

      <main className="px-4 pb-8">
        {/* Category Hero Section */}
        <section className="mt-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {categoriesLoading ? (
              // Loading skeleton
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[100px] h-[100px] rounded-[20px] bg-gray-200 animate-pulse" />
              ))
            ) : (
              categories?.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon] || Home;
                const isSelected = selectedCategory === cat.id;
                const displayName = language === "ar" && cat.name_ar ? cat.name_ar : cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      "flex-shrink-0 w-[100px] h-[100px] rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                      cat.color,
                      isSelected && "ring-2 ring-[#333] ring-offset-2"
                    )}
                  >
                    <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#333] text-center px-1 leading-tight">
                      {displayName}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Featured Services List */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#333]">
              {searchQuery 
                ? (isRTL ? "نتائج البحث" : "Search Results")
                : selectedCategoryLabel || t.hub.featuredServices
              }
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-[#777] hover:text-[#333] transition-colors"
              >
                <X className="h-4 w-4" />
                {isRTL ? "مسح الكل" : "Clear all"}
              </button>
            )}
          </div>

          {/* Results count */}
          {hasActiveFilters && (
            <p className="text-sm text-[#777] mb-4">
              {isRTL 
                ? `${filteredServices.length} خدمة`
                : `${filteredServices.length} service${filteredServices.length !== 1 ? 's' : ''} found`
              }
            </p>
          )}

          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            {filteredServices.length > 0 ? (
              filteredServices.map((service, index) => {
                const IconComponent = service.icon;
                const displayName = language === "ar" && service.name_ar ? service.name_ar : service.name;
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
                    {/* Icon */}
                    <div className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0",
                      service.color
                    )}>
                      <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-[#333]">
                        {displayName}
                      </h3>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className={cn(
                      "h-5 w-5 text-[#CCC] flex-shrink-0",
                      isRTL && "rotate-180"
                    )} />
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
                  {isRTL ? "جرب البحث بكلمات مختلفة" : "Try different search terms"}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <MobileNav />
      
      <ServiceDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        service={selectedService ? {
          id: selectedService.id,
          icon: selectedService.icon,
          color: selectedService.color,
          titleKey: selectedService.name,
          descKey: "",
          category: selectedService.name,
          categoryName: categories?.find(c => c.id === selectedService.category_id)?.name || "",
          categoryNameAr: categories?.find(c => c.id === selectedService.category_id)?.name_ar || "",
        } : null}
        filters={searchFilters}
      />
    </div>
  );
}
