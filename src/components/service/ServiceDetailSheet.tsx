import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Phone, Star, Clock, ChevronRight, Heart, MessageSquare, MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { useCallLogs } from "@/hooks/useCallLogs";
import { ReviewDialog } from "./ReviewDialog";
import { ReviewList } from "./ReviewList";
import { ReportDialog } from "@/components/report/ReportDialog";
import { toast } from "sonner";
import { SearchFiltersState } from "@/components/search/SearchFilters";

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
  provider_sub_city: string | null;
}

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    titleKey: string;
    descKey: string;
    category: string;
    categoryName?: string;
    categoryNameAr?: string;
    color: string;
    icon: LucideIcon;
  } | null;
  filters?: SearchFiltersState;

  // Optional: if you pass it later, it won't break anything
  initialProviderServiceId?: string | null;
}

export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  filters,
}: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: cities } = useCities();
  const { data: subCities } = useSubCities(filters?.city);
  const { logCall } = useCallLogs();

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Reviews for selected provider
  const { reviews, rating, userReview, submitReview, loading: reviewsLoading } = useReviews(selectedProvider?.id);

  // Ratings for providers list
  const { ratings: providerRatings } = useServiceRatings(providers.map((p) => p.id));

  const getCityLabel = (cityId: string | null) => {
    if (!cityId) return null;
    const city = cities?.find((c) => c.id === cityId || c.name.toLowerCase() === cityId.toLowerCase());
    return city ? (language === "ar" && city.name_ar ? city.name_ar : city.name) : cityId;
  };

  const getSubCityLabel = (subCityId: string | null) => {
    if (!subCityId) return null;
    const subCity = subCities?.find((sc) => sc.id === subCityId || sc.name.toLowerCase() === subCityId.toLowerCase());
    return subCity ? (language === "ar" && subCity.name_ar ? subCity.name_ar : subCity.name) : subCityId;
  };

  useEffect(() => {
    if (open && service) {
      fetchProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service]);

  const fetchProviders = async () => {
    if (!service) return;

    setLoading(true);
    try {
      // Fetch by service.category
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("category", service.category)
        .eq("is_active", true)
        .or("is_paused.is.null,is_paused.eq.false")
        .order("created_at", { ascending: false });

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setProviders([]);
        return;
      }

      if (!servicesData || servicesData.length === 0) {
        setProviders([]);
        return;
      }

      const userIds = [...new Set((servicesData as any[]).map((s) => s.user_id).filter(Boolean))];
      let profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, phone, city, sub_city, provider_status")
          .in("user_id", userIds)
          .eq("provider_status", "approved");

        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const enrichedServices: ServiceProvider[] = (servicesData as any[])
        .filter((svc) => {
          // Bulk uploaded services (unclaimed)
          if (!svc.user_id) return svc.provider_name && svc.provider_phone;
          // Claimed services only if provider approved
          return profileMap.has(svc.user_id);
        })
        .map((svc) => {
          const profile = svc.user_id ? profileMap.get(svc.user_id) : null;
          return {
            id: svc.id,
            title: svc.title,
            description: svc.description,
            category: svc.category,
            image_url: svc.image_url,
            user_id: svc.user_id,
            provider_name: profile?.full_name || svc.provider_name || (isRTL ? "مقدم الخدمة" : "Provider"),
            provider_avatar: profile?.avatar_url || "",
            provider_phone: profile?.phone || svc.provider_phone || "",
            provider_city: profile?.city || svc.city || null,
            provider_sub_city: profile?.sub_city || svc.sub_city || null,
          };
        });

      setProviders(enrichedServices);
    } catch (error) {
      console.error("Error:", error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = useMemo(() => {
    let result = providers;

    if (filters?.city) result = result.filter((p) => p.provider_city === filters.city);
    if (filters?.subCity) result = result.filter((p) => p.provider_sub_city === filters.subCity);

    if (filters?.minRating) {
      result = result.filter((p) => {
        const r = providerRatings.get(p.id);
        return r && r.averageRating >= 4;
      });
    }

    return result;
  }, [providers, filters, providerRatings]);

  if (!service) return null;

  const IconComponent = service.icon;
  const title = t.featuredList[service.titleKey as keyof typeof t.featuredList] || service.titleKey;
  const categoryLabel =
    language === "ar" && service.categoryNameAr
      ? service.categoryNameAr
      : service.categoryName || t.categories[service.category as keyof typeof t.categories] || service.category;

  const handleProviderClick = (provider: ServiceProvider) => setSelectedProvider(provider);

  const handleCall = async (provider: ServiceProvider) => {
    if (!user) {
      toast.info(isRTL ? "يرجى تسجيل الدخول للتواصل" : "Please sign in to contact");
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    if (!provider.provider_phone) {
      toast.error(isRTL ? "رقم الهاتف غير متوفر" : "Phone number not available");
      return;
    }

    setIsLoggingCall(true);
    try {
      await logCall.mutateAsync({
        service_id: provider.id,
        provider_id: provider.user_id || provider.id,
      });
    } catch (error) {
      console.error("Error logging call:", error);
    } finally {
      setIsLoggingCall(false);
    }

    window.location.href = `tel:${provider.provider_phone}`;
  };

  const handleToggleFavorite = async (serviceId: string) => {
    if (!user) {
      toast.info(isRTL ? "يرجى تسجيل الدخول" : "Please sign in first");
      onOpenChange(false);
      navigate("/auth");
      return;
    }

    const result = await toggleFavorite(serviceId);
    if (!result.error) {
      toast.success(
        result.added
          ? (isRTL ? "تمت الإضافة للمفضلة" : "Added to favorites")
          : (isRTL ? "تمت الإزالة من المفضلة" : "Removed from favorites")
      );
    }
  };

  const handleOpenReviewDialog = () => {
    if (!user) {
      toast.info(isRTL ? "يرجى تسجيل الدخول" : "Please sign in first");
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

    if (error) toast.error(isRTL ? "حدث خطأ" : "Error submitting review");
    else {
      toast.success(isRTL ? "تم حفظ التقييم" : "Review saved");
      setReviewDialogOpen(false);
    }
  };

  const handleBack = () => setSelectedProvider(null);

  const getRatingDisplay = (serviceId: string) => {
    const r = providerRatings.get(serviceId);
    if (!r || r.totalReviews === 0) return { text: isRTL ? "جديد" : "New", hasRating: false };
    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true };
  };

  // ✅ Drawer height control (change 85 -> 80 if you want)
  const drawerPageClass = "h-[85dvh] max-h-[85dvh] flex flex-col overflow-hidden mt-0";

  // -------------------- Provider detail view --------------------
  if (selectedProvider) {
    const isProviderFavorite = isFavorite(selectedProvider.id);
    const hasRating = rating.totalReviews > 0;

    return (
      <>
        <Drawer
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedProvider(null);
            onOpenChange(isOpen);
          }}
        >
          <DrawerContent className={drawerPageClass}>
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

              <DrawerClose
                className={cn(
                  "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                  isRTL ? "left-4" : "right-4"
                )}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </DrawerClose>

              <div className="flex flex-col items-center pt-2">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={selectedProvider.provider_avatar || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                    {selectedProvider.provider_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <DrawerTitle className="text-xl font-bold text-foreground">{selectedProvider.provider_name}</DrawerTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedProvider.title}</p>
              </div>
            </DrawerHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
                {/* Rating & Info */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <button onClick={handleOpenReviewDialog} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Star className={cn("h-4 w-4", hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
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
                    <h3 className="font-semibold text-foreground mb-2">{isRTL ? "عن الخدمة" : "About this service"}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedProvider.description}</p>
                  </div>
                )}

                {/* Reviews */}
                <div className="space-y-3">
                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                    <h3 className="font-semibold text-foreground">{isRTL ? "التقييمات" : "Reviews"}</h3>
                    <Button variant="ghost" size="sm" onClick={handleOpenReviewDialog} className="text-primary">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {userReview ? (isRTL ? "تعديل تقييمك" : "Edit Review") : (isRTL ? "أضف تقييم" : "Add Review")}
                    </Button>
                  </div>
                  <ReviewList reviews={reviews} loading={reviewsLoading} />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => handleCall(selectedProvider)}
                    disabled={!selectedProvider.provider_phone || isLoggingCall}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {isLoggingCall ? (isRTL ? "جاري..." : "Calling...") : (isRTL ? "اتصل" : "Call")}
                  </Button>

                  <Button
                    variant={isProviderFavorite ? "default" : "outline"}
                    size="lg"
                    className={cn("flex-1 h-14 rounded-2xl", isProviderFavorite && "bg-red-500 hover:bg-red-600 text-white")}
                    onClick={() => handleToggleFavorite(selectedProvider.id)}
                  >
                    <Heart className={cn("h-5 w-5 mr-2", isProviderFavorite && "fill-current")} />
                    {isProviderFavorite ? (isRTL ? "في المفضلة" : "Favorited") : (isRTL ? "أضف للمفضلة" : "Add to Favorites")}
                  </Button>
                </div>

                {/* Unclaimed badge + Report (Claim removed) */}
                <div className="flex items-center justify-between mt-2 gap-2">
                  {!selectedProvider.user_id ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                      {isRTL ? "خدمة غير مؤكدة" : "Unclaimed Service"}
                    </Badge>
                  ) : (
                    <div />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {isRTL ? "إبلاغ" : "Report"}
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

        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          serviceId={selectedProvider.id}
          userId={selectedProvider.user_id}
          providerName={selectedProvider.provider_name}
        />
      </>
    );
  }

  // -------------------- Providers list view --------------------
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={drawerPageClass}>
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </DrawerClose>

          <div className="flex flex-col items-center pt-2">
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center mb-3", service.color)}>
              <IconComponent className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </div>
            <DrawerTitle className="text-xl font-bold text-foreground">{title}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{categoryLabel}</p>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4" dir={isRTL ? "rtl" : "ltr"}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
              {isRTL ? "مقدمي الخدمة المتاحين" : "Available Service Providers"}
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
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
                          {provider.provider_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
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

                        {provider.provider_sub_city && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {getSubCityLabel(provider.provider_sub_city)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className={cn("h-4 w-4", ratingInfo.hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", ratingInfo.hasRating ? "text-foreground" : "text-muted-foreground")}>
                          {ratingInfo.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-muted-foreground font-medium">{isRTL ? "لا يوجد مقدمي خدمة" : "No providers available"}</p>
                <p className="text-sm text-muted-foreground mt-1">{isRTL ? "جرب تصفية مختلفة" : "Try different filters"}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}