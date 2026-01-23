import { MapPin, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";

type ListingCardGroupProps = {
  listings: Listing[];
  isRTL?: boolean;
  onOpen: (listing: Listing) => void;
  labels: {
    noPhoto: string;
  };
};

function ListingItem({
  listing,
  isRTL,
  onOpen,
  labels,
}: {
  listing: Listing;
  isRTL?: boolean;
  onOpen: () => void;
  labels: {
    noPhoto: string;
  };
}) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const cover = listing.image_urls?.[0] || null;
  const priceText =
    listing.price !== null && listing.price !== undefined
      ? `${listing.price} ${t("د.ل", listing.currency || "LYD")}`
      : t("السعر عند التواصل", "Price on request");

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
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <Tag className="w-3 h-3 text-muted-foreground/60" />
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">{labels.noPhoto}</div>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

        {/* Price badge */}
        <div className="absolute top-1.5 left-1.5">
          <div className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md text-white px-2 py-0.5 text-[10px] font-bold shadow-lg">
            {t("للبيع", "FOR SALE")}
          </div>
        </div>
      </div>

      <div className="space-y-1 p-2.5 bg-card/80 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-0.5">
              {listing.title}
            </h3>
            <div className="text-xs font-bold text-primary">
              {priceText}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {listing.category && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <Tag className="h-2.5 w-2.5" />
              <span className="line-clamp-1 max-w-[60px]">{listing.category}</span>
            </div>
          )}
          {listing.location && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <MapPin className="h-2.5 w-2.5" />
              <span className="line-clamp-1 max-w-[60px]">{listing.location}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function ListingCardGroup({
  listings,
  isRTL,
  onOpen,
  labels,
}: ListingCardGroupProps) {
  // Ensure we have exactly 4 listings (pad with null if needed)
  const paddedListings = [...listings];
  while (paddedListings.length < 4) {
    paddedListings.push(null as any);
  }
  const displayListings = paddedListings.slice(0, 4);

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
        {displayListings.map((listing, index) => {
          if (!listing) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-[4/3] rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground/50">{labels.noPhoto}</div>
              </div>
            );
          }

          return (
            <ListingItem
              key={listing.id}
              listing={listing}
              isRTL={isRTL}
              onOpen={() => onOpen(listing)}
              labels={labels}
            />
          );
        })}
      </div>
    </div>
  );
}