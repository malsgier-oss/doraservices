import { MapPin, Star, Sparkles, Shield, Award } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

type RatingInfo = {
  value: number;
  count: number;
};

type Service = {
  id: string;
  title: string;
  provider_name: string | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
};

type ServiceCardGroupProps = {
  services: Service[];
  ratings: Map<string, RatingInfo>;
  isRTL?: boolean;
  onOpen: (service: Service) => void;
  labels: {
    providerFallback: string;
    noPhoto: string;
    ratingFallback: string;
  };
};

function ServiceItem({
  service,
  rating,
  isRTL,
  onOpen,
  labels,
}: {
  service: Service;
  rating?: RatingInfo | null;
  isRTL?: boolean;
  onOpen: () => void;
  labels: {
    providerFallback: string;
    noPhoto: string;
    ratingFallback: string;
  };
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const location = [service.city, service.sub_city].filter(Boolean).join(" • ");
  const providerName = service.provider_name || labels.providerFallback;
  const hasRating = (rating?.count || 0) > 0;
  const ratingValue = hasRating ? rating?.value.toFixed(1) : labels.ratingFallback;
  const isFeatured = service.is_featured === true;
  const isVerified = service.is_verified === true;

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight",
        "group overflow-hidden rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all duration-200",
        isRTL && "text-right"
      )}
      onClick={onOpen}
    >
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
        {service.image_url ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <img
              src={service.image_url}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-all duration-500 ease-out",
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
              <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <Award className="w-3 h-3 text-muted-foreground/60" />
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">{labels.noPhoto}</div>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

        {/* Badges overlay */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1 z-10">
          <div className="flex flex-wrap items-center gap-1">
            {isFeatured && (
              <div className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-primary to-primary/80 backdrop-blur-md text-primary-foreground px-1.5 py-0.5 text-[9px] font-bold shadow-lg border border-white/20">
                <Sparkles className="h-2 w-2" />
                <span>Featured</span>
              </div>
            )}
            {isVerified && (
              <div className="inline-flex items-center gap-0.5 rounded-full bg-green-500/90 backdrop-blur-md text-white px-1 py-0.5 text-[9px] font-semibold shadow-lg">
                <Shield className="h-2 w-2" />
              </div>
            )}
          </div>
          {hasRating && rating && (
            <div className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 backdrop-blur-md text-white px-1 py-0.5 text-[9px] font-semibold shadow-lg">
              <Star className="h-2 w-2 fill-current" />
              <span>{ratingValue}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5 bg-card/80 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-0.5">
              {service.title}
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isVerified && <Shield className="h-2.5 w-2.5 text-green-500" />}
              <span className="font-medium line-clamp-1">{providerName}</span>
            </div>
          </div>
          {service.price !== null && service.price !== undefined && (
            <div className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
              {service.price > 0 ? `${service.price} SAR` : "Free"}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {hasRating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="text-xs font-semibold text-foreground">{ratingValue}</span>
              <span className="text-[10px] text-muted-foreground">({rating?.count})</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <MapPin className="h-2.5 w-2.5" />
              <span className="line-clamp-1 max-w-[80px]">{location}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function ServiceCardGroup({
  services,
  ratings,
  isRTL,
  onOpen,
  labels,
}: ServiceCardGroupProps) {
  // Ensure we have exactly 4 services (pad with null if needed)
  const paddedServices = [...services];
  while (paddedServices.length < 4) {
    paddedServices.push(null as any);
  }
  const displayServices = paddedServices.slice(0, 4);

  return (
    <div
      className={cn(
        HUB_CARD_BASE,
        "bg-card shrink-0 w-[90vw] max-w-[700px] snap-start overflow-hidden",
        "hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
        "transition-all duration-300 ease-out"
      )}
    >
      <div className="grid grid-cols-2 gap-3 p-4">
        {displayServices.map((service, index) => {
          if (!service) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-[4/3] rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground/50">{labels.noPhoto}</div>
              </div>
            );
          }

          const rating = ratings.get(service.id);
          return (
            <ServiceItem
              key={service.id}
              service={service}
              rating={rating}
              isRTL={isRTL}
              onOpen={() => onOpen(service)}
              labels={labels}
            />
          );
        })}
      </div>
    </div>
  );
}
