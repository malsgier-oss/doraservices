import { MapPin, Tag } from "lucide-react";
import { useState } from "react";
import { HUB_CARD_BASE } from "./hubStyles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
  isRTL?: boolean;
}

export function ListingCard({ listing, onClick, isRTL }: ListingCardProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageUrls = (listing.image_urls || []).filter(Boolean);
  const cover = imageUrls[0] || null;
  const extraImages = imageUrls.length > 1 ? imageUrls.length - 1 : 0;
  const priceText =
    listing.price !== null && listing.price !== undefined
      ? `${listing.price} ${t("د.ل", listing.currency || "LYD")}`
      : t("السعر عند التواصل", "Price on request");

  return (
    <button
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight",
        "group overflow-hidden rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all duration-200",
        onClick && "cursor-pointer",
        isRTL && "text-right",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
        {cover ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <img
              src={cover}
              alt={listing.title}
              className={cn(
                "h-full w-full object-cover transition-all duration-500 ease-out",
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                "group-hover:scale-105",
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <div className="text-center">
              <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <Tag className="w-3 h-3 text-muted-foreground/60" />
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">{t("لا توجد صورة", "No photo")}</div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-1">
          <div className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md text-white px-2 py-0.5 text-[10px] font-bold shadow-lg">
            {t("للبيع", "FOR SALE")}
          </div>
          {extraImages > 0 ? (
            <div className="inline-flex items-center rounded-full bg-black/60 backdrop-blur-md text-white px-2 py-0.5 text-[10px] font-semibold shadow-lg">
              +{extraImages}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 p-2.5 bg-card/80 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-0.5">
              {listing.title}
            </h3>
            {listing.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span className="line-clamp-1">{listing.location}</span>
              </div>
            )}
          </div>
          <div className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
            {priceText}
          </div>
        </div>

        {listing.category && (
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Tag className="h-2.5 w-2.5" />
            <span className="line-clamp-1 max-w-[80px]">{listing.category}</span>
          </div>
        )}
      </div>
    </button>
  );
}
