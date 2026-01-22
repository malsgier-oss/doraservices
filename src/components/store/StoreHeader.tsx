import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackStoreCall, trackStoreWhatsApp } from "@/lib/storeAnalytics";
import type { BusinessStore } from "@/types/store";
import { cn } from "@/lib/utils";

interface StoreHeaderProps {
  store: BusinessStore;
  className?: string;
}

export function StoreHeader({ store, className }: StoreHeaderProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const phone = store.contact_phone || "";
  const whatsapp = store.contact_whatsapp || store.contact_phone || "";
  
  const telLink = phone ? `tel:${phone.replace(/\D/g, "")}` : "#";
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "#";

  const handleCall = () => {
    if (!phone) return;
    trackStoreCall(store.id);
    window.location.href = telLink;
  };

  const handleWhatsApp = () => {
    if (!whatsapp) return;
    trackStoreWhatsApp(store.id);
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("relative", className)}>
      {/* Banner */}
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        
        {/* Logo overlay */}
        {store.logo_url && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <img
              src={store.logo_url}
              alt={store.name}
              className="w-24 h-24 rounded-full border-4 border-background object-cover shadow-lg"
            />
          </div>
        )}
      </div>

      {/* Store Info */}
      <div className="pt-16 pb-6 px-4 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{store.name}</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded-md">{store.category}</span>
            {store.city_id && (
              <span>• {t("المدينة", "City")}</span>
            )}
            {store.address && (
              <span>• {store.address}</span>
            )}
          </div>
        </div>

        {/* About */}
        {store.about_text && (
          <div className="text-center text-muted-foreground">
            <p className="line-clamp-3">{store.about_text}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleCall}
            disabled={!phone}
            className="flex-1 max-w-[200px]"
            size="lg"
          >
            <Phone className="mr-2 h-5 w-5" />
            {t("اتصل", "Call")}
          </Button>
          <Button
            onClick={handleWhatsApp}
            disabled={!whatsapp}
            variant="outline"
            className="flex-1 max-w-[200px]"
            size="lg"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            {t("واتساب", "WhatsApp")}
          </Button>
        </div>
      </div>
    </div>
  );
}
