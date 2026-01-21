import { MapPin, Star } from "lucide-react";
import { HUB_CARD_BASE } from "./hubStyles";
import { cn } from "@/lib/utils";
import type { Business } from "@/hooks/useBusinesses";

interface BusinessCardProps {
  business: Business;
  onClick?: () => void;
  isRTL?: boolean;
  rating?: number;
  ratingCount?: number;
}

export function BusinessCard({
  business,
  onClick,
  isRTL,
  rating,
  ratingCount,
}: BusinessCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "bg-card overflow-hidden p-0 transition-transform active:scale-[0.99] touch-manipulation text-left",
        onClick && "cursor-pointer"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Image/Logo */}
      {business.image_url ? (
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          <img
            src={business.image_url}
            alt={business.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {business.featured && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
              {isRTL ? "مميز" : "FEATURED"}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
          <div className="text-2xl font-bold text-muted-foreground">
            {business.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Business name */}
        <h3 className="font-semibold text-sm line-clamp-1">{business.name}</h3>

        {/* Category */}
        <div className="text-xs text-primary">{business.category}</div>

        {/* Rating */}
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
            {ratingCount !== undefined && ratingCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({ratingCount})
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {business.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{business.location}</span>
          </div>
        )}

        {/* Description */}
        {business.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{business.description}</p>
        )}
      </div>
    </button>
  );
}
