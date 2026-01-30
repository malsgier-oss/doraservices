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

type ServiceCardCompactProps = {
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

export function ServiceCardCompact({
  service,
  rating,
  isRTL,
  canCall,
  canWhatsApp,
  onOpen,
  onCall,
  onWhatsApp,
  labels,
}: ServiceCardCompactProps) {
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
        "hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
        "transition-all duration-400 ease-out",
        isFeatured && "ring-2 ring-primary/25 dark:ring-primary/35 bg-gradient-to-br from-primary/3 via-transparent to-transparent"
      )}
    >
      <button
        type="button"
        className={cn(
          "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight",
          isRTL && "text-right"
        )}
        onClick={onOpen}
      >
        <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
          {service.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              <img
                src={service.image_url}
                alt=""
                className={cn(
                  "h-full w-full object-cover transition-all duration-600 ease-out",
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                  "group-hover:scale-105"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-muted-foreground/60" />
                </div>
                <div className="text-xs text-muted-foreground font-medium">{labels.noPhoto}</div>
              </div>
            </div>
          )}

          {/* Enhanced overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

          {/* Enhanced badges overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1.5 z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              {isFeatured && (
                <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/80 backdrop-blur-md text-primary-foreground px-2 py-0.5 text-xs font-bold shadow-lg border border-white/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>Featured</span>
                </div>
              )}
              {isVerified && (
                <div className="inline-flex items-center gap-1 rounded-full bg-green-500/90 backdrop-blur-md text-white px-1.5 py-0.5 text-xs font-semibold shadow-lg">
                  <Shield className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            {hasRating && rating && (
              <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white px-1.5 py-0.5 text-xs font-semibold shadow-lg">
                <Star className="h-2.5 w-2.5 fill-current" />
                <span>{ratingValue}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2.5 p-4 bg-card/80 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground leading-tight line-clamp-2 mb-1">
                {service.title}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {isVerified && <Shield className="h-3 w-3 text-green-500" />}
                <span className="font-medium">{providerName}</span>
              </div>
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                {service.price > 0 ? `${service.price} SAR` : "Free"}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {hasRating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold text-foreground">{ratingValue}</span>
                <span className="text-xs text-muted-foreground">({rating?.count})</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1 max-w-[100px]">{location}</span>
              </div>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-3 pt-1.5 border-t border-border/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Fast</span>
            </div>
            {isVerified && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Award className="h-3 w-3" />
                <span>Verified</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Enhanced action buttons */}
      <div className="border-t border-border/30 bg-background/95 backdrop-blur-sm px-4 py-3" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-10 flex-1 rounded-lg text-sm gap-2 font-semibold",
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg",
              !canCall && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted"
            )}
            onClick={onCall}
            disabled={!canCall}
          >
            <Phone className="h-3.5 w-3.5" />
            {labels.call}
          </Button>
          {service.allow_whatsapp !== false ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn(
                "h-10 flex-1 rounded-lg text-sm gap-2 font-semibold",
                "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
                "text-white border-0 shadow-md hover:shadow-lg",
                "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                !canWhatsApp && "opacity-50 cursor-not-allowed bg-muted hover:bg-muted"
              )}
              onClick={onWhatsApp}
              disabled={!canWhatsApp}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {labels.whatsapp}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
