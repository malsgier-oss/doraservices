import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShoppingBag, PlusCircle } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const SEARCH_DEBOUNCE_MS = 300;

type SortOption = "newest" | "price-low" | "price-high";

function parseNum(s: string | null): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function ListingsBrowse() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const category = params.get("category");
  const q = params.get("q")?.trim() || "";
  const sort = (params.get("sort") as SortOption) || "newest";
  const minPrice = parseNum(params.get("minPrice"));
  const maxPrice = parseNum(params.get("maxPrice"));
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

  const { data: listings = [], isLoading, isError, refetch } = useListings({
    cityId,
    category: category || null,
    search: q || null,
    limit: 100,
  });

  const filteredAndSorted = useMemo(() => {
    let result = [...listings];
    if (minPrice != null) result = result.filter((l) => l.price != null && l.price >= minPrice);
    if (maxPrice != null) result = result.filter((l) => l.price != null && l.price <= maxPrice);
    if (sort === "price-low") result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sort === "price-high") result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [listings, sort, minPrice, maxPrice]);

  const setSort = (value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "newest") next.set("sort", value);
    else next.delete("sort");
    setParams(next, { replace: true });
  };
  const setPriceRange = (min: number | null, max: number | null) => {
    const next = new URLSearchParams(params);
    if (min != null && min > 0) next.set("minPrice", String(min));
    else next.delete("minPrice");
    if (max != null && max > 0) next.set("maxPrice", String(max));
    else next.delete("maxPrice");
    setParams(next, { replace: true });
  };

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

        {/* Search + Sort + Price range */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("بحث في الإعلانات...", "Search listings...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs h-9"
          />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder={t("ترتيب", "Sort")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("الأحدث", "Newest")}</SelectItem>
              <SelectItem value="price-low">{t("السعر: منخفض-عالي", "Price: Low to high")}</SelectItem>
              <SelectItem value="price-high">{t("السعر: عالي-منخفض", "Price: High to low")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder={t("الحد الأدنى", "Min")}
              value={minPrice ?? ""}
              onChange={(e) => setPriceRange(parseNum(e.target.value), maxPrice)}
              className="w-20 h-9 text-sm"
              min={0}
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number"
              placeholder={t("الحد الأقصى", "Max")}
              value={maxPrice ?? ""}
              onChange={(e) => setPriceRange(minPrice, parseNum(e.target.value))}
              className="w-20 h-9 text-sm"
              min={0}
            />
          </div>
        </div>

        {buySellLoading ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("جاري التحميل...", "Loading...")}
          </div>
        ) : isError ? (
          <div className={`${HUB_CARD_BASE} bg-card p-8 flex flex-col items-center justify-center gap-4 text-center`}>
            <p className="text-sm font-medium text-foreground">{t("حدث خطأ ما", "Something went wrong")}</p>
            <p className="text-xs text-muted-foreground">{t("تعذر تحميل الإعلانات", "Could not load listings")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("إعادة المحاولة", "Retry")}
            </Button>
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
        ) : filteredAndSorted.length === 0 ? (
          <div className={`${HUB_CARD_BASE} bg-card p-8 flex flex-col items-center justify-center gap-4 text-center`}>
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t("لا توجد إعلانات", "No listings found")}</p>
              <p className="text-xs text-muted-foreground">{t("جرّب بحثاً أو تصنيفاً آخراً أو انشر إعلانك", "Try a different search or category, or post your own listing")}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/listings")} className="gap-1.5">
                {t("استكشف الكل", "Browse all")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/create-listing")} className="gap-1.5">
                <PlusCircle className="h-4 w-4" />
                {t("نشر إعلان", "Post a listing")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSorted.map((listing) => (
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

