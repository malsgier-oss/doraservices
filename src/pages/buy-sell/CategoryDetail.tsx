import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings } from "@/hooks/useListings";
import { BUY_SELL_CATEGORIES } from "@/components/hub/buySellCategories";
import { ListingCardShowcase } from "@/components/buy-sell/ListingCardShowcase";
import { ListingDetailSheet } from "@/components/hub/ListingDetailSheet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Listing } from "@/hooks/useListings";

interface FilterState {
  sortBy: "newest" | "price-low" | "price-high" | "popular";
  priceRange: [number, number];
  condition?: string;
}

export default function CategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Find category
  const category = useMemo(() => {
    return BUY_SELL_CATEGORIES.find((c) => c.id === categoryId);
  }, [categoryId]);

  // Fetch listings for this category
  const { data: listings, isLoading } = useListings({
    category: categoryId,
    limit: 100,
  });

  const [filters, setFilters] = useState<FilterState>({
    sortBy: "newest",
    priceRange: [0, 100000],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = listings || [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title?.toLowerCase().includes(query) ||
          l.description?.toLowerCase().includes(query),
      );
    }

    // Price range filter
    result = result.filter((l) => {
      if (!l.price) return true;
      return l.price >= filters.priceRange[0] && l.price <= filters.priceRange[1];
    });

    // Sort
    switch (filters.sortBy) {
      case "price-low":
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );
        break;
    }

    return result;
  }, [listings, searchQuery, filters]);

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">{t("فئة غير موجودة", "Category not found")}</h2>
          <Button onClick={() => navigate("/buy-sell")} variant="outline">
            {t("العودة للصفحة الرئيسية", "Back to Home")}
          </Button>
        </div>
      </div>
    );
  }

  const Icon = category.icon;

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="px-4 py-4 max-w-7xl mx-auto">
          {/* Back Button + Title */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate("/buy-sell")}
            >
              {isRTL ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: category.color + "1f" }}
              >
                <Icon className="h-6 w-6" style={{ color: category.color }} />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  {language === "ar" ? category.nameAr : category.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {filteredListings.length}{" "}
                  {t("إعلان", "listings")}
                </p>
              </div>
            </div>
          </div>

          {/* Search + Filter Row */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                isRTL ? "right-3" : "left-3"
              )} />
              <input
                type="text"
                placeholder={t("ابحث عن إعلان...", "Search listings...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
                  isRTL ? "pr-10 pl-3" : "pl-10 pr-3",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                )}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10"
            >
              <Sliders className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div>
                <label className="text-sm font-medium">{t("الترتيب", "Sort By")}</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    { value: "newest" as const, label: t("الأحدث", "Newest") },
                    { value: "price-low" as const, label: t("السعر: الأقل أولاً", "Price: Low to High") },
                    { value: "price-high" as const, label: t("السعر: الأعلى أولاً", "Price: High to Low") },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, sortBy: option.value }))
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        filters.sortBy === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:border-primary/50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t("نطاق السعر", "Price Range")}</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    value={filters.priceRange[0]}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: [Number(e.target.value), prev.priceRange[1]],
                      }))
                    }
                    placeholder={t("الحد الأدنى", "Min")}
                    className="flex-1 rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.priceRange[1]}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: [prev.priceRange[0], Number(e.target.value)],
                      }))
                    }
                    placeholder={t("الحد الأقصى", "Max")}
                    className="flex-1 rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("جاري التحميل...", "Loading...")}</p>
            </div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">{t("لا توجد إعلانات", "No listings found")}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? t("حاول تغيير البحث", "Try adjusting your search")
                  : t("لا توجد إعلانات في هذه الفئة", "No listings in this category")}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  {t("مسح البحث", "Clear search")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <ListingCardShowcase
                key={listing.id}
                listing={listing}
                onClick={() => {
                  setSelectedListing(listing);
                  setDetailSheetOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <ListingDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        listing={selectedListing}
      />
    </div>
  );
}
