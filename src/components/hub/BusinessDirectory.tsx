import { Store } from "lucide-react";
import { BusinessCard } from "./BusinessCard";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessDirectoryProps {
  cityId?: string | null;
  category?: string | null;
  limit?: number;
  onBusinessClick?: (business: Business) => void;
}

export function BusinessDirectory({
  cityId,
  category,
  limit = 12,
  onBusinessClick,
}: BusinessDirectoryProps) {
  const { data: businesses, isLoading } = useBusinesses({ cityId, category, limit });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  if (isLoading) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`business-dir-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
        {t("لا توجد متاجر متاحة", "No businesses available")}
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {businesses.map((business) => (
        <BusinessCard
          key={business.id}
          business={business}
          onClick={() => onBusinessClick?.(business)}
          isRTL={isRTL}
        />
      ))}
    </div>
  );
}
