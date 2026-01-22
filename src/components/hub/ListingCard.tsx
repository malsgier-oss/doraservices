import { MapPin, Tag } from "lucide-react";
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

  const cover = listing.image_urls?.[0] || null;
  const priceText =
    listing.price !== null && listing.price !== undefined
      ? `${listing.price} ${t("د.ل", listing.currency || "LYD")}`
      : t("السعر عند التواصل", "Price on request");

  return (
    <button
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "bg-card overflow-hidden p-0 transition-transform active:scale-[0.99] touch-manipulation text-left",
        onClick && "cursor-pointer",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Image */}
      {cover ? (
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          <img src={cover} alt={listing.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            {t("للبيع", "FOR SALE")}
          </div>
        </div>
      ) : (
        <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
          {t("لا توجد صورة", "No photo")}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-foreground">{priceText}</div>
          {listing.category ? (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span className="line-clamp-1 max-w-[7rem]">{listing.category}</span>
            </div>
          ) : null}
        </div>

        <h3 className="font-semibold text-sm line-clamp-2">{listing.title}</h3>

        {listing.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
        ) : null}

        {listing.location ? (
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{listing.location}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

