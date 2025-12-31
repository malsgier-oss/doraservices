import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/service/CategoryIcon";
import { ServiceProviderCard } from "@/components/service/ServiceProviderCard";
import { BookingDialog } from "@/components/service/BookingDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useServices, Service } from "@/hooks/useServices";
import { cn } from "@/lib/utils";

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL } = useLanguage();
  const { services, loading } = useServices();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const categories = [
    { id: "homeMaintenance", label: t.categories.homeMaintenance },
    { id: "personalCare", label: t.categories.personalCare },
    { id: "techSupport", label: t.categories.techSupport },
    { id: "petServices", label: t.categories.petServices },
    { id: "cleaning", label: t.categories.cleaning },
    { id: "automotive", label: t.categories.automotive },
    { id: "education", label: t.categories.education },
    { id: "health", label: t.categories.health },
  ];

  // Get featured providers (first 3 services)
  const featuredProviders = services.slice(0, 3);

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const handleCategoryClick = (categoryId: string) => {
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

  return (
    <Layout>
      <div className="container py-6 space-y-8">
        {/* Welcome */}
        <div className={cn(isRTL ? "text-right" : "text-left")}>
          <h1 className="text-2xl font-bold text-foreground">
            {t.hub.welcome} {firstName && `${firstName} 👋`}
          </h1>
          <p className="text-muted-foreground mt-1">{t.hub.whatService}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground",
            isRTL ? "right-3" : "left-3"
          )} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            className={cn(
              "rounded-full bg-card border-muted h-12",
              isRTL ? "pr-10" : "pl-10"
            )}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>

        {/* Categories Grid */}
        <section>
          <h2 className={cn(
            "text-lg font-semibold text-foreground mb-4",
            isRTL ? "text-right" : "text-left"
          )}>
            {t.hub.browseCategories}
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {categories.map((category) => (
              <CategoryIcon
                key={category.id}
                category={category.id}
                label={category.label}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>
        </section>

        {/* Featured Providers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate("/services")}
              className="text-sm text-primary font-medium"
            >
              {t.hub.viewAll}
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              {t.hub.featuredProviders}
            </h2>
          </div>
          <div className="space-y-3">
            {featuredProviders.length > 0 ? (
              featuredProviders.map((service) => (
                <ServiceProviderCard
                  key={service.id}
                  id={service.id}
                  providerName={service.provider_name || "Provider"}
                  providerAvatar={service.provider_avatar}
                  serviceTitle={service.title}
                  price={Number(service.price)}
                  onBook={() => handleBook(service)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? t.common.loading : t.services.noServices}
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
        />
      )}
    </Layout>
  );
}
