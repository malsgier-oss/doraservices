import React, { useMemo, useState } from "react";
import { 
  MessageCircle, 
  Phone, 
  Star, 
  MapPin, 
  Heart, 
  Quote, 
  ChevronRight 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

// --- Types (Shared) ---
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
  // New: Array of review texts for the snippet feature
  reviews?: string[]; 
  is_verified?: boolean;
}

interface ServiceProviderCardProps {
  provider: ProviderData;
  className?: string;
  /** "card" = Grid View (Home/Hub), "row" = List View (Sheet) */
  variant?: "card" | "row"; 
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDetails?: () => void;
}

// --- Helper Components ---

// 1. Random Review Snippet
function ReviewSnippet({ reviews }: { reviews?: string[] }) {
  const snippet = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    // Pick one random review to show for social proof
    const random = reviews[Math.floor(Math.random() * reviews.length)];
    return random.length > 60 ? random.slice(0, 60) + "..." : random;
  }, [reviews]);

  if (!snippet) return null;

  return (
    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground italic">
      <Quote className="h-3 w-3 shrink-0 opacity-50" />
      <span className="line-clamp-1">{snippet}</span>
    </div>
  );
}

// 2. Rating Badge
function RatingBadge({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1 rounded bg-amber-100/50 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
      <span>{rating.toFixed(1)}</span>
      <Star className="h-3 w-3 fill-current" />
      <span className="text-[10px] font-normal opacity-70">({count || 0})</span>
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
  const { t } = useLanguage();
  const [imageOpen, setImageOpen] = useState(false);

  // -- Data Prep --
  const coverImage = useMemo(() => {
    if (provider.image_urls?.length) return provider.image_urls[0];
    const raw = provider.image_url || "";
    if (raw.startsWith("[")) {
      try { return JSON.parse(raw)[0]; } catch {}
    }
    return raw.split(",")[0]?.trim() || null;
  }, [provider]);

  const initials = (provider.provider_name || "?").slice(0, 2).toUpperCase();
  const location = [provider.city, provider.sub_city].filter(Boolean).join(" • ");
  
  // Clean phone numbers
  const tel = provider.provider_phone?.replace(/\s+/g, "");
  const whatsapp = provider.provider_phone?.replace(/[^\d]/g, "");

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(tel) window.open(`tel:${tel}`, "_self");
  };

  const handleWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(whatsapp) window.open(`https://wa.me/${whatsapp}`, "_blank");
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  // --- VARIANT 1: The "Row" (Advanced List Item for Sheet) ---
  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn(
          "group relative flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:border-primary/20 active:scale-[0.99] cursor-pointer",
          className
        )}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          {/* BIGGER Image (Left/Right) */}
          <div 
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted border"
            onClick={(e) => { e.stopPropagation(); setImageOpen(true); }}
          >
            {coverImage ? (
              <img src={coverImage} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Avatar className="h-10 w-10"><AvatarFallback>{initials}</AvatarFallback></Avatar>
              </div>
            )}
          </div>

          {/* Content Middle */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-base text-foreground line-clamp-1">
                {provider.provider_name}
              </h3>
              {/* Price Tag */}
              {provider.price ? (
                <span className="shrink-0 text-sm font-bold text-primary">
                  {provider.price} د.ل
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground line-clamp-1">{provider.title}</p>
              <RatingBadge rating={provider.rating} count={provider.rating_count} />
            </div>

            {location && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground/80">
                <MapPin className="h-3 w-3" />
                {location}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Row (Inside the list item!) */}
        <div className="flex items-center gap-2 mt-1">
           <Button 
             size="sm" 
             variant="outline" 
             className="h-8 flex-1 gap-2 text-xs rounded-lg border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
             onClick={handleWhatsapp}
           >
             <MessageCircle className="h-3.5 w-3.5" /> واتساب
           </Button>
           
           <Button 
             size="sm" 
             variant="outline" 
             className="h-8 flex-1 gap-2 text-xs rounded-lg"
             onClick={handleCall}
           >
             <Phone className="h-3.5 w-3.5" /> اتصال
           </Button>

           <Button
             size="sm"
             variant="ghost"
             className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
             onClick={handleFav}
           >
             <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
           </Button>
        </div>
        
        {/* Full Image Dialog */}
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-[90vw] p-0 border-none bg-black/90">
             <div className="h-[60vh] flex items-center justify-center">
               <img src={coverImage || ""} className="max-h-full max-w-full object-contain" />
             </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- VARIANT 2: The "Card" (Grid View) ---
  return (
    <div 
      className={cn("group flex flex-col rounded-2xl border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md", className)} 
      dir="rtl"
    >
      {/* Hero Image */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={provider.provider_name || ""} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
            onClick={() => onDetails?.()}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
             <Avatar className="h-16 w-16 text-xl"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
           {provider.price && provider.price > 0 && (
             <Badge className="bg-black/60 backdrop-blur hover:bg-black/70 border-none text-white px-2">
               {provider.price} د.ل
             </Badge>
           )}
        </div>
        
        {/* Rating Floating on Image (Modern Look) */}
        {!!provider.rating && (
           <div className="absolute bottom-2 right-2">
              <div className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold text-foreground shadow-sm dark:bg-black/80">
                <span>{provider.rating.toFixed(1)}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
           </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3">
        <div className="flex justify-between items-start mb-1">
          <h3 
            className="font-bold text-lg leading-tight truncate cursor-pointer hover:underline decoration-primary/50"
            onClick={onDetails}
          >
            {provider.provider_name}
          </h3>
          {/* Favorite Button (Top right of text area) */}
          <button 
             onClick={handleFav}
             className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-1">{provider.title}</p>
        
        {location && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {location}
          </div>
        )}

        {/* Random Review Line */}
        <div className="mt-auto pt-2">
          <ReviewSnippet reviews={provider.reviews} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="grid grid-cols-[1fr_1fr] gap-2 p-3 pt-0">
        <Button 
           size="sm" 
           variant="default" 
           className="rounded-xl w-full"
           onClick={handleCall}
        >
          <Phone className="h-4 w-4 mr-2" /> اتصال
        </Button>
        <Button 
           size="sm" 
           variant="secondary" 
           className="rounded-xl w-full bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
           onClick={handleWhatsapp}
        >
          <MessageCircle className="h-4 w-4 mr-2" /> واتساب
        </Button>
      </div>
    </div>
  );
}

export default ServiceProviderCard;
