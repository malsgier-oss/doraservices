import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Star, Droplets, Paintbrush, Zap, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingDialog } from "@/components/service/BookingDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useServices, Service } from "@/hooks/useServices";
import { useBookings } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";

const quickCategories = [
  { id: "homeMaintenance", icon: Droplets, emoji: "🚰", labelKey: "plumbing" },
  { id: "personalCare", icon: Paintbrush, emoji: "🎨", labelKey: "painting" },
  { id: "techSupport", icon: Zap, emoji: "⚡", labelKey: "electrical" },
  { id: "cleaning", icon: Sparkles, emoji: "🧹", labelKey: "cleaning" },
];

const quickCategoryLabels = {
  en: { plumbing: "Plumbing", painting: "Painting", electrical: "Electrical", cleaning: "Cleaning" },
  ar: { plumbing: "سباكة", painting: "دهان", electrical: "كهرباء", cleaning: "تنظيف" },
};

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL, language } = useLanguage();
  const { services, loading } = useServices();
  const { myBookings } = useBookings();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Get active booking (in_progress)
  const activeBooking = myBookings.find(b => b.status === "in_progress");

  // Filter services based on search
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      s =>
        s.title.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  const displayedServices = hasSearched ? filteredServices : services.slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleQuickCategory = (categoryId: string) => {
    navigate(`/services/${categoryId}`);
  };

  const handleBook = (service: Service) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedService(service);
    setBookingOpen(true);
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Live Status Card */}
        {activeBooking && (
          <div className="bg-teal-light border border-teal/20 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">{t.hub.liveStatus}</p>
                <p className="text-foreground font-semibold">
                  {activeBooking.provider_name} {t.hub.providerOnWay}
                </p>
                <p className="text-sm text-muted-foreground">
                  ~10 {t.hub.minsAway}
                </p>
              </div>
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse-soft" />
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className={cn("space-y-4", isRTL ? "text-right" : "text-left")}>
          <h1 className="text-2xl font-bold text-foreground">
            {t.hub.whatService}
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
                isRTL ? "right-4" : "left-4"
              )}
            />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setHasSearched(false);
              }}
              placeholder={t.common.searchPlaceholder}
              className={cn(
                "rounded-full bg-card border-border h-14 text-base shadow-card",
                isRTL ? "pr-12 pl-4" : "pl-12 pr-4"
              )}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </form>
        </div>

        {/* Quick Category Chips */}
        <div className="flex flex-wrap gap-2">
          {quickCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleQuickCategory(cat.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-peach-light hover:bg-peach/30 border border-peach/20 transition-all duration-200 active:scale-95"
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="text-sm font-medium text-foreground">
                {quickCategoryLabels[language][cat.labelKey as keyof typeof quickCategoryLabels.en]}
              </span>
            </button>
          ))}
        </div>

        {/* Service Provider Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className={cn(
                "text-lg font-semibold text-foreground",
                isRTL && "order-2"
              )}
            >
              {hasSearched ? t.common.search : t.hub.featuredProviders}
            </h2>
            {!hasSearched && (
              <button
                onClick={() => navigate("/services")}
                className="text-sm text-primary font-medium"
              >
                {t.hub.viewAll}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.common.loading}
              </div>
            ) : displayedServices.length > 0 ? (
              displayedServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-card rounded-2xl p-4 shadow-card animate-fade-in border border-border/50"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-14 w-14 ring-2 ring-peach-light">
                      <AvatarImage
                        src={service.provider_avatar}
                        alt={service.provider_name || "Provider"}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                        {initials(service.provider_name || "P")}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {service.provider_name || "Provider"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {service.title}
                      </p>
                      {/* Rating placeholder */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="h-4 w-4 fill-star text-star" />
                        <span className="text-sm font-medium text-foreground">
                          4.8
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (12 {t.rating.reviews})
                        </span>
                      </div>
                    </div>

                    {/* Price & Book */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {t.services.startingFrom}
                        </span>
                        <p className="font-bold text-foreground">
                          {Number(service.price)} {t.common.currency}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleBook(service)}
                        size="sm"
                        className="rounded-full px-5 bg-primary hover:bg-primary/90 shadow-md"
                      >
                        {t.services.bookService}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : hasSearched ? (
              <div className="text-center py-12 space-y-3">
                <div className="text-4xl">🔍</div>
                <p className="text-muted-foreground font-medium">
                  {t.hub.noResults}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t.services.noServices}
              </div>
            )}
          </div>
        </section>
      </div>

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
    </Layout>
  );
}
