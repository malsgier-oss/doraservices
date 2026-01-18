import React, { useMemo, useState } from "react";
import { MessageCircle, Phone, Star, MapPin, Eye, Heart, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Types ---
export interface ProviderData {
  id: string;
  provider_id?: string | null;
  provider_name?: string | null;
  provider_avatar?: string | null;
  title?: string | null; // Service title
  city?: string | null;
  sub_city?: string | null;
  image_urls?: string[] | null; // Array of images
  image_url?: string | null; // Fallback single image
  price?: number | null;
  provider_phone?: string | null;
  rating?: number;
  rating_count?: number;
}

interface ServiceProviderCardProps {
  provider: ProviderData;
  className?: string;
  variant?: "card" | "row"; // "row" for the sheet list, "card" for grids
  onDetails?: () => void;
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;
  onReport?: (provider: ProviderData) => void;
}

// --- Helpers ---
function getInitials(name?: string | null) {
  return (name || "?").slice(0, 2).toUpperCase();
}

export function ServiceProviderCard({
  provider,
  className,
  variant = "card",
  onDetails,
  onToggleFavorite,
  isFavorite,
  onReport,
}: ServiceProviderCardProps) {
  const { t } = useLanguage();
  const [viewerOpen, setViewerOpen] = useState(false);

  // Data Normalization
  const coverImage = useMemo(() => {
    // Try array first, then fallback string
    if (provider.image_urls?.length) return provider.image_urls[0];
    const raw = provider.image_url || "";
    if (raw.startsWith("[")) {
      try { return JSON.parse(raw)[0]; } catch {}
    }
    return raw.split(",")[0]?.trim() || null;
  }, [provider]);

  const location = [provider.city, provider.sub_city].filter(Boolean).join(" • ");
  const tel = provider.provider_phone?.replace(/\s+/g, "");
  const whatsapp = provider.provider_phone?.replace(/[^\d]/g, "");

  const fav = isFavorite ? isFavorite(provider.id) : false;
  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(provider.id);
  };
  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReport?.(provider);
  };

  // --- Render: Row Variant (Google Maps Style) ---
  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn(
          "group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:bg-accent/5 cursor-pointer",
          className
        )}
        dir="rtl"
      >
        <div className="flex items-start gap-4">
          {/* Thumb */}
          <div className="shrink-0">
            <div className="h-[104px] w-[104px] overflow-hidden rounded-xl border bg-muted">
              {coverImage ? (
                <img src={coverImage} alt={provider.provider_name || ""} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(provider.provider_name)}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-right">
            <div className="flex justify-between items-start gap-3">
              <h4 className="font-semibold text-foreground truncate text-base">
                {provider.provider_name || "Unknown Provider"}
              </h4>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 shrink-0">
                <span>{(provider.rating ?? 0).toFixed(1)}</span>
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="text-muted-foreground font-medium">({provider.rating_count || 0})</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{provider.title}</p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground/80 flex items-center gap-1 min-w-0">
                {location ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{location}</span>
                  </>
                ) : null}
              </span>
              {typeof provider.price === "number" && provider.price > 0 && (
                <span className="text-sm font-bold text-primary shrink-0">{provider.price} د.ل</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 pt-1">
          <Button
            size="sm"
            className="w-full gap-2 rounded-xl"
            asChild
            disabled={!tel}
            onClick={(e) => e.stopPropagation()}
          >
            <a href={tel ? `tel:${tel}` : "#"}>
              <Phone className="h-4 w-4" />
              اتصال
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 rounded-xl"
            asChild
            disabled={!whatsapp}
            onClick={(e) => e.stopPropagation()}
          >
            <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 text-green-600" />
              واتساب
            </a>
          </Button>
          <Button
            size="sm"
            variant={fav ? "default" : "secondary"}
            className="w-full gap-2 rounded-xl"
            onClick={handleFav}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
            مفضلة
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 rounded-xl"
            onClick={handleReport}
            title="إبلاغ"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // --- Render: Card Variant (Grid Display) ---
  return (
    <div className={cn("flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden", className)} dir="rtl">
      {/* Header / Image */}
      <div className="relative h-40 w-full bg-muted">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={provider.provider_name || ""} 
            className="h-full w-full object-cover cursor-pointer transition-transform hover:scale-105"
            onClick={() => setViewerOpen(true)}
          />
        ) : (
           <div className="h-full w-full flex items-center justify-center">
             <Avatar className="h-16 w-16">
               <AvatarImage src={provider.provider_avatar || ""} />
               <AvatarFallback className="text-lg">{getInitials(provider.provider_name)}</AvatarFallback>
             </Avatar>
           </div>
        )}
        
        {/* Floating Price Tag */}
        {typeof provider.price === 'number' && provider.price > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
            {provider.price} د.ل
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-bold text-lg leading-tight text-foreground">{provider.provider_name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{provider.title}</p>
          </div>
          {/* Rating Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-amber-50 px-2 py-1 text-amber-700 border border-amber-100">
            <span className="font-bold text-sm flex items-center gap-1">
              {(provider.rating ?? 0).toFixed(1)} <Star className="h-3 w-3 fill-current" />
            </span>
            <span className="text-[10px] opacity-80">({provider.rating_count || 0})</span>
          </div>
        </div>

        {location && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-t bg-muted/20">
        <Button size="sm" className="w-full gap-2 rounded-lg" asChild disabled={!tel}>
          <a href={tel ? `tel:${tel}` : "#"}>
            <Phone className="h-4 w-4" />
            اتصال
          </a>
        </Button>
        <Button size="sm" variant="outline" className="w-full gap-2 rounded-lg" asChild disabled={!whatsapp}>
          <a href={whatsapp ? `https://wa.me/${whatsapp}` : "#"} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4 text-green-600" />
            واتساب
          </a>
        </Button>
        <Button
          size="sm"
          variant={fav ? "default" : "secondary"}
          className="w-full gap-2 rounded-lg"
          onClick={handleFav}
        >
          <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
          مفضلة
        </Button>
        {onDetails && (
          <Button size="sm" variant="ghost" className="px-3" onClick={onDetails}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Full Screen Image Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[90vw] p-0 overflow-hidden bg-black border-none">
          <div className="relative h-[70vh] flex items-center justify-center">
            <img src={coverImage || ""} className="max-h-full max-w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ServiceProviderCard;
