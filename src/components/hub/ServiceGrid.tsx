import { useMemo } from "react";
import { ServiceCardCompact } from "./ServiceCardCompact";
import { ServiceCardFeatured } from "./ServiceCardFeatured";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { useServiceRatings } from "@/hooks/useReviews";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  title: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
};

interface ServiceGridProps {
  services: Service[];
  variant?: "compact" | "featured";
  columns?: 2 | 3 | 4;
  onServiceClick: (service: Service) => void;
  onCall: (service: Service) => void;
  onWhatsApp: (service: Service) => void;
  className?: string;
}

export function ServiceGrid({
  services,
  variant = "compact",
  columns = 3,
  onServiceClick,
  onCall,
  onWhatsApp,
  className,
}: ServiceGridProps) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const serviceIds = useMemo(() => services.map((s) => s.id), [services]);
  const { ratings } = useServiceRatings(serviceIds);

  const getRating = (serviceId: string) => {
    const row = ratings.get(serviceId);
    if (!row) return null;
    return {
      value: Number(row.averageRating || 0),
      count: Number(row.totalReviews || 0),
    };
  };

  const getContactState = (service: Service) => {
    const canCall = !!service.provider_phone;
    const canWhatsApp = canCall && (service.allow_whatsapp !== false);
    return { canCall, canWhatsApp };
  };

  const labels = {
    call: isRTL ? "اتصال" : "Call",
    whatsapp: isRTL ? "واتساب" : "WhatsApp",
    providerFallback: isRTL ? "مزود خدمة" : "Service Provider",
    noPhoto: isRTL ? "لا توجد صورة" : "No Photo",
    ratingFallback: isRTL ? "جديد" : "New",
  };

  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  if (variant === "featured") {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={cn(
          "flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory",
          className
        )}
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {services.map((service) => {
          const contact = getContactState(service);
          return (
            <div key={service.id} className="shrink-0 w-[82vw] max-w-[360px] snap-center">
              <ServiceCardFeatured
                service={service}
                rating={getRating(service.id)}
                isRTL={isRTL}
                canCall={contact.canCall}
                canWhatsApp={contact.canWhatsApp}
                onOpen={() => onServiceClick(service)}
                onCall={() => onCall(service)}
                onWhatsApp={() => onWhatsApp(service)}
                labels={labels}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={cn("grid gap-4", gridCols[columns], className)}
    >
      {services.map((service) => {
        const contact = getContactState(service);
        return (
          <ServiceCardCompact
            key={service.id}
            service={service}
            rating={getRating(service.id)}
            isRTL={isRTL}
            canCall={contact.canCall}
            canWhatsApp={contact.canWhatsApp}
            onOpen={() => onServiceClick(service)}
            onCall={() => onCall(service)}
            onWhatsApp={() => onWhatsApp(service)}
            labels={labels}
          />
        );
      })}
    </div>
  );
}
