import { useState, useEffect } from "react";
import { X, Phone, MessageCircle, MapPin, Star, Sparkles, CheckCircle2 } from "lucide-react";
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
        className="max-w-md p-0 gap-0 overflow-hidden"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{service.title}</DialogTitle>
        </DialogHeader>

        {/* Image Section */}
        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {service.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
              )}
              <img
                src={service.image_url}
                alt={service.title}
                className={cn(
                  "h-full w-full object-cover transition-all duration-500",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
              {t("لا توجد صورة", "No Photo")}
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              {service.is_featured && (
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground px-2 py-1 text-[10px] font-semibold shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  <span>{t("مميز", "Featured")}</span>
                </div>
              )}
              {service.is_verified && <VerifiedBadge size="sm" />}
            </div>
            {hasRating && ratingValue && (
              <TrustBadge type="rating" value={ratingValue} size="sm" />
            )}
          </div>

          {/* Close Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2 mb-1">
              {service.title}
            </h3>
            {service.category && (
              <p className="text-xs text-muted-foreground">{service.category}</p>
            )}
          </div>

          {service.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {service.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 text-sm">
              {service.is_verified && <VerifiedBadge size="sm" />}
              <span className="text-muted-foreground">{service.provider_name || t("مزود خدمة", "Service Provider")}</span>
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="text-base font-bold text-primary">
                {service.price > 0 ? `${service.price} SAR` : t("مجاني", "Free")}
              </div>
            )}
          </div>

          {hasRating && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-medium">{ratingValue}</span>
              <span className="text-muted-foreground">
                ({rating.totalReviews} {t("تقييم", "reviews")})
              </span>
            </div>
          )}

          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border/30 bg-background/95 backdrop-blur-sm px-4 py-3 space-y-2">
          <Button
            type="button"
            className="w-full h-11 rounded-xl text-sm font-medium gap-2"
            onClick={onViewFull}
          >
            {t("عرض التفاصيل الكاملة", "View Full Details")}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl text-sm font-medium gap-2"
              onClick={onCall}
              disabled={!canCall}
            >
              <Phone className="h-4 w-4" />
              {t("اتصال", "Call")}
            </Button>
            {service.allow_whatsapp !== false && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 h-11 rounded-xl text-sm font-medium gap-2 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                onClick={onWhatsApp}
                disabled={!canWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                {t("واتساب", "WhatsApp")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
