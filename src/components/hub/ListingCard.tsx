import { Tag, Eye, Phone, MessageCircle } from "lucide-react";
import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBuySellCategoryLabel } from "./buySellCategories";
import { HubItemCard } from "./HubItemCard";
import type { Listing } from "@/hooks/useListings";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
  isRTL?: boolean;
  /** Show stats (views, calls, whatsapp) for the listing */
  showStats?: boolean;
}

const ListingCardContent = ({ listing, onClick, isRTL, showStats }: ListingCardProps) => {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const imageUrls = (listing.image_urls || []).filter(Boolean);
  const cover = imageUrls[0] ?? null;
  const priceText =
    listing.price !== null && listing.price !== undefined
      ? `${listing.price} ${t("د.ل", listing.currency || "LYD")}`
      : t("السعر عند التواصل", "Price on request");
  const subtitle = getBuySellCategoryLabel(listing.category, language) ?? listing.category ?? "—";

  return (
    <div className="flex flex-col">
      <HubItemCard
        imageUrl={cover}
        priceText={priceText}
        location={listing.location ?? "—"}
        subtitle={subtitle}
        onClick={onClick}
        isRTL={isRTL}
        noImageNode={
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <Tag className="w-3 h-3 text-muted-foreground/60" />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {t("لا توجد صورة", "No photo")}
            </div>
          </div>
        }
      />
      {showStats && (
        <div 
          className={cn(
            "flex items-center justify-around gap-2 py-2 px-3 bg-muted/50 rounded-b-xl border border-t-0 border-border/50 text-xs text-muted-foreground",
            isRTL && "flex-row-reverse"
          )}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{listing.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{listing.call_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            <span>{listing.whatsapp_count || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ListingCard = memo(ListingCardContent);
