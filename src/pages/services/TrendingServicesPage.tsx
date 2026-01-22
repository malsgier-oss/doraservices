import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCardCompact } from "@/components/hub/ServiceCardCompact";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { ServiceDetailSheet, type SheetService } from "@/components/service/ServiceDetailSheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTrendingServices } from "@/hooks/useTrendingServices";
import { useCities } from "@/hooks/useCities";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { useServiceRatings } from "@/hooks/useReviews";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function TrendingServicesPage() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { data: cities } = useCities();
  const { data: allSubcategories } = useAllSubcategories();

  const cityId = getStoredCityId();
  const selectedCityName = useMemo(() => {
    return (cities || []).find((c) => c.id === cityId)?.name || null;
  }, [cities, cityId]);

  const { data: services, isLoading } = useTrendingServices(cityId, 50);
  const serviceIds = services?.map((s) => s.id) || [];
  const { ratings } = useServiceRatings(serviceIds);

  const subcatByName = useMemo(() => {
    const m = new Map<string, any>();
    for (const sc of allSubcategories || []) {
      if (sc.name) m.set(sc.name.trim().toLowerCase(), sc);
      if (sc.name_ar) m.set(String(sc.name_ar).trim().toLowerCase(), sc);
    }
    return m;
  }, [allSubcategories]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetService, setSheetService] = useState<SheetService | null>(null);
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);

  const lastOpenAtRef = useRef(0);

  const getRating = (serviceId: string) => {
    const row = ratings.get(serviceId);
    if (!row) return null;
    return {
      value: Number(row.averageRating || 0),
      count: Number(row.totalReviews || 0),
    };
  };

  const handleOpenService = (service: any) => {
    const now = Date.now();
    if (now - lastOpenAtRef.current < 250) return;
    lastOpenAtRef.current = now;

    const key = String(service.category || "").trim().toLowerCase();
    const subcat = subcatByName.get(key);
    if (!subcat) return;

    setSheetService({
      titleKey: subcat.name_ar || subcat.name,
      category: String(subcat.name || "").trim(),
      categoryName: subcat.name,
      categoryNameAr: subcat.name_ar || undefined,
    });
    setInitialProviderServiceId(service.id);
    setSheetOpen(true);
  };

  const handleCall = (service: any) => {
    const phone = service?.provider_phone;
    if (!phone) return;
    window.location.href = getTelLink(String(phone));
  };

  const handleWhatsApp = (service: any) => {
    const phone = service?.provider_phone;
    if (!phone) return;
    window.location.href = getWhatsAppLink(String(phone));
  };

  const labels = {
    call: isRTL ? "اتصال" : "Call",
    whatsapp: isRTL ? "واتساب" : "WhatsApp",
    providerFallback: isRTL ? "مزود خدمة" : "Service Provider",
    noPhoto: isRTL ? "لا توجد صورة" : "No Photo",
    ratingFallback: isRTL ? "لا توجد تقييمات" : "No Ratings",
  };

  return (
    <Layout>
      <div className="container py-4 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">
                {isRTL ? "ترند الآن" : "Trending Now"}
              </h1>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`trending-services-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44 mt-2" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : !services || services.length === 0 ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {isRTL ? "لا توجد خدمات ترند حالياً" : "No trending services right now"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const canCall = !!service.provider_phone;
              const canWhatsApp = canCall && (service.allow_whatsapp !== false);
              return (
                <ServiceCardCompact
                  key={service.id}
                  service={service as any}
                  rating={getRating(service.id)}
                  isRTL={isRTL}
                  canCall={canCall}
                  canWhatsApp={canWhatsApp}
                  onOpen={() => handleOpenService(service)}
                  onCall={() => handleCall(service)}
                  onWhatsApp={() => handleWhatsApp(service)}
                  labels={labels}
                />
              );
            })}
          </div>
        )}
      </div>

      {sheetService ? (
        <ServiceDetailSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) {
              setSheetService(null);
              setInitialProviderServiceId(null);
            }
          }}
          city={selectedCityName}
          service={sheetService}
          initialProviderServiceId={initialProviderServiceId}
        />
      ) : null}
    </Layout>
  );
}

