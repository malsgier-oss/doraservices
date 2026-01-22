import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles, Tag, TrendingUp } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DealCard } from "@/components/hub/DealCard";
import { DealDetailSheet } from "@/components/hub/DealDetailSheet";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeals, type Deal } from "@/hooks/useDeals";

const CITY_STORAGE_KEY = "dora_city_id";

type DealsBrowseType = "featured" | "trending" | "new";

function isDealsBrowseType(x: string | undefined): x is DealsBrowseType {
  return x === "featured" || x === "trending" || x === "new";
}

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function DealsBrowse() {
  const navigate = useNavigate();
  const { type } = useParams();
  const [params] = useSearchParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const browseType: DealsBrowseType = isDealsBrowseType(type) ? type : "featured";
  const category = params.get("category");
  const q = params.get("q")?.trim() || "";
  const cityId = getStoredCityId();

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: deals, isLoading } = useDeals({
    cityId,
    category: category || null,
    featured: browseType === "featured" ? true : undefined,
    limit: browseType === "featured" ? 100 : 200,
  });

  const title = useMemo(() => {
    const ar = language === "ar";
    if (browseType === "featured") return ar ? "عروض مميزة" : "Featured Deals";
    if (browseType === "trending") return ar ? "عروض ترند" : "Trending Deals";
    return ar ? "عروض جديدة" : "New Listings";
  }, [browseType, language]);

  const Icon = useMemo(() => {
    if (browseType === "featured") return Sparkles;
    if (browseType === "trending") return TrendingUp;
    return Tag;
  }, [browseType]);

  const filteredDeals = useMemo(() => {
    let list = deals ? [...deals] : [];

    if (q) {
      const lower = q.toLowerCase();
      list = list.filter((d) => {
        const hay = `${d.title} ${d.description || ""}`.toLowerCase();
        return hay.includes(lower);
      });
    }

    if (browseType === "trending") {
      list.sort((a, b) => {
        const aScore = (a.views_count || 0) + (a.clicks_count || 0);
        const bScore = (b.views_count || 0) + (b.clicks_count || 0);
        return bScore - aScore;
      });
    } else if (browseType === "new") {
      list = list
        .filter((deal) => {
          const createdDate = new Date(deal.created_at);
          const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceCreated <= 7;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [browseType, deals, q]);

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
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">{title}</h1>
            </div>
          </div>
          {category ? (
            <div className="text-xs text-muted-foreground">
              {t("التصنيف:", "Category:")} <span className="text-foreground">{category}</span>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`deal-browse-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("لا توجد نتائج", "No results found")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isRTL={isRTL}
                onClick={() => {
                  setSelectedDeal(deal);
                  setSheetOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <DealDetailSheet
        open={sheetOpen}
        deal={selectedDeal}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedDeal(null);
        }}
      />
    </Layout>
  );
}

