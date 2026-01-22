import { Store } from "lucide-react";
import { BusinessCard } from "./BusinessCard";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessDirectoryProps {
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  limit?: number;
  onBusinessClick?: (business: Business) => void;
}

export function BusinessDirectory({
  cityId,
  category,
  search,
  limit = 12,
  onBusinessClick,
}: BusinessDirectoryProps) {
  const { data: businesses, isLoading } = useBusinesses({ cityId, category, limit });
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const q = (search || "").trim().toLowerCase();
  const filtered = q
    ? (businesses || []).filter((b) => {
        const hay = `${b.name} ${b.description || ""} ${b.location || ""}`.toLowerCase();
        return hay.includes(q);
      })
    : (businesses || []);

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

  if (filtered.length === 0) {
    if (import.meta.env.DEV) {
      console.log("[BusinessDirectory] No businesses found", { cityId, category, limit });
    }
    return (
      <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
        {t("لا توجد متاجر متاحة", "No businesses available")}
      </div>
    );
  }

  if (import.meta.env.DEV) {
    console.log("[BusinessDirectory] Rendering businesses", { count: businesses.length, businesses });
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {filtered.map((business) => (
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
