import { useState, useEffect } from "react";
import { X, Phone, MessageCircle, MapPin, Star, Sparkles, CheckCircle2, Clock, Award, Shield, Users, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServiceRatings } from "@/hooks/useReviews";
import { VerifiedBadge } from "./VerifiedBadge";
import { TrustBadge } from "./TrustBadge";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
};

interface ServiceQuickViewProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onViewFull: () => void;
  canCall: boolean;
  canWhatsApp: boolean;
}

export function ServiceQuickView({
  service,
  open,
  onOpenChange,
  onCall,
  onWhatsApp,
  onViewFull,
  canCall,
  canWhatsApp,
}: ServiceQuickViewProps) {
  const { language, isRTL } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ratings, loading: ratingsLoading } = useServiceRatings(service ? [service.id] : []);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  useEffect(() => {
    if (!open) {
      setImageLoaded(false);
    }
  }, [open]);

  if (!service) return null;

  const rating = ratings.get(service.id);
  const hasRating = rating && rating.totalReviews > 0;
  const ratingValue = hasRating ? rating.averageRating.toFixed(1) : null;
  const location = [service.city, service.sub_city].filter(Boolean).join(" • ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden bg-gradient-to-br from-background to-background/95"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{service.title}</DialogTitle>
        </DialogHeader>

        {/* Enhanced Image Section */}
        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
          {service.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                  <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              <img
                src={service.image_url}
                alt={service.title}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700 ease-out",
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
                )}
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Award className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="text-sm text-muted-foreground font-medium">{t("لا توجد صورة", "No Photo")}</div>
              </div>
            </div>
          )}

          {/* Enhanced overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Enhanced Badges Overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 z-10">
            <div className="flex flex-wrap items-center gap-2">
              {service.is_featured && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 backdrop-blur-md text-primary-foreground px-3 py-1.5 text-sm font-bold shadow-xl border border-white/20">
                  <Sparkles className="h-4 w-4" />
                  <span>{t("مميز", "Featured")}</span>
                </div>
              )}
              {service.is_verified && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/90 backdrop-blur-md text-white px-3 py-1.5 text-sm font-semibold shadow-xl">
                  <Shield className="h-4 w-4" />
                  <span>{t("موثق", "Verified")}</span>
                </div>
              )}
            </div>
            {hasRating && ratingValue && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 backdrop-blur-md text-white px-3 py-1.5 text-sm font-semibold shadow-xl">
                <Star className="h-4 w-4 fill-current" />
                <span>{ratingValue}</span>
              </div>
            )}
          </div>

          {/* Enhanced Close Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-background/80 backdrop-blur-md hover:bg-background border border-white/20 shadow-lg"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Enhanced Content Section */}
        <div className="p-6 space-y-5">
          {/* Title and Category */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">
              {service.title}
            </h3>
            {service.category && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {service.category}
              </div>
            )}
          </div>

          {/* Description */}
          {service.description && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          )}

          {/* Provider and Price */}
          <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              {service.is_verified && <VerifiedBadge size="md" />}
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {service.provider_name || t("مزود خدمة", "Service Provider")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("مقدم الخدمة", "Service Provider")}
                </div>
              </div>
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {service.price > 0 ? `${service.price} SAR` : t("مجاني", "Free")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("للخدمة", "per service")}
                </div>
              </div>
            )}
          </div>

          {/* Rating and Location */}
          <div className="grid grid-cols-2 gap-4">
            {hasRating && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <span className="text-lg font-bold text-foreground">{ratingValue}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {rating.totalReviews} {t("تقييم", "reviews")}
                </div>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-500" />
                <div className="text-sm text-foreground font-medium line-clamp-2">
                  {location}
                </div>
              </div>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-green-500" />
              <span>{t("استجابة سريعة", "Quick Response")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-blue-500" />
              <span>{t("عملاء راضون", "Happy Customers")}</span>
            </div>
            {service.is_verified && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Award className="h-4 w-4" />
                <span>{t("موثق", "Verified")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="border-t border-border/30 bg-background/95 backdrop-blur-sm px-6 py-5 space-y-3">
          <Button
            type="button"
            className="w-full h-12 rounded-xl text-base font-semibold gap-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={onViewFull}
          >
            <Calendar className="h-5 w-5" />
            {t("عرض التفاصيل الكاملة", "View Full Details")}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl text-base font-semibold gap-3 border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              onClick={onCall}
              disabled={!canCall}
            >
              <Phone className="h-5 w-5" />
              {t("اتصال", "Call")}
            </Button>
            {service.allow_whatsapp !== false && (
              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-xl text-base font-semibold gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={onWhatsApp}
                disabled={!canWhatsApp}
              >
                <MessageCircle className="h-5 w-5" />
                {t("واتساب", "WhatsApp")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
