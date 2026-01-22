import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessCard } from "@/components/hub/BusinessCard";
import { BusinessDetailSheet } from "@/components/hub/BusinessDetailSheet";
import { DealDetailSheet } from "@/components/hub/DealDetailSheet";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import type { Business as BusinessDetail } from "@/hooks/useBusiness";
import type { Deal } from "@/hooks/useDeals";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function BusinessesBrowse() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const category = params.get("category");
  const q = params.get("q")?.trim() || "";
  const cityId = getStoredCityId();

  const { data: businesses, isLoading } = useBusinesses({
    cityId,
    category: category || null,
    limit: 100,
  });

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDetail | null>(null);
  const [businessSheetOpen, setBusinessSheetOpen] = useState(false);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealSheetOpen, setDealSheetOpen] = useState(false);

  const filtered = (businesses || []).filter((b) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    const hay = `${b.name} ${b.description || ""} ${b.location || ""}`.toLowerCase();
    return hay.includes(lower);
  });

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
              <Store className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">
                {t("دليل المتاجر", "Business Directory")}
              </h1>
            </div>
          </div>
          {category ? (
            <div className="text-xs text-muted-foreground">
              {t("التصنيف:", "Category:")} <span className="text-foreground">{category}</span>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={`business-browse-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("لا توجد نتائج", "No results found")}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                isRTL={isRTL}
                onClick={() => {
                  setSelectedBusiness(business);
                  setBusinessSheetOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <BusinessDetailSheet
        open={businessSheetOpen}
        business={selectedBusiness}
        onOpenChange={(open) => {
          setBusinessSheetOpen(open);
          if (!open) setSelectedBusiness(null);
        }}
        onDealClick={(deal) => {
          setSelectedDeal(deal);
          setDealSheetOpen(true);
        }}
      />

      <DealDetailSheet
        open={dealSheetOpen}
        deal={selectedDeal}
        onOpenChange={(open) => {
          setDealSheetOpen(open);
          if (!open) setSelectedDeal(null);
        }}
      />
    </Layout>
  );
}

