import React, { useMemo, useState } from "react";
import { MessageCircle, Phone, Star, MapPin, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Types ---
export interface ProviderData {
  id: string;
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

  // --- Render: Row Variant (Google Maps Style) ---
  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn(
          "group relative flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all hover:bg-accent/5 cursor-pointer", 
          className
        )}
        dir="rtl"
      >
        {/* Thumb */}
        <div className="shrink-0">
          <div className="h-[72px] w-[72px] overflow-hidden rounded-lg border bg-muted">
            {coverImage ? (
              <img src={coverImage} alt={provider.provider_name || ""} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(provider.provider_name)}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-foreground truncate">{provider.provider_name || "Unknown Provider"}</h4>
            {!!provider.rating && (
              <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                <span>{provider.rating.toFixed(1)}</span>
                <Star className="h-3 w-3 fill-current" />
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{provider.title}</p>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
              {location && <><MapPin className="h-3 w-3" /> {location}</>}
            </span>
            {typeof provider.price === 'number' && provider.price > 0 && (
              <span className="text-sm font-bold text-primary">{provider.price} د.ل</span>
            )}
          </div>
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
          {!!provider.rating && (
            <div className="shrink-0 flex flex-col items-center justify-center rounded-lg bg-amber-50 px-2 py-1 text-amber-700 border border-amber-100">
              <span className="font-bold text-sm flex items-center gap-1">
                {provider.rating.toFixed(1)} <Star className="h-3 w-3 fill-current" />
              </span>
              <span className="text-[10px] opacity-80">({provider.rating_count || 0})</span>
            </div>
          )}
        </div>

        {location && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-3 grid grid-cols-[1fr_1fr_auto] gap-2 border-t bg-muted/20">
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
