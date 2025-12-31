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
import { cn } from "@/lib/utils";

export default function ServiceDirectory() {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const { t, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(category || "");
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

  // Mock providers by category
  const providersByCategory: Record<string, Array<{
    id: string;
    providerName: string;
    serviceTitle: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
  }>> = isRTL ? {
    homeMaintenance: [
      { id: "1", providerName: "أحمد الشمري", serviceTitle: "صيانة مكيفات احترافية", rating: 4.9, reviewCount: 127, hourlyRate: 150 },
      { id: "2", providerName: "خالد المالكي", serviceTitle: "سباكة وتمديدات", rating: 4.7, reviewCount: 89, hourlyRate: 120 },
      { id: "3", providerName: "فهد الدوسري", serviceTitle: "كهرباء منزلية", rating: 4.8, reviewCount: 156, hourlyRate: 130 },
    ],
    personalCare: [
      { id: "4", providerName: "نورة العتيبي", serviceTitle: "تصفيف شعر في المنزل", rating: 4.9, reviewCount: 234, hourlyRate: 200 },
      { id: "5", providerName: "منى الحربي", serviceTitle: "مكياج ومناسبات", rating: 4.8, reviewCount: 178, hourlyRate: 250 },
    ],
    techSupport: [
      { id: "6", providerName: "محمد العتيبي", serviceTitle: "صيانة أجهزة إلكترونية", rating: 4.7, reviewCount: 64, hourlyRate: 120 },
      { id: "7", providerName: "عبدالله السبيعي", serviceTitle: "دعم تقني للكمبيوتر", rating: 4.6, reviewCount: 45, hourlyRate: 100 },
    ],
    petServices: [
      { id: "8", providerName: "سلمان الغامدي", serviceTitle: "تدريب كلاب", rating: 4.8, reviewCount: 67, hourlyRate: 180 },
      { id: "9", providerName: "هند القرني", serviceTitle: "رعاية حيوانات أليفة", rating: 4.9, reviewCount: 92, hourlyRate: 80 },
    ],
    cleaning: [
      { id: "10", providerName: "سارة القحطاني", serviceTitle: "تنظيف منازل شامل", rating: 4.8, reviewCount: 89, hourlyRate: 100 },
      { id: "11", providerName: "فاطمة الزهراني", serviceTitle: "تنظيف عميق", rating: 4.7, reviewCount: 112, hourlyRate: 120 },
    ],
    automotive: [
      { id: "12", providerName: "سعد الشهري", serviceTitle: "غسيل سيارات متنقل", rating: 4.6, reviewCount: 78, hourlyRate: 80 },
      { id: "13", providerName: "تركي المطيري", serviceTitle: "صيانة سيارات", rating: 4.8, reviewCount: 145, hourlyRate: 150 },
    ],
    education: [
      { id: "14", providerName: "أ. ريم الحمود", serviceTitle: "دروس خصوصية رياضيات", rating: 4.9, reviewCount: 167, hourlyRate: 100 },
      { id: "15", providerName: "أ. يوسف الراشد", serviceTitle: "تعليم لغة إنجليزية", rating: 4.8, reviewCount: 134, hourlyRate: 120 },
    ],
    health: [
      { id: "16", providerName: "د. نوف العنزي", serviceTitle: "تمريض منزلي", rating: 4.9, reviewCount: 89, hourlyRate: 200 },
      { id: "17", providerName: "م. خالد البقمي", serviceTitle: "علاج طبيعي", rating: 4.8, reviewCount: 76, hourlyRate: 180 },
    ],
  } : {
    homeMaintenance: [
      { id: "1", providerName: "John Smith", serviceTitle: "Professional AC Repair", rating: 4.9, reviewCount: 127, hourlyRate: 75 },
      { id: "2", providerName: "Mike Johnson", serviceTitle: "Plumbing Services", rating: 4.7, reviewCount: 89, hourlyRate: 60 },
      { id: "3", providerName: "David Brown", serviceTitle: "Electrical Work", rating: 4.8, reviewCount: 156, hourlyRate: 65 },
    ],
    personalCare: [
      { id: "4", providerName: "Lisa Williams", serviceTitle: "Home Hair Styling", rating: 4.9, reviewCount: 234, hourlyRate: 80 },
      { id: "5", providerName: "Emma Davis", serviceTitle: "Makeup & Events", rating: 4.8, reviewCount: 178, hourlyRate: 100 },
    ],
    techSupport: [
      { id: "6", providerName: "Chris Miller", serviceTitle: "Electronics Repair", rating: 4.7, reviewCount: 64, hourlyRate: 60 },
      { id: "7", providerName: "Tom Wilson", serviceTitle: "Computer Support", rating: 4.6, reviewCount: 45, hourlyRate: 50 },
    ],
    petServices: [
      { id: "8", providerName: "James Taylor", serviceTitle: "Dog Training", rating: 4.8, reviewCount: 67, hourlyRate: 70 },
      { id: "9", providerName: "Amy Anderson", serviceTitle: "Pet Sitting", rating: 4.9, reviewCount: 92, hourlyRate: 40 },
    ],
    cleaning: [
      { id: "10", providerName: "Sarah Johnson", serviceTitle: "Full House Cleaning", rating: 4.8, reviewCount: 89, hourlyRate: 50 },
      { id: "11", providerName: "Maria Garcia", serviceTitle: "Deep Cleaning", rating: 4.7, reviewCount: 112, hourlyRate: 60 },
    ],
    automotive: [
      { id: "12", providerName: "Steve Martin", serviceTitle: "Mobile Car Wash", rating: 4.6, reviewCount: 78, hourlyRate: 40 },
      { id: "13", providerName: "Kevin Lee", serviceTitle: "Car Maintenance", rating: 4.8, reviewCount: 145, hourlyRate: 75 },
    ],
    education: [
      { id: "14", providerName: "Dr. Rachel Green", serviceTitle: "Math Tutoring", rating: 4.9, reviewCount: 167, hourlyRate: 50 },
      { id: "15", providerName: "Prof. Mark White", serviceTitle: "English Lessons", rating: 4.8, reviewCount: 134, hourlyRate: 60 },
    ],
    health: [
      { id: "16", providerName: "Nurse Jane Doe", serviceTitle: "Home Nursing", rating: 4.9, reviewCount: 89, hourlyRate: 80 },
      { id: "17", providerName: "PT Michael Scott", serviceTitle: "Physical Therapy", rating: 4.8, reviewCount: 76, hourlyRate: 90 },
    ],
  };

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const providers = selectedCategory ? (providersByCategory[selectedCategory] || []) : [];

  const filteredProviders = providers.filter(
    (p) =>
      p.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    navigate(`/services/${categoryId}`, { replace: true });
  };

  const handleBook = (provider: typeof providers[0]) => {
    setSelectedProvider(provider);
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (data: { description: string; date: Date; timeSlot: string }) => {
    console.log("Booking submitted:", { provider: selectedProvider, ...data });
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
            {filteredProviders.length > 0 ? (
              filteredProviders.map((provider) => (
                <ServiceProviderCard
                  key={provider.id}
                  {...provider}
                  onBook={() => handleBook(provider)}
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
