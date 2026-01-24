import { useState, memo } from "react";
import { Heart, MapPin } from "lucide-react";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ListingCardShowcaseProps {
  listing: Listing;
  onClick?: () => void;
  isFavorite?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
}

const ListingCardShowcaseContent = memo(function ListingCardShowcaseContent({
  listing,
  onClick,
  isFavorite = false,
  onFavoriteChange,
}: ListingCardShowcaseProps) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);

  const imageUrls = (listing.image_urls || []).filter(Boolean);
  const cover = imageUrls[0] || null;

  const priceText =
    listing.price !== null && listing.price !== undefined
      ? `${listing.price} ${t("د.ل", listing.currency || "LYD")}`
      : t("السعر عند التواصل", "Price on request");

  // Get category name from listing
  const categoryLabel = listing.category || t("عام", "General");

  // Get location display (city + sub_city)
  const locationDisplay = listing.sub_city ? `${listing.sub_city}` : listing.city || t("الموقع غير محدد", "Location TBD");

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error(t("يرجى تسجيل الدخول", "Please sign in"));
      return;
    }

    setIsFavLoading(true);
    try {
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listing.id);
      } else {
        await supabase.from("favorites").insert({
          user_id: user.id,
          listing_id: listing.id,
        });
      }
      onFavoriteChange?.(!isFavorite);
      toast.success(isFavorite ? t("تم إزالة من المفضلة", "Removed from favorites") : t("تم الإضافة للمفضلة", "Added to favorites"));
    } catch (error) {
      toast.error(t("حدث خطأ", "An error occurred"));
    } finally {
      setIsFavLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight",
        "group overflow-hidden rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-all duration-300",
        "flex flex-col h-full",
        onClick && "cursor-pointer",
        isRTL && "text-right",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
        {cover ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center z-10">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <img
              src={cover}
              alt={listing.title}
              className={cn(
                "h-full w-full object-cover transition-all duration-500 ease-out",
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
                "group-hover:scale-110",
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
                <MapPin className="w-3 h-3 text-muted-foreground/60" />
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">{t("لا توجد صورة", "No photo")}</div>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300" />

        {/* Badges - Price and Category */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="inline-flex items-center rounded-lg bg-black/60 backdrop-blur-md text-white px-3 py-1.5 text-xs font-bold shadow-lg">
            {priceText}
          </div>
          <button
            onClick={handleFavoriteClick}
            disabled={isFavLoading}
            className="inline-flex items-center justify-center rounded-lg bg-white/90 backdrop-blur-md hover:bg-white text-primary p-2 shadow-lg transition-all disabled:opacity-50"
          >
            <Heart
              className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
            />
          </button>
        </div>
      </div>

      {/* Info Section - Always visible */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Title */}
        <h3 className="font-bold text-base line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        {/* Category + Location Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Badge */}
          <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
            {categoryLabel}
          </span>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{locationDisplay}</span>
          </div>
        </div>

        {/* Seller Rating - if available */}
        {listing.user_id && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto pt-1 border-t border-border/30">
            <div className="flex items-center gap-0.5">
              <span className="text-yellow-500">★</span>
              <span>4.8</span>
            </div>
            <span className="text-muted-foreground">{t("بائع موثوق", "Trusted Seller")}</span>
          </div>
        )}
      </div>
    </button>
  );
});

export const ListingCardShowcase = memo(ListingCardShowcaseContent);
