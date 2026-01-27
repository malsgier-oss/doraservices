import { useState, useEffect } from "react";
import { Phone, MessageCircle, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackListingView, trackListingCall, trackListingWhatsApp } from "@/lib/storeAnalytics";
import type { StoreListing, BusinessStore } from "@/types/store";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ListingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: StoreListing | null;
  store: BusinessStore | null;
  onView?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
}

export function ListingDetailSheet({
  open,
  onOpenChange,
  listing,
  store,
  onView,
  onCall,
  onWhatsApp,
}: ListingDetailSheetProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user } = useAuth();

  // Check if listing is favorited
  useEffect(() => {
    if (!user || !listing) {
      setIsFavorite(false);
      return;
    }
    let alive = true;
    const checkFavorite = async () => {
      try {
        const { data } = await supabase
          .from("saved_listings")
          .select("id")
          .eq("user_id", user.id)
          .eq("listing_id", listing.id)
          .maybeSingle();
        if (alive) setIsFavorite(!!data);
      } catch {
        if (alive) setIsFavorite(false);
      }
    };
    checkFavorite();
    return () => { alive = false; };
  }, [user, listing?.id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.info(t("سجل دخولك لحفظ المفضلة", "Sign in to save favorites"));
      return;
    }
    if (!listing) return;

    const wasF = isFavorite;
    setIsFavorite(!wasF);

    try {
      if (wasF) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listing.id });
        if (error) throw error;
      }
    } catch {
      setIsFavorite(wasF);
      toast.error(t("تعذر تحديث المفضلة", "Failed to update favorites"));
    }
  };

  useEffect(() => {
    if (listing && open) {
      setCurrentImageIndex(0);
      trackListingView(listing.id);
      onView?.();
    }
  }, [listing, open, onView]);

  if (!listing || !store) return null;

  const images = listing.image_urls || [];
  const phone = store.contact_phone || "";
  const whatsapp = store.contact_whatsapp || store.contact_phone || "";
  const canContact = !!phone;
  const canWhatsApp = !!whatsapp;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleCall = () => {
    if (!phone) return;
    if (listing) {
      trackListingCall(listing.id);
    }
    onCall?.();
    window.location.href = `tel:${phone.replace(/\D/g, "")}`;
  };

  const handleWhatsApp = () => {
    if (!whatsapp) return;
    if (listing) {
      trackListingWhatsApp(listing.id);
    }
    onWhatsApp?.();
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>{listing.title}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4 px-4">
            {/* Image Carousel */}
            {images.length > 0 ? (
              <div className="relative">
                <div className="relative w-full" style={{ aspectRatio: "1" }}>
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-2 justify-center">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          index === currentImageIndex ? "bg-primary" : "bg-muted"
                        )}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full bg-muted rounded-lg flex items-center justify-center" style={{ aspectRatio: "1" }}>
                <span className="text-muted-foreground">{t("لا توجد صورة", "No image")}</span>
              </div>
            )}

            {/* Listing Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold">{listing.title}</h2>
                {listing.price && (
                  <p className="text-xl font-semibold text-primary mt-1">
                    {listing.price} {listing.currency}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-muted rounded-md text-sm">{listing.category}</span>
                <span className="text-sm text-muted-foreground">
                  {t("مشاهدات", "Views")}: {listing.views_count || 0}
                </span>
              </div>

              {listing.description && (
                <div>
                  <h3 className="font-semibold mb-2">{t("الوصف", "Description")}</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{listing.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar */}
        <div 
          className="border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {canContact ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="lg"
                className="flex-1 gap-2 h-12 rounded-xl font-semibold shadow-lg shadow-primary/20"
                onClick={handleCall}
              >
                <Phone className="h-4 w-4" />
                {t("اتصال", "Call")}
              </Button>
              {canWhatsApp && (
                <Button
                  type="button"
                  size="lg"
                  className="flex-1 gap-2 h-12 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("واتساب", "WhatsApp")}
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={cn(
                  "h-12 w-12 rounded-xl shrink-0",
                  isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
                )}
                onClick={toggleFavorite}
                aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
              >
                <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex-1 text-sm text-muted-foreground text-center py-2">
                {t("رقم الهاتف غير متوفر حالياً", "Phone number not available")}
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={cn(
                  "h-12 w-12 rounded-xl shrink-0",
                  isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
                )}
                onClick={toggleFavorite}
                aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
              >
                <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
