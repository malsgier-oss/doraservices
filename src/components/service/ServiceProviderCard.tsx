import React, { useMemo, useState } from "react";
import { 
  MessageCircle, 
  Phone, 
  Star, 
  MapPin, 
  Heart, 
  Quote, 
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- Types ---
export interface ProviderData {
  id: string;
  provider_name?: string | null;
  provider_avatar?: string | null;
  title?: string | null;
  city?: string | null;
  sub_city?: string | null;
  image_urls?: string[] | null;
  image_url?: string | null;
  price?: number | null;
  provider_phone?: string | null;
  rating?: number;
  rating_count?: number;
  reviews?: string[]; 
  is_verified?: boolean;
}

interface ServiceProviderCardProps {
  provider: ProviderData;
  className?: string;
  variant?: "card" | "row"; 
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDetails?: () => void;
}

// Helper: Show Random Review
function ReviewSnippet({ reviews }: { reviews?: string[] }) {
  const snippet = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const random = reviews[Math.floor(Math.random() * reviews.length)];
    return random.length > 50 ? random.slice(0, 50) + "..." : random;
  }, [reviews]);

  if (!snippet) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/50 p-2 text-[10px] text-muted-foreground">
      <Quote className="h-3 w-3 shrink-0 opacity-40" />
      <span className="line-clamp-1 italic">{snippet}</span>
    </div>
  );
}

// Helper: Rating
function RatingDisplay({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
      <span>{rating.toFixed(1)}</span>
      <Star className="h-3 w-3 fill-current" />
      <span className="text-[10px] text-muted-foreground font-normal">({count || 0})</span>
    </div>
  );
}

export function ServiceProviderCard({
  provider,
  className,
  variant = "card",
  isFavorite,
  onToggleFavorite,
  onDetails,
}: ServiceProviderCardProps) {
  const [imageOpen, setImageOpen] = useState(false);

  // Normalize Image
  const coverImage = useMemo(() => {
    if (provider.image_urls?.length) return provider.image_urls[0];
    const raw = provider.image_url || "";
    try {
      if (raw.startsWith("[")) return JSON.parse(raw)[0];
    } catch {}
    return raw.split(",")[0]?.trim() || null;
  }, [provider]);

  const initials = (provider.provider_name || "?").slice(0, 2).toUpperCase();
  const location = [provider.city, provider.sub_city].filter(Boolean).join(" • ");
  
  // Actions
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.provider_phone) window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };
  const handleWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.provider_phone) {
        const d = provider.provider_phone.replace(/[^\d]/g, "");
        window.open(`https://wa.me/${d}`, "_blank");
    }
  };
  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Extra safety
    if (onToggleFavorite) onToggleFavorite();
  };

  // --- Row Variant (Sheet List) ---
  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn(
          "relative flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:bg-accent/5 cursor-pointer",
          className
        )}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <div 
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted border"
            onClick={(e) => { e.stopPropagation(); setImageOpen(true); }}
          >
            {coverImage ? (
              <img src={coverImage} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-base line-clamp-1">{provider.provider_name}</h3>
              {provider.price && <span className="text-sm font-bold text-primary shrink-0">{provider.price} د.ل</span>}
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{provider.title}</p>
            
            <div className="mt-1 flex items-center gap-2">
               <RatingDisplay rating={provider.rating} count={provider.rating_count} />
            </div>

            {location && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {location}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center gap-2 mt-1">
           <Button size="sm" variant="outline" className="h-8 flex-1 gap-2 text-xs border-green-200 text-green-700 bg-green-50/50" onClick={handleWhatsapp}>
             <MessageCircle className="h-3.5 w-3.5" /> واتساب
           </Button>
           <Button size="sm" variant="outline" className="h-8 flex-1 gap-2 text-xs" onClick={handleCall}>
             <Phone className="h-3.5 w-3.5" /> اتصال
           </Button>
           <Button size="sm" variant="ghost" className={cn("h-8 w-8 p-0 text-muted-foreground", isFavorite && "text-red-500")} onClick={handleFav}>
             <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
           </Button>
        </div>

        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="p-0 border-none bg-black/90 max-w-[90vw]">
             <div className="h-[50vh] flex items-center justify-center"><img src={coverImage || ""} className="max-h-full max-w-full" /></div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- Grid Variant (Main Home) ---
  return (
    <div className={cn("group flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden", className)} dir="rtl">
      <div className="relative aspect-[4/3] bg-muted">
        {coverImage ? (
          <img 
            src={coverImage} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
            onClick={onDetails}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
             <Avatar className="h-12 w-12"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          </div>
        )}
        
        {provider.price && provider.price > 0 && (
           <Badge className="absolute top-2 left-2 bg-black/60 hover:bg-black/70 border-none text-white">
             {provider.price} د.ل
           </Badge>
        )}
        
        {/* Floating Rating */}
        {!!provider.rating && (
           <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
              <span>{provider.rating.toFixed(1)}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
           </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
         <div className="flex justify-between items-start">
            <h3 className="font-bold truncate text-base hover:text-primary cursor-pointer" onClick={onDetails}>{provider.provider_name}</h3>
            <button onClick={handleFav} className={cn("text-muted-foreground hover:text-red-500", isFavorite && "text-red-500")}>
               <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </button>
         </div>
         
         <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{provider.title}</p>
         
         <ReviewSnippet reviews={provider.reviews} />
         
         <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
            <Button size="sm" className="w-full text-xs h-9" onClick={handleCall}>
               <Phone className="h-3.5 w-3.5 mr-1.5" /> اتصال
            </Button>
            <Button size="sm" variant="secondary" className="w-full text-xs h-9 bg-green-100 text-green-700 hover:bg-green-200" onClick={handleWhatsapp}>
               <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> واتساب
            </Button>
         </div>
      </div>
    </div>
  );
}

export default ServiceProviderCard;
