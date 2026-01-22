import { MapPin, MessageCircle, Phone, Star, Sparkles } from "lucide-react";
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
        "hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
        "transition-all duration-300 ease-out",
        isFeatured && "ring-2 ring-primary/20 dark:ring-primary/30"
      )}
    >
      <button
        type="button"
        className={cn(
          "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "active:scale-[0.99] transition-transform touch-manipulation no-tap-highlight",
          isRTL && "text-right"
        )}
        onClick={onOpen}
      >
        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {service.image_url ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
              )}
              <img
                src={service.image_url}
                alt=""
                className={cn(
                  "h-full w-full object-cover transition-all duration-500",
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                  "group-hover:scale-110"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
              {labels.noPhoto}
            </div>
          )}
          
          {/* Premium overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              {isFeatured && (
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground px-2 py-1 text-[10px] font-semibold shadow-lg">
                  <Sparkles className="h-3 w-3" />
                  <span>Featured</span>
                </div>
              )}
              {isVerified && <VerifiedBadge size="sm" />}
            </div>
            {hasRating && rating && (
              <TrustBadge type="rating" value={ratingValue} size="sm" />
            )}
          </div>
        </div>

        <div className="space-y-2.5 p-4 bg-card/50 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-base font-semibold text-foreground leading-snug line-clamp-2 flex-1">
              {service.title}
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="text-sm font-bold text-primary whitespace-nowrap">
                {service.price > 0 ? `${service.price} SAR` : "Free"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1.5">
              {isVerified && <VerifiedBadge size="sm" />}
              <span>{providerName}</span>
            </div>
            {hasRating && (
              <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span>{ratingValue}</span>
                <span className="text-[10px] opacity-70">({rating?.count})</span>
              </div>
            )}
          </div>
          {location ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{location}</span>
            </div>
          ) : null}
        </div>
      </button>

      <div className="border-t border-border/30 bg-background/95 backdrop-blur-sm px-4 py-3" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-11 flex-1 rounded-xl text-sm gap-2 font-medium",
              "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
              !canCall && "opacity-50 cursor-not-allowed"
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
                "h-11 flex-1 rounded-xl text-sm gap-2 font-medium",
                "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                !canWhatsApp && "opacity-50 cursor-not-allowed"
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
