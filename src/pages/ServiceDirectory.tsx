import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/service/CategoryIcon";
import { ServiceProviderCard } from "@/components/service/ServiceProviderCard";
import { BookingDialog } from "@/components/service/BookingDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServices, Service } from "@/hooks/useServices";
import { cn } from "@/lib/utils";

export default function ServiceDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category } = useParams<{ category?: string }>();
  const { t, isRTL } = useLanguage();
  const { services, loading } = useServices();
  const [selectedCategory, setSelectedCategory] = useState(category || "");
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

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  
  // Filter services by category
  const categoryServices = selectedCategory 
    ? services.filter(s => s.category === selectedCategory)
    : services;

  // Filter by search query
  const filteredServices = categoryServices.filter(
    (s) =>
      (s.provider_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    navigate(`/services/${categoryId}`, { replace: true });
  };

  const handleBook = (service: Service) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setSelectedService(service);
    setBookingOpen(true);
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">
              {currentCategory?.label || t.services.title}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => {
                if (selectedCategory) {
                  setSelectedCategory("");
                  navigate("/services");
                } else {
                  navigate("/");
                }
              }}
            >
              <BackArrow className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <CategoryIcon
              key={cat.id}
              category={cat.id}
              label={cat.label}
              size="sm"
              selected={selectedCategory === cat.id}
              onClick={() => handleCategoryClick(cat.id)}
            />
          ))}
        </div>

        {/* Search */}
        {selectedCategory && (
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
        )}

        {/* Providers List */}
        {selectedCategory ? (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t.common.loading}</p>
              </div>
            ) : filteredServices.length > 0 ? (
              filteredServices.map((service) => (
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
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t.services.noServices}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t.services.selectCategory}</p>
          </div>
        )}
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
