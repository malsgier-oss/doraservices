import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { ListingCard } from "@/components/hub/ListingCard";
import { ListingDetailSheet } from "@/components/hub/ListingDetailSheet";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function ListingsBrowse() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const category = params.get("category");
  const q = params.get("q")?.trim() || "";
  const cityId = getStoredCityId();

  const { data: listings, isLoading } = useListings({
    cityId,
    category: category || null,
    search: q || null,
    limit: 100,
  });

  const [selected, setSelected] = useState<Listing | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Layout>
      <div className="container py-4 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">{t("إعلانات للبيع", "Listings")}</h1>
            </div>
          </div>
          {category ? (
            <div className="text-xs text-muted-foreground">
              {t("التصنيف:", "Category:")} <span className="text-foreground">{category}</span>
            </div>
          ) : null}
        </div>

        {buySellLoading ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("جاري التحميل...", "Loading...")}
          </div>
        ) : !buySellEnabled ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("ميزة الشراء والبيع غير مفعلة حالياً.", "Buy & Sell is currently disabled.")}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`listing-browse-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : !listings || listings.length === 0 ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("لا توجد إعلانات", "No listings found")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isRTL={isRTL}
                onClick={() => {
                  setSelected(listing);
                  setSheetOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {buySellEnabled ? (
        <ListingDetailSheet
          open={sheetOpen}
          listing={selected}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelected(null);
          }}
          onSelectListing={(l) => {
            setSelected(l);
            setSheetOpen(true);
          }}
        />
      ) : null}
    </Layout>
  );
}

