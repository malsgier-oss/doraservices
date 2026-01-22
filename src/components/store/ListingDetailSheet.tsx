import { useState, useEffect } from "react";
import { Phone, MessageCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackListingView, trackListingCall, trackListingWhatsApp } from "@/lib/storeAnalytics";
import type { StoreListing, BusinessStore } from "@/types/store";
import { cn } from "@/lib/utils";

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle>{listing.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCall}
              disabled={!phone}
              className="flex-1"
              size="lg"
            >
              <Phone className="mr-2 h-5 w-5" />
              {t("اتصل", "Call")}
            </Button>
            <Button
              onClick={handleWhatsApp}
              disabled={!whatsapp}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              {t("واتساب", "WhatsApp")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
