import { MapPin, MessageCircle, Phone, Star, Sparkles, Clock, Award, Shield } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { TrustBadge } from "./TrustBadge";
import { VerifiedBadge } from "./VerifiedBadge";

type RatingInfo = {
  value: number;
  count: number;
};

type ServiceCardFeaturedProps = {
  service: {
    id: string;
    title: string;
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
  rating?: RatingInfo | null;
  isRTL?: boolean;
  canCall: boolean;
  canWhatsApp: boolean;
  onOpen: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  labels: {
    call: string;
    whatsapp: string;
    providerFallback: string;
    noPhoto: string;
    ratingFallback: string;
  };
};

export function ServiceCardFeatured({
  service,
  rating,
  isRTL,
  canCall,
  canWhatsApp,
  onOpen,
  onCall,
  onWhatsApp,
  labels,
}: ServiceCardFeaturedProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const location = [service.city, service.sub_city].filter(Boolean).join(" • ");
  const providerName = service.provider_name || labels.providerFallback;
  const hasRating = (rating?.count || 0) > 0;
  const ratingValue = hasRating ? rating?.value.toFixed(1) : labels.ratingFallback;
  const isFeatured = service.is_featured === true;
  const isVerified = service.is_verified === true;

  return (
    <div
      className={cn(
        HUB_CARD_BASE,
        "overflow-hidden group",
        "hover:shadow-[0_16px_32px_rgba(15,23,42,0.15)] dark:hover:shadow-[0_16px_32px_rgba(0,0,0,0.4)]",
        "transition-all duration-500 ease-out",
        isFeatured && "ring-2 ring-primary/30 dark:ring-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent",
        "relative"
      )}
    >
      {/* Background pattern for featured cards */}
      {isFeatured && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary rounded-full -translate-y-16 translate-x-16" />
        </div>
      )}

      <button
        type="button"
        className={cn(
          "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight",
          isRTL && "text-right"
        )}
        onClick={onOpen}
      >
        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
          {service.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              <img
                src={service.image_url}
                alt=""
                className={cn(
                  "h-full w-full object-cover transition-all duration-700 ease-out",
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                  "group-hover:scale-110"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <div className="text-xs text-muted-foreground font-medium">{labels.noPhoto}</div>
              </div>
            </div>
          )}

          {/* Enhanced overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

          {/* Enhanced badges overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              {isFeatured && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 backdrop-blur-md text-primary-foreground px-3 py-1.5 text-xs font-bold shadow-xl border border-white/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Featured</span>
                </div>
              )}
              {isVerified && (
                <div className="inline-flex items-center gap-1 rounded-full bg-green-500/90 backdrop-blur-md text-white px-2 py-1 text-xs font-semibold shadow-lg">
                  <Shield className="h-3 w-3" />
                  <span>Verified</span>
                </div>
              )}
            </div>
            {hasRating && rating && (
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white px-2 py-1 text-xs font-semibold shadow-lg">
                <Star className="h-3 w-3 fill-current" />
                <span>{ratingValue}</span>
              </div>
            )}
          </div>

          {/* Quick action overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 h-9 bg-white/90 backdrop-blur-md hover:bg-white text-foreground shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onCall();
              }}
              disabled={!canCall}
            >
              <Phone className="w-3.5 h-3.5" />
            </Button>
            {service.allow_whatsapp !== false && (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-9 bg-green-500/90 backdrop-blur-md hover:bg-green-600 text-white shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp();
                }}
                disabled={!canWhatsApp}
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-5 bg-card/80 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-2 mb-1">
                {service.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isVerified && <Shield className="h-3.5 w-3.5 text-green-500" />}
                <span className="font-medium">{providerName}</span>
              </div>
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="flex-shrink-0">
                <div className="text-lg font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                  {service.price > 0 ? `${service.price} SAR` : "Free"}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {hasRating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-foreground">{ratingValue}</span>
                </div>
                <span className="text-xs text-muted-foreground">({rating?.count} reviews)</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1 max-w-[120px]">{location}</span>
              </div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Quick response</span>
            </div>
            {isVerified && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <Award className="h-3.5 w-3.5" />
                <span>Trusted</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Enhanced action buttons */}
      <div className="border-t border-border/30 bg-background/95 backdrop-blur-sm px-5 py-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex gap-3">
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-12 flex-1 rounded-xl text-sm gap-2.5 font-semibold",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl",
              "border border-primary/20",
              !canCall && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted"
            )}
            onClick={onCall}
            disabled={!canCall}
          >
            <Phone className="h-4 w-4" />
            {labels.call}
          </Button>
          {service.allow_whatsapp !== false ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn(
                "h-12 flex-1 rounded-xl text-sm gap-2.5 font-semibold",
                "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
                "text-white border-0 shadow-lg hover:shadow-xl",
                "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                !canWhatsApp && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted"
              )}
              onClick={onWhatsApp}
              disabled={!canWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              {labels.whatsapp}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
