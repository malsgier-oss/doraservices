import { useState } from "react";
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
import { cn } from "@/lib/utils";

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<{
    id: string;
    providerName: string;
    serviceTitle: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
  } | null>(null);

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

  // Mock featured providers
  const featuredProviders = isRTL ? [
    {
      id: "1",
      providerName: "أحمد الشمري",
      serviceTitle: "صيانة مكيفات احترافية",
      rating: 4.9,
      reviewCount: 127,
      hourlyRate: 150,
    },
    {
      id: "2",
      providerName: "سارة القحطاني",
      serviceTitle: "تنظيف منازل شامل",
      rating: 4.8,
      reviewCount: 89,
      hourlyRate: 100,
    },
    {
      id: "3",
      providerName: "محمد العتيبي",
      serviceTitle: "صيانة أجهزة إلكترونية",
      rating: 4.7,
      reviewCount: 64,
      hourlyRate: 120,
    },
  ] : [
    {
      id: "1",
      providerName: "John Smith",
      serviceTitle: "Professional AC Repair",
      rating: 4.9,
      reviewCount: 127,
      hourlyRate: 75,
    },
    {
      id: "2",
      providerName: "Sarah Johnson",
      serviceTitle: "Full House Cleaning",
      rating: 4.8,
      reviewCount: 89,
      hourlyRate: 50,
    },
    {
      id: "3",
      providerName: "Mike Williams",
      serviceTitle: "Electronics Repair",
      rating: 4.7,
      reviewCount: 64,
      hourlyRate: 60,
    },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/services/${categoryId}`);
  };

  const handleBook = (provider: typeof featuredProviders[0]) => {
    setSelectedProvider(provider);
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (data: { description: string; date: Date; timeSlot: string }) => {
    console.log("Booking submitted:", { provider: selectedProvider, ...data });
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
            {featuredProviders.map((provider) => (
              <ServiceProviderCard
                key={provider.id}
                {...provider}
                onBook={() => handleBook(provider)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Booking Dialog */}
      {selectedProvider && (
        <BookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          serviceTitle={selectedProvider.serviceTitle}
          providerName={selectedProvider.providerName}
          onSubmit={handleBookingSubmit}
        />
      )}
    </Layout>
  );
}
