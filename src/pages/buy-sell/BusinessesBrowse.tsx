import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Store } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessCard } from "@/components/hub/BusinessCard";
import { BusinessDetailSheet } from "@/components/hub/BusinessDetailSheet";
import { DealDetailSheet } from "@/components/hub/DealDetailSheet";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinesses, type Business } from "@/hooks/useBusinesses";
import type { Business as BusinessDetail } from "@/hooks/useBusiness";
import type { Deal } from "@/hooks/useDeals";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";

const CITY_STORAGE_KEY = "dora_city_id";

const SEARCH_DEBOUNCE_MS = 300;

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function BusinessesBrowse() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const category = params.get("category");
  const q = params.get("q")?.trim() || "";
  const cityId = getStoredCityId();

  const [searchInput, setSearchInput] = useState(q);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const p = paramsRef.current;
      const next = new URLSearchParams(p);
      const v = searchInput.trim();
      if (v) next.set("q", v);
      else next.delete("q");
      setParams(next, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

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

        {buySellEnabled ? (
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? "right-3" : "left-3"}`} />
            <Input
              type="search"
              placeholder={t("ابحث عن متجر...", "Search businesses...")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}
            />
          </div>
        ) : null}

        {buySellLoading ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("جاري التحميل...", "Loading...")}
          </div>
        ) : !buySellEnabled ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("ميزة الشراء والبيع غير مفعلة حالياً.", "Buy & Sell is currently disabled.")}
          </div>
        ) : isLoading ? (
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
          <div className={`${HUB_CARD_BASE} bg-card p-8 flex flex-col items-center justify-center gap-3 text-center`}>
            <Store className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t("لا توجد نتائج", "No results found")}</p>
              <p className="text-xs text-muted-foreground">{t("جرّب بحثاً أو تصنيفاً آخراً", "Try a different search or category")}</p>
            </div>
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

      {buySellEnabled ? (
        <>
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
            onViewBusiness={(b) => {
              setDealSheetOpen(false);
              setSelectedDeal(null);
              setSelectedBusiness(b as BusinessDetail);
              setBusinessSheetOpen(true);
            }}
          />
        </>
      ) : null}
    </Layout>
  );
}

