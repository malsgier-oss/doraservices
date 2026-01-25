import { Heart } from "lucide-react";
import { useState, memo } from "react";
import { HUB_CARD_BASE } from "./hubStyles";
import { cn } from "@/lib/utils";

export interface HubItemCardProps {
  imageUrl: string | null;
  priceText: string;
  location: string;
  subtitle: string;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onClick?: () => void;
  isRTL?: boolean;
  /** Optional placeholder when no image (e.g. "No photo" node) */
  noImageNode?: React.ReactNode;
}

function HubItemCardContent({
  imageUrl,
  priceText,
  location,
  subtitle,
  isFavorite = false,
  onFavorite,
  onClick,
  isRTL,
  noImageNode,
}: HubItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:scale-[0.98] transition-transform touch-manipulation no-tap-highlight p-0 overflow-hidden",
        "group rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all duration-200",
        isRTL && "text-right",
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 overflow-hidden">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt=""
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
            {noImageNode ?? (
              <div className="text-center text-[10px] text-muted-foreground font-medium">No photo</div>
            )}
          </div>
        )}

        {/* Light overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none" />

        {/* Price overlay bottom-left on image */}
        <div
          className={cn(
            "absolute bottom-1.5 left-1.5 right-auto max-w-[80%]",
            isRTL && "left-auto right-1.5",
          )}
        >
          <div className="inline-flex rounded-md bg-black/60 backdrop-blur-md text-white px-2 py-1 text-[11px] font-bold shadow-lg">
            {priceText}
          </div>
        </div>

        {/* Heart top-right on image (span to avoid nesting buttons) */}
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer",
            "text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            isRTL && "right-auto left-1.5",
          )}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFavorite?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onFavorite?.();
            }
          }}
        >
          <Heart
            className={cn("h-4 w-4", isFavorite && "fill-current")}
            strokeWidth={2}
          />
        </span>
      </div>

      {/* Below image: line 1 = location, line 2 = subtitle */}
      <div className="space-y-0.5 p-2.5 bg-card/80" dir={isRTL ? "rtl" : "ltr"}>
        <div className="text-xs text-muted-foreground line-clamp-1">{location || "—"}</div>
        <div className="text-xs font-medium text-foreground line-clamp-1">{subtitle}</div>
      </div>
    </button>
  );
}

export const HubItemCard = memo(HubItemCardContent);
