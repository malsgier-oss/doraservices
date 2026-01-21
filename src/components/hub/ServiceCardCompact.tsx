import { MapPin, MessageCircle, Phone, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

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
  const location = [service.city, service.sub_city].filter(Boolean).join(" • ");
  const providerName = service.provider_name || labels.providerFallback;
  const hasRating = (rating?.count || 0) > 0;
  const ratingValue = hasRating ? rating?.value.toFixed(1) : labels.ratingFallback;

  return (
    <div className={cn(HUB_CARD_BASE, "overflow-hidden")}>
      <button
        type="button"
        className={cn(
          "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] transition-transform touch-manipulation no-tap-highlight",
          isRTL && "text-right"
        )}
        onClick={onOpen}
      >
        <div className="relative aspect-[4/3] w-full bg-muted">
          {service.image_url ? (
            <img src={service.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {labels.noPhoto}
            </div>
          )}
        </div>

        <div className="space-y-2 p-3" dir={isRTL ? "rtl" : "ltr"}>
          <div className="text-sm font-semibold text-foreground leading-snug line-clamp-1">{service.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{providerName}</div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star
                className={cn("h-3 w-3", hasRating ? "text-amber-500" : "text-muted-foreground")}
              />
              <span>{ratingValue}</span>
              {hasRating ? <span className="text-[10px]">({rating?.count})</span> : null}
            </div>
            {location ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1 max-w-[8rem]">{location}</span>
              </div>
            ) : null}
          </div>
        </div>
      </button>

      <div className="border-t border-border/30 bg-background/80 px-3 py-3" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className={cn("h-11 flex-1 rounded-xl text-sm gap-2", !canCall && "opacity-50")}
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
                "h-11 flex-1 rounded-xl text-sm gap-2 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                !canWhatsApp && "opacity-50"
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
