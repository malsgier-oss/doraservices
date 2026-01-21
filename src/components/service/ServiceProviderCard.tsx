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
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { trackProviderEvent } from "@/lib/providerTelemetry";

// --- Types (Shared) ---
export interface ProviderData {
  id: string;
  /** Owner user id (provider) if available from services table */
  user_id?: string | null;
  provider_name?: string | null;
  provider_avatar?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  city?: string | null;
  sub_city?: string | null;
  image_urls?: string[] | null;
  image_url?: string | null;
  price?: number | null;
  provider_phone?: string | null;
  /** If false, hide WhatsApp CTA everywhere */
  allow_whatsapp?: boolean | null;
  rating?: number;
  rating_count?: number;
  // New: Array of review texts for the snippet feature
  reviews?: string[]; 
  is_verified?: boolean;
  views_count?: number | null;
  call_clicks?: number | null;
  whatsapp_clicks?: number | null;
  // Service lifecycle flags (used for trust/visibility logic in sheets)
  is_active?: boolean | null;
  is_visible?: boolean | null;
  is_paused?: boolean | null;
  is_featured?: boolean | null;
  approval_status?: string | null;
}

interface ServiceProviderCardProps {
  provider: ProviderData;
  className?: string;
  /** "card" = Grid View (Home/Hub), "row" = List View (Sheet) */
  variant?: "card" | "row"; 
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  /** Optional: show a tiny report action (usually wired from the Sheet). */
  onReport?: () => void;
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
  if (!count || count <= 0) return null;
  if (rating === undefined || rating === null) return null;
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
  onReport,
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
  
  const telLink = getTelLink(String(provider.provider_phone || ""));
  const waLink = getWhatsAppLink(String(provider.provider_phone || ""));
  const allowWhatsapp = provider.allow_whatsapp !== false;

  const canCall = telLink !== "tel:";
  const canWhatsApp = waLink !== "https://wa.me/" && allowWhatsapp;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canCall) {
      toast.error(t("رقم الهاتف غير متوفر", "Phone number not available"));
      return;
    }
    // Best-effort tracking (doesn't block the call)
    if (provider?.id) {
      void trackProviderEvent(provider.id, "call");
    }
    window.open(telLink, "_self");
  };

  const handleWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canWhatsApp) {
      toast.error(t("واتساب غير متوفر", "WhatsApp not available"));
      return;
    }
    // Best-effort tracking (doesn't block WhatsApp)
    if (provider?.id) {
      void trackProviderEvent(provider.id, "whatsapp");
    }
    window.open(waLink, "_blank");
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReport?.();
  };

  // --- VARIANT 1: The "Row" (Advanced List Item for Sheet) ---
  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn(
          "group relative flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-[0_6px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:ring-white/10 transition-shadow hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] active:scale-[0.99] cursor-pointer touch-manipulation",
          className
        )}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          {/* BIGGER Image (Left/Right) */}
          <div 
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 dark:ring-white/10"
            onClick={(e) => { e.stopPropagation(); setImageOpen(true); }}
          >
            {coverImage ? (
              <img src={coverImage} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
        <div className="flex items-center gap-3 mt-2">
           <Button 
             size="sm" 
             variant="outline" 
             className={cn("h-10 flex-1 gap-2 text-sm rounded-xl", !canCall && "opacity-50")}
             onClick={handleCall}
             disabled={!canCall}
           >
             <Phone className="h-3.5 w-3.5" /> اتصال
           </Button>

           {allowWhatsapp && (
           <Button 
             size="sm" 
             variant="outline" 
             className={cn(
               "h-10 flex-1 gap-2 text-sm rounded-xl border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800",
               !canWhatsApp && "opacity-50"
             )}
             onClick={handleWhatsapp}
             disabled={!canWhatsApp}
           >
             <MessageCircle className="h-3.5 w-3.5" /> واتساب
           </Button>
           )}

           <Button
             size="sm"
             variant="ghost"
             className="h-10 w-10 rounded-xl p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
             onClick={handleFav}
           >
             <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
           </Button>

           {onReport && (
             <button
               onClick={handleReport}
               className="h-10 px-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
               aria-label="Report"
               title="إبلاغ"
             >
               إبلاغ
             </button>
           )}
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
      onClick={() => onDetails?.()}
      className={cn("group flex flex-col rounded-2xl bg-card shadow-[0_6px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-shadow hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] cursor-pointer active:scale-[0.99] touch-manipulation", className)} 
      dir="rtl"
      style={{ touchAction: "manipulation" }}
    >
      {/* Hero Image */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={provider.provider_name || ""} 
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
             <Avatar className="h-16 w-16 text-xl"><AvatarFallback>{initials}</AvatarFallback></Avatar>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
           {provider.price && provider.price > 0 && (
             <Badge className="bg-black/60 backdrop-blur hover:bg-black/70 border-none text-white px-2 pointer-events-none">
               {provider.price} د.ل
             </Badge>
           )}
        </div>
        
        {/* Rating Floating on Image (Modern Look) */}
        {!!provider.rating_count && provider.rating_count > 0 && provider.rating !== undefined && provider.rating !== null && (
           <div className="absolute bottom-2 right-2 pointer-events-none">
              <div className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold text-foreground shadow-sm dark:bg-black/80">
                <span>{provider.rating.toFixed(1)}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
           </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 
            className="font-bold text-lg leading-tight truncate hover:underline decoration-primary/50"
          >
            {provider.provider_name}
          </h3>
          {/* Favorite Button (Top right of text area) */}
          <button 
             onClick={handleFav}
             className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center"
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
      <div className="flex gap-2 p-4 pt-0" dir="rtl">
        <Button 
           size="sm" 
           variant="default" 
           className={cn("h-11 rounded-xl w-full flex-1 gap-2 text-sm", !canCall && "opacity-50")}
           onClick={handleCall}
           disabled={!canCall}
        >
          <Phone className="h-4 w-4 ml-2" /> اتصال
        </Button>
        {allowWhatsapp && (
        <Button 
           size="sm" 
           variant="secondary" 
           className={cn(
             "h-11 rounded-xl w-full flex-1 gap-2 text-sm bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
             !canWhatsApp && "opacity-50"
           )}
           onClick={handleWhatsapp}
           disabled={!canWhatsApp}
        >
          <MessageCircle className="h-4 w-4 ml-2" /> واتساب
        </Button>
        )}
      </div>
    </div>
  );
}

export default ServiceProviderCard;
