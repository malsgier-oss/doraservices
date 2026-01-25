import { MapPin, MessageCircle, Phone, Star, Sparkles, ImageOff } from "lucide-react";
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

type Service = {
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

type ProviderItemProps = {
  service: Service;
  rating?: RatingInfo;
  isRTL?: boolean;
  contact: { canCall: boolean; canWhatsApp: boolean };
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

function ProviderItem({
  service,
  rating,
  isRTL,
  contact,
  onOpen,
  onCall,
  onWhatsApp,
  labels,
}: ProviderItemProps) {
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
        "bg-background rounded-xl overflow-hidden border border-border/50",
        "hover:border-primary/30 transition-all duration-200",
        "group"
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
        <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
              <ImageOff className="h-8 w-8 opacity-50" />
              <span className="text-xs font-medium">{labels.noPhoto}</span>
            </div>
          )}
          
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-1">
              {isFeatured && (
                <div className="inline-flex items-center gap-0.5 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold shadow-lg">
                  <Sparkles className="h-2.5 w-2.5" />
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

        <div className="space-y-1.5 p-3" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1">
              {service.title}
            </div>
            {service.price !== null && service.price !== undefined && (
              <div className="text-xs font-bold text-primary whitespace-nowrap">
                {service.price > 0 ? `${service.price} SAR` : "Free"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
              {isVerified && <VerifiedBadge size="sm" />}
              <span>{providerName}</span>
            </div>
            {hasRating && (
              <div className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                <span>{ratingValue}</span>
              </div>
            )}
          </div>
          {location ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              <span className="line-clamp-1">{location}</span>
            </div>
          ) : null}
        </div>
      </button>

      <div className="border-t border-border/30 bg-background/95 px-3 py-2" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-9 flex-1 rounded-lg text-xs gap-1.5 font-medium px-2",
              "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
              !contact.canCall && "opacity-50 cursor-not-allowed"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onCall();
            }}
            disabled={!contact.canCall}
          >
            <Phone className="h-3 w-3" />
            {labels.call}
          </Button>
          {service.allow_whatsapp !== false ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={cn(
                "h-9 flex-1 rounded-lg text-xs gap-1.5 font-medium px-2",
                "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                !contact.canWhatsApp && "opacity-50 cursor-not-allowed"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp();
              }}
              disabled={!contact.canWhatsApp}
            >
              <MessageCircle className="h-3 w-3" />
              {labels.whatsapp}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type FeaturedProvidersCardProps = {
  services: Service[];
  ratings: Map<string, RatingInfo>;
  isRTL?: boolean;
  getContactState: (service: Service) => { canCall: boolean; canWhatsApp: boolean };
  onOpen: (service: Service) => void;
  onCall: (service: Service) => void;
  onWhatsApp: (service: Service) => void;
  labels: {
    call: string;
    whatsapp: string;
    providerFallback: string;
    noPhoto: string;
    ratingFallback: string;
  };
};

export function FeaturedProvidersCard({
  services,
  ratings,
  isRTL,
  getContactState,
  onOpen,
  onCall,
  onWhatsApp,
  labels,
}: FeaturedProvidersCardProps) {
  return (
    <div
      className={cn(
        HUB_CARD_BASE,
        "bg-card shrink-0 w-[90vw] max-w-[800px] snap-center overflow-hidden",
        "hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
        "transition-all duration-300 ease-out"
      )}
    >
      <div className="grid grid-cols-2 gap-3 p-4">
        {services.map((service) => {
          const contact = getContactState(service);
          const rating = ratings.get(service.id);
          return (
            <ProviderItem
              key={service.id}
              service={service}
              rating={rating}
              isRTL={isRTL}
              contact={contact}
              onOpen={() => onOpen(service)}
              onCall={() => onCall(service)}
              onWhatsApp={() => onWhatsApp(service)}
              labels={labels}
            />
          );
        })}
      </div>
    </div>
  );
}
