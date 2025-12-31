import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
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
  Activity
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingDialog } from "@/components/service/BookingDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useServices, Service } from "@/hooks/useServices";
import { cn } from "@/lib/utils";

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

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL, language } = useLanguage();
  const { services } = useServices();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter featured services based on search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return featuredServices;
    const query = searchQuery.toLowerCase();
    return featuredServices.filter(s => {
      const title = t.featuredList[s.titleKey as keyof typeof t.featuredList] || "";
      const desc = t.featuredList[s.descKey as keyof typeof t.featuredList] || "";
      return title.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
    });
  }, [searchQuery, t.featuredList]);

  const displayedServices = hasSearched ? filteredServices : featuredServices;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/services/${categoryId}`);
  };

  const handleServiceClick = (categoryId: string) => {
    navigate(`/services/${categoryId}`);
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || (isRTL ? "م" : "U");

  return (
    <div className="min-h-screen bg-[#F9F9F9]" dir={isRTL ? "rtl" : "ltr"}>
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
        <form onSubmit={handleSearch} className="mt-4">
          <div className="relative">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-[#777]",
                isRTL ? "right-4" : "left-4"
              )}
            />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setHasSearched(false);
              }}
              placeholder={t.hub.searchPlaceholder}
              className={cn(
                "rounded-[20px] bg-white border-0 h-14 text-base shadow-md placeholder:text-[#999]",
                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
              )}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>
        </form>
      </header>

      <main className="px-4 pb-8">
        {/* Category Hero Section */}
        <section className="mt-6">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "flex-shrink-0 w-[120px] h-[120px] rounded-[20px] flex flex-col items-center justify-center gap-2 transition-transform active:scale-95",
                    cat.color
                  )}
                >
                  <IconComponent className="h-8 w-8 text-[#333]" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-[#333] text-center px-2 leading-tight">
                    {t.categories[cat.labelKey as keyof typeof t.categories]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Services List */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-[#333] mb-4">
            {t.hub.featuredServices}
          </h2>

          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            {displayedServices.length > 0 ? (
              displayedServices.map((service, index) => {
                const IconComponent = service.icon;
                return (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service.category)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100",
                      isRTL && "text-right flex-row-reverse"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
                      service.color
                    )}>
                      <IconComponent className="h-6 w-6 text-[#333]" strokeWidth={1.5} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[#333]">
                        {t.featuredList[service.titleKey as keyof typeof t.featuredList]}
                      </h3>
                      <p className="text-xs text-[#777] mt-0.5">
                        {t.featuredList[service.descKey as keyof typeof t.featuredList]}
                      </p>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className={cn(
                      "h-5 w-5 text-[#CCC] flex-shrink-0",
                      isRTL && "rotate-180"
                    )} />

                    {/* Divider - shown for all except last */}
                    {index < displayedServices.length - 1 && (
                      <div className="absolute left-16 right-4 bottom-0 h-px bg-gray-100" />
                    )}
                  </button>
                );
              })
            ) : hasSearched ? (
              <div className="text-center py-12 px-4">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-[#777] font-medium">
                  {t.hub.noResults}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      {/* Booking Dialog */}
      {selectedService && (
        <BookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          serviceId={selectedService.id}
          serviceTitle={selectedService.title}
          providerId={selectedService.user_id}
          providerName={selectedService.provider_name || "Provider"}
          providerPhone={selectedService.provider_phone}
        />
      )}
    </div>
  );
}
