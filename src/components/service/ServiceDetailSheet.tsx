import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Phone, Star, Clock, ChevronRight, User, Heart, MessageSquare, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useReviews, useServiceRatings } from "@/hooks/useReviews";
import { ReviewDialog } from "./ReviewDialog";
import { ReviewList } from "./ReviewList";
import { toast } from "sonner";
import { LIBYAN_CITIES, SearchFiltersState } from "@/components/search/SearchFilters";

interface ServiceProvider {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  user_id: string;
  provider_name: string;
  provider_avatar: string;
  provider_phone: string;
  provider_city: string | null;
}

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    titleKey: string;
    descKey: string;
    category: string;
    color: string;
    icon: LucideIcon;
  } | null;
  filters?: SearchFiltersState;
}

export function ServiceDetailSheet({ open, onOpenChange, service, filters }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Reviews for selected provider
  const { reviews, rating, userReview, submitReview, loading: reviewsLoading } = useReviews(selectedProvider?.id);
  
  // Ratings for providers list
  const { ratings: providerRatings } = useServiceRatings(providers.map(p => p.id));

  // Helper to get city label
  const getCityLabel = (cityId: string | null) => {
    if (!cityId) return null;
    const city = LIBYAN_CITIES.find(c => c.id === cityId);
    return city ? (language === "ar" ? city.ar : city.en) : cityId;
  };

  useEffect(() => {
    if (open && service) {
      fetchProviders();
    }
  }, [open, service]);

  const fetchProviders = async () => {
    if (!service) return;
    
    setLoading(true);
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("category", service.category)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setLoading(false);
        return;
      }

      if (!servicesData || servicesData.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Get provider profiles
      const userIds = [...new Set(servicesData.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone, city")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedServices: ServiceProvider[] = servicesData.map(svc => ({
        id: svc.id,
        title: svc.title,
        description: svc.description,
        category: svc.category,
        image_url: svc.image_url,
        user_id: svc.user_id,
        provider_name: profileMap.get(svc.user_id)?.full_name || (isRTL ? "مقدم الخدمة" : "Provider"),
        provider_avatar: profileMap.get(svc.user_id)?.avatar_url || "",
        provider_phone: profileMap.get(svc.user_id)?.phone || "",
        provider_city: profileMap.get(svc.user_id)?.city || null,
      }));

      setProviders(enrichedServices);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  const IconComponent = service.icon;
  const title = t.featuredList[service.titleKey as keyof typeof t.featuredList] || service.titleKey;
  const categoryLabel = t.categories[service.category as keyof typeof t.categories] || service.category;

  const handleProviderClick = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleToggleFavorite = async (serviceId: string) => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    
    const result = await toggleFavorite(serviceId);
    if (!result.error) {
      if (result.added) {
        toast.success(isRTL ? "تمت الإضافة للمفضلة" : "Added to favorites");
      } else {
        toast.success(isRTL ? "تمت الإزالة من المفضلة" : "Removed from favorites");
      }
    }
  };

  const handleOpenReviewDialog = () => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async (reviewRating: number, content: string) => {
    if (!selectedProvider) return;
    
    setIsSubmittingReview(true);
    const { error } = await submitReview({
      rating: reviewRating,
      content: content || undefined,
      providerId: selectedProvider.user_id,
    });
    setIsSubmittingReview(false);

    if (error) {
      toast.error(isRTL ? "حدث خطأ" : "Error submitting review");
    } else {
      toast.success(isRTL ? "تم حفظ التقييم" : "Review saved");
      setReviewDialogOpen(false);
    }
  };

  const handleBack = () => {
    setSelectedProvider(null);
  };

  const getRatingDisplay = (serviceId: string) => {
    const r = providerRatings.get(serviceId);
    if (!r || r.totalReviews === 0) {
      return { text: isRTL ? "جديد" : "New", hasRating: false, rating: 0 };
    }
    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true, rating: r.averageRating };
  };

  // Filter providers based on city and rating
  const filteredProviders = useMemo(() => {
    let result = providers;

    // Filter by city
    if (filters?.city) {
      result = result.filter(p => p.provider_city === filters.city);
    }

    // Filter by minimum rating (4+ stars)
    if (filters?.minRating) {
      result = result.filter(p => {
        const r = providerRatings.get(p.id);
        return r && r.averageRating >= 4;
      });
    }

    return result;
  }, [providers, filters, providerRatings]);

  // Provider detail view
  if (selectedProvider) {
    const isProviderFavorite = isFavorite(selectedProvider.id);
    const hasRating = rating.totalReviews > 0;
    
    return (
      <>
        <Drawer open={open} onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedProvider(null);
          onOpenChange(isOpen);
        }}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="relative pb-0">
              <button
                onClick={handleBack}
                className={cn(
                  "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                  isRTL ? "right-4" : "left-4"
                )}
              >
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground", !isRTL && "rotate-180")} />
              </button>
              <DrawerClose className={cn(
                "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                isRTL ? "left-4" : "right-4"
              )}>
                <X className="h-4 w-4 text-muted-foreground" />
              </DrawerClose>
              <div className="flex flex-col items-center pt-2">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={selectedProvider.provider_avatar || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                    {selectedProvider.provider_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <DrawerTitle className="text-xl font-bold text-foreground">
                  {selectedProvider.provider_name}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedProvider.title}</p>
              </div>
            </DrawerHeader>

            <ScrollArea className="flex-1 max-h-[60vh]">
              <div className="px-6 py-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
                {/* Rating & Info */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <button 
                    onClick={handleOpenReviewDialog}
                    className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                    )} />
                    <span className={cn("font-medium", hasRating ? "text-foreground" : "text-muted-foreground")}>
                      {hasRating ? `${rating.averageRating} (${rating.totalReviews})` : (isRTL ? "جديد" : "New")}
                    </span>
                  </button>
                  {selectedProvider.provider_city && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{getCityLabel(selectedProvider.provider_city)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{isRTL ? "متاح" : "Available"}</span>
                  </div>
                </div>

                {/* Description */}
                {selectedProvider.description && (
                  <div className="bg-muted/50 rounded-2xl p-4">
                    <h3 className="font-semibold text-foreground mb-2">
                      {isRTL ? "عن الخدمة" : "About this service"}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProvider.description}
                    </p>
                  </div>
                )}

                {/* Reviews Section */}
                <div className="space-y-3">
                  <div className={cn(
                    "flex items-center justify-between",
                    isRTL && "flex-row-reverse"
                  )}>
                    <h3 className="font-semibold text-foreground">
                      {isRTL ? "التقييمات" : "Reviews"}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenReviewDialog}
                      className="text-primary"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {userReview 
                        ? (isRTL ? "تعديل تقييمك" : "Edit Review")
                        : (isRTL ? "أضف تقييم" : "Add Review")
                      }
                    </Button>
                  </div>
                  <ReviewList reviews={reviews} loading={reviewsLoading} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => handleCall(selectedProvider.provider_phone)}
                    disabled={!selectedProvider.provider_phone}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {isRTL ? "اتصل" : "Call"}
                  </Button>
                  <Button
                    variant={isProviderFavorite ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "flex-1 h-14 rounded-2xl",
                      isProviderFavorite && "bg-red-500 hover:bg-red-600 text-white"
                    )}
                    onClick={() => handleToggleFavorite(selectedProvider.id)}
                  >
                    <Heart className={cn("h-5 w-5 mr-2", isProviderFavorite && "fill-current")} />
                    {isProviderFavorite 
                      ? (isRTL ? "في المفضلة" : "Favorited") 
                      : (isRTL ? "أضف للمفضلة" : "Add to Favorites")
                    }
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>

        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          providerName={selectedProvider.provider_name}
          existingReview={userReview ? { rating: userReview.rating, content: userReview.content } : undefined}
          onSubmit={handleSubmitReview}
          isSubmitting={isSubmittingReview}
        />
      </>
    );
  }

  // Providers list view
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </DrawerClose>
          <div className="flex flex-col items-center pt-2">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mb-3",
              service.color
            )}>
              <IconComponent className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </div>
            <DrawerTitle className="text-xl font-bold text-foreground">
              {title}
            </DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{categoryLabel}</p>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4" dir={isRTL ? "rtl" : "ltr"}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
            {isRTL ? "مقدمي الخدمة المتاحين" : "Available Service Providers"}
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-muted rounded-2xl h-20 animate-pulse" />
              ))}
            </div>
          ) : filteredProviders.length > 0 ? (
            <div className="space-y-2">
              {filteredProviders.map((provider) => {
                const ratingInfo = getRatingDisplay(provider.id);
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderClick(provider)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border transition-colors hover:bg-muted/50 active:bg-muted",
                      isRTL && "flex-row-reverse text-right"
                    )}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={provider.provider_avatar || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                        {provider.provider_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{provider.provider_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{provider.title}</span>
                        {provider.provider_city && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <MapPin className="h-3 w-3" />
                              {getCityLabel(provider.provider_city)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className={cn(
                        "h-4 w-4",
                        ratingInfo.hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                      )} />
                      <span className="text-sm text-muted-foreground">{ratingInfo.text}</span>
                    </div>
                    <ChevronRight className={cn(
                      "h-5 w-5 text-muted-foreground/50",
                      isRTL && "rotate-180"
                    )} />
                  </button>
                );
              })}
            </div>
          ) : providers.length > 0 ? (
            // Filters applied but no results
            <div className="py-12 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {filters?.city 
                  ? (isRTL ? `لا يوجد مقدمي خدمة في ${getCityLabel(filters.city)}` : `No providers in ${getCityLabel(filters.city)}`)
                  : (isRTL ? "لا توجد نتائج مطابقة للفلاتر" : "No results match your filters")
                }
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {isRTL ? "جرب تغيير الفلاتر" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {isRTL ? "لا يوجد مقدمي خدمة حالياً" : "No providers available yet"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {isRTL ? "كن أول من يقدم هذه الخدمة!" : "Be the first to offer this service!"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  onOpenChange(false);
                  navigate(user ? "/create-service" : "/auth");
                }}
              >
                {isRTL ? "قدم خدمتك" : "Offer your service"}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
