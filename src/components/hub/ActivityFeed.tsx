import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ServiceCardCompact } from "./ServiceCardCompact";
import { Skeleton } from "@/components/ui/skeleton";
import { HUB_CARD_BASE, HUB_CARD_ROW_4, HUB_CARD_SLOT_4 } from "./hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { useServiceRatings } from "@/hooks/useReviews";
import { Sparkles } from "lucide-react";

interface ActivityFeedProps {
  cityId?: string | null;
  cityName?: string | null;
  onOpenService: (service: any) => void;
  onCall: (service: any) => void;
  onWhatsApp: (service: any) => void;
}

export function ActivityFeed({
  cityId,
  cityName,
  onOpenService,
  onCall,
  onWhatsApp,
}: ActivityFeedProps) {
  const { data: activities, isLoading } = useActivityFeed(cityId);
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  
  const serviceIds = activities?.map(s => s.id) || [];
  const { ratings } = useServiceRatings(serviceIds);
  
  const getRating = (serviceId: string) => {
    const row = ratings.get(serviceId);
    if (!row) return null;
    return {
      value: Number(row.averageRating || 0),
      count: Number(row.totalReviews || 0),
    };
  };

  const getContactState = (service: any) => {
    const canCall = !!service.provider_phone;
    const canWhatsApp = canCall && (service.allow_whatsapp !== false);
    return { canCall, canWhatsApp };
  };

  const labels = {
    call: isRTL ? "اتصال" : "Call",
    whatsapp: isRTL ? "واتساب" : "WhatsApp",
    providerFallback: isRTL ? "مزود خدمة" : "Service Provider",
    noPhoto: isRTL ? "لا توجد صورة" : "No Photo",
    ratingFallback: isRTL ? "لا توجد تقييمات" : "No Ratings",
  };

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className={HUB_CARD_ROW_4}
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`activity-placeholder-${i}`}
            className={`${HUB_CARD_SLOT_4} ${HUB_CARD_BASE} bg-card overflow-hidden`}
          >
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-44 mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={HUB_CARD_ROW_4}
      style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
    >
      {activities.map((service) => {
        const contact = getContactState(service);
        return (
          <div key={service.id} className={`${HUB_CARD_SLOT_4} relative`}>
            {service.isNew && (
              <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                {isRTL ? "جديد" : "NEW"}
              </div>
            )}
            <ServiceCardCompact
              service={service}
              rating={getRating(service.id)}
              isRTL={isRTL}
              canCall={contact.canCall}
              canWhatsApp={contact.canWhatsApp}
              onOpen={() => onOpenService(service)}
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
