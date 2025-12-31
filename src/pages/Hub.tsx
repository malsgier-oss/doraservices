import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { CategoryIcon } from "@/components/service/CategoryIcon";
import { ServiceProviderCard } from "@/components/service/ServiceProviderCard";
import { BookingDialog } from "@/components/service/BookingDialog";
import { ar } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const categories = [
  { id: "homeMaintenance", label: ar.categories.homeMaintenance },
  { id: "personalCare", label: ar.categories.personalCare },
  { id: "techSupport", label: ar.categories.techSupport },
  { id: "petServices", label: ar.categories.petServices },
  { id: "cleaning", label: ar.categories.cleaning },
  { id: "automotive", label: ar.categories.automotive },
  { id: "education", label: ar.categories.education },
  { id: "health", label: ar.categories.health },
];

// Mock featured providers
const featuredProviders = [
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
];

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof featuredProviders[0] | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] || "";

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/services/${categoryId}`);
  };

  const handleBook = (provider: typeof featuredProviders[0]) => {
    setSelectedProvider(provider);
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (data: { description: string; date: Date; timeSlot: string }) => {
    // TODO: Save booking to database
    console.log("Booking submitted:", { provider: selectedProvider, ...data });
  };

  return (
    <Layout>
      <div className="container py-6 space-y-8">
        {/* Welcome */}
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">
            {ar.hub.welcome} {firstName && `${firstName} 👋`}
          </h1>
          <p className="text-muted-foreground mt-1">{ar.hub.whatService}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ar.common.searchPlaceholder}
            className="pr-10 rounded-full bg-card border-muted h-12"
            dir="rtl"
          />
        </div>

        {/* Categories Grid */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 text-right">
            {ar.hub.browseCategories}
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
              {ar.hub.viewAll}
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              {ar.hub.featuredProviders}
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
