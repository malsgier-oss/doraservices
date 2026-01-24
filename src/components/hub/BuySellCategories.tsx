import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { BUY_SELL_CATEGORIES } from "@/components/hub/buySellCategories";
import { HubChipCard } from "@/components/hub/HubChipCard";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export { BUY_SELL_CATEGORIES };

// Top categories to show by default
const TOP_CATEGORIES_COUNT = 4;

interface BuySellCategoriesProps {
  onCategoryClick?: (categoryId: string) => void;
  sticky?: boolean;
  compact?: boolean;
}

export function BuySellCategories({ 
  onCategoryClick, 
  sticky = false,
  compact = false 
}: BuySellCategoriesProps) {
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick?.(categoryId);
    navigate(`/buy-sell/category/${categoryId}`);
  };

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Show top categories or all if showAll is true
  const categoriesToShow = showAll 
    ? BUY_SELL_CATEGORIES 
    : BUY_SELL_CATEGORIES.slice(0, TOP_CATEGORIES_COUNT);

  const hasMore = BUY_SELL_CATEGORIES.length > TOP_CATEGORIES_COUNT;

  if (compact) {
    // 6 main cards – same style as Services, non-scrollable grid
    const mainCategories = BUY_SELL_CATEGORIES.slice(0, 6);
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 gap-3",
          sticky && "sticky top-0 bg-background/95 backdrop-blur-sm z-40 -mx-4 px-4 py-2"
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {mainCategories.map((cat) => {
          const label = language === "ar" ? cat.nameAr : cat.name;
          return (
            <HubChipCard
              key={cat.id}
              label={label}
              icon={cat.icon}
              iconColor={cat.color}
              onClick={() => handleCategoryClick(cat.id)}
              isRTL={isRTL}
              fill
            />
          );
        })}
      </div>
    );
  }

  // Grid version for full display
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
        {categoriesToShow.map((cat) => {
          const Icon = cat.icon;
          const label = language === "ar" ? cat.nameAr : cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`${HUB_CARD_BASE} bg-card min-h-[120px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation hover:scale-105`}
            >
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: cat.color + "1f" }}
              >
                <Icon className="h-8 w-8" style={{ color: cat.color }} strokeWidth={2.2} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                  {label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("اضغط للبحث", "Browse")}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Show all button */}
      {hasMore && !showAll && (
        <Button
          variant="outline"
          onClick={() => setShowAll(true)}
          className="w-full"
        >
          {t("عرض جميع التصنيفات", "Show all categories")}
        </Button>
      )}

      {/* Show less button */}
      {showAll && (
        <Button
          variant="outline"
          onClick={() => setShowAll(false)}
          className="w-full"
        >
          {t("إظهار أقل", "Show less")}
        </Button>
      )}
    </div>
  );
}
