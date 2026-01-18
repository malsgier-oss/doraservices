import React, { useMemo } from "react";
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
import { cn } from "@/lib/utils";

export interface ProviderData {
  id: string;
  provider_name?: string | null;
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
}

interface ServiceProviderCardProps {
  provider: ProviderData;
  className?: string;
  variant?: "card" | "row"; 
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onDetails?: () => void;
}

export function ServiceProviderCard({
  provider,
  className,
  variant = "card",
  isFavorite,
  onToggleFavorite,
  onDetails,
}: ServiceProviderCardProps) {
  
  // Extract all images for the scrollable list
  const allImages = useMemo(() => {
    if (provider.image_urls?.length) return provider.image_urls;
    const raw = provider.image_url || "";
    try { if (raw.startsWith("[")) return JSON.parse(raw); } catch {}
    return raw.split(",").map(s => s.trim()).filter(Boolean);
  }, [provider]);

  const location = [provider.city, provider.sub_city].filter(Boolean).join(" • ");
  
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.provider_phone) window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = provider.provider_phone?.replace(/[^\d]/g, "");
    if (d) window.open(`https://wa.me/${d}`, "_blank");
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(provider.id);
  };

  if (variant === "row") {
    return (
      <div 
        onClick={onDetails}
        className={cn("group relative flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-sm hover:border-primary/30 transition-all cursor-pointer", className)}
        dir="rtl"
      >
        {/* BIGGER SCROLLABLE PHOTOS */}
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-1">
          {allImages.length > 0 ? (
            allImages.map((src, i) => (
              <div key={i} className="relative h-48 w-full shrink-0 snap-center rounded-2xl overflow-hidden border bg-muted">
                <img src={src} className="h-full w-full object-cover" alt="" />
                {i === 0 && provider.rating && (
                  <div className="absolute top-3 right-3 bg-white/95 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
                    {provider.rating.toFixed(1)} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="h-48 w-full rounded-2xl bg-muted flex items-center justify-center opacity-30"><Avatar><AvatarFallback>?</AvatarFallback></Avatar></div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-xl leading-tight">{provider.provider_name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{provider.title}</p>
            </div>
            {/* FAV BUTTON: Top Right next to text */}
            <button 
              onClick={handleFav} 
              className={cn("p-2 rounded-full transition-colors", isFavorite ? "bg-red-50 text-red-500" : "bg-muted text-muted-foreground")}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {location || "ليبيا"}
          </div>

          {/* Random Review Snippet */}
          {provider.reviews && provider.reviews.length > 0 && (
            <div className="bg-muted/40 p-2 rounded-lg text-[11px] text-muted-foreground italic flex items-start gap-1">
              <Quote className="h-3 w-3 shrink-0 opacity-40" />
              <span className="line-clamp-1">{provider.reviews[0]}</span>
            </div>
          )}

          {/* BUTTONS: Call on Right, WhatsApp on Left (RTL) */}
          <div className="flex gap-3 mt-2">
            <Button variant="default" className="flex-1 h-11 rounded-xl shadow-sm" onClick={handleCall}>
              <Phone className="h-4 w-4 ml-2" /> اتصال
            </Button>
            <Button variant="outline" className="flex-1 h-11 rounded-xl border-green-200 text-green-700 bg-green-50/30 hover:bg-green-50" onClick={handleWhatsapp}>
              <MessageCircle className="h-4 w-4 ml-2" /> واتساب
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
     <div className="border rounded-2xl p-4">Grid card placeholder</div>
  );
}
