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
  MapPin
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
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeaturedService {
  id: string;
  icon: LucideIcon;
  color: string;
  titleKey: string;
  descKey: string;
  category: string;
}

// Category data with colors and icons
const categories = [
  { id: "homeMaintenance", icon: Home, color: "bg-[#FFEBD4]", labelKey: "homeMaintenance" },
  { id: "carCare", icon: Car, color: "bg-[#FFE9A8]", labelKey: "carCare" },
  { id: "powerUtilities", icon: Zap, color: "bg-[#FFD6B0]", labelKey: "powerUtilities" },
  { id: "professionalLegal", icon: Briefcase, color: "bg-[#C5D8F8]", labelKey: "professionalLegal" },
  { id: "propertyLogistics", icon: Building2, color: "bg-[#D4C4B0]", labelKey: "propertyLogistics" },
  { id: "learningEducation", icon: GraduationCap, color: "bg-[#B8E0E0]", labelKey: "learningEducation" },
  { id: "healingWellness", icon: Heart, color: "bg-[#D4E5D2]", labelKey: "healingWellness" },
  { id: "eventsCatering", icon: PartyPopper, color: "bg-[#E8D4F0]", labelKey: "eventsCatering" },
];

// Featured services data
const featuredServices = [
  { id: "electrician", icon: Wrench, color: "bg-[#FFEBD4]", titleKey: "electrician", descKey: "electricianDesc", category: "homeMaintenance" },
  { id: "plumbing", icon: Droplets, color: "bg-[#C5E8F8]", titleKey: "plumbing", descKey: "plumbingDesc", category: "homeMaintenance" },
  { id: "acRepair", icon: Wind, color: "bg-[#E8F4E8]", titleKey: "acRepair", descKey: "acRepairDesc", category: "homeMaintenance" },
  { id: "oilFilter", icon: Fuel, color: "bg-[#FFE9A8]", titleKey: "oilFilter", descKey: "oilFilterDesc", category: "carCare" },
  { id: "inspection", icon: ClipboardCheck, color: "bg-[#FFE9A8]", titleKey: "inspection", descKey: "inspectionDesc", category: "carCare" },
  { id: "solar", icon: Sun, color: "bg-[#FFD6B0]", titleKey: "solar", descKey: "solarDesc", category: "powerUtilities" },
  { id: "generator", icon: Cog, color: "bg-[#FFD6B0]", titleKey: "generator", descKey: "generatorDesc", category: "powerUtilities" },
  { id: "legal", icon: Scale, color: "bg-[#C5D8F8]", titleKey: "legal", descKey: "legalDesc", category: "professionalLegal" },
  { id: "translation", icon: Languages, color: "bg-[#C5D8F8]", titleKey: "translation", descKey: "translationDesc", category: "professionalLegal" },
  { id: "photography", icon: Camera, color: "bg-[#E8D4F0]", titleKey: "photography", descKey: "photographyDesc", category: "eventsCatering" },
  { id: "catering", icon: UtensilsCrossed, color: "bg-[#E8D4F0]", titleKey: "catering", descKey: "cateringDesc", category: "eventsCatering" },
  { id: "homeDoctor", icon: Stethoscope, color: "bg-[#D4E5D2]", titleKey: "homeDoctor", descKey: "homeDoctorDesc", category: "healingWellness" },
  { id: "nursing", icon: Activity, color: "bg-[#D4E5D2]", titleKey: "nursing", descKey: "nursingDesc", category: "healingWellness" },
];

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
  const { t, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<FeaturedService | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersState>({
    city: null,
    minRating: false,
  });

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
    setSearchQuery(""); // Clear search when selecting category
  };

  const handleServiceClick = (service: FeaturedService) => {
    setSelectedService(service);
    setSheetOpen(true);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery("");
    setSearchFilters({ city: null, minRating: false });
  };

  const handleRemoveFilter = (key: keyof SearchFiltersState) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: key === "minRating" ? false : null,
    }));
  };

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    let services = featuredServices;

    // Filter by category
    if (selectedCategory) {
      services = services.filter(s => s.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      services = services.filter(s => {
        const title = t.featuredList[s.titleKey as keyof typeof t.featuredList] || "";
        const desc = t.featuredList[s.descKey as keyof typeof t.featuredList] || "";
        return title.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
      });
    }

    return services;
  }, [selectedCategory, searchQuery, t.featuredList]);

  const hasActiveFilters = selectedCategory || searchQuery.trim() || searchFilters.city || searchFilters.minRating;

  const selectedCategoryLabel = selectedCategory
    ? t.categories[selectedCategory as keyof typeof t.categories]
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

        {/* Filter Suggestions - moved down with more spacing */}
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
        {(searchFilters.city || searchFilters.minRating) && (
          <div className="mt-2">
            <ActiveFilterChips 
              filters={searchFilters} 
              onRemoveFilter={handleRemoveFilter} 
            />
          </div>
        )}
      </header>

      <main className="px-4 pb-8">
        {/* Category Hero Section - moved down */}
        <section className="mt-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = selectedCategory === cat.id;
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
                    {t.categories[cat.labelKey as keyof typeof t.categories]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Services List - moved down with larger cards */}
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
                    {/* Icon - larger */}
                    <div className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0",
                      service.color
                    )}>
                      <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                    </div>

                    {/* Text - larger */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-[#333]">
                        {t.featuredList[service.titleKey as keyof typeof t.featuredList]}
                      </h3>
                      <p className="text-sm text-[#777] mt-1">
                        {t.featuredList[service.descKey as keyof typeof t.featuredList]}
                      </p>
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
        service={selectedService}
        filters={searchFilters}
      />
    </div>
  );
}