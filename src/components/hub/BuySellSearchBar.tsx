import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { BUY_SELL_CATEGORIES } from "@/components/hub/buySellCategories";

interface BuySellSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onCategoryFilter?: (categoryId: string | null) => void;
  selectedCategory?: string | null;
}

export function BuySellSearchBar({
  value,
  onChange,
  className,
  onCategoryFilter,
  selectedCategory,
}: BuySellSearchBarProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [showQuickFilters, setShowQuickFilters] = useState(false);

  const selectedCategoryLabel = selectedCategory
    ? BUY_SELL_CATEGORIES.find(cat => cat.id === selectedCategory)
      ? (language === "ar" 
          ? BUY_SELL_CATEGORIES.find(cat => cat.id === selectedCategory)?.nameAr 
          : BUY_SELL_CATEGORIES.find(cat => cat.id === selectedCategory)?.name)
      : null
    : null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none",
          isRTL ? "right-3" : "left-3"
        )} />
        <input
          type="text"
          placeholder={t("ابحث في البيع والشراء...", "Search buy & sell...")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm",
            isRTL ? "pr-10 pl-4" : "pl-10 pr-4",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent",
            "transition-all duration-200"
          )}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors",
              isRTL ? "left-3" : "right-3"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Quick Filters Toggle */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQuickFilters(!showQuickFilters)}
          className="w-full justify-between text-xs"
        >
          <span>{t("الفلاتر السريعة", "Quick Filters")}</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            showQuickFilters && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Inline Quick Filters */}
      {showQuickFilters && (
        <div className="space-y-2 pt-2 pb-3 border-t border-border/30">
          <div className="text-xs font-semibold text-muted-foreground">
            {t("التصنيفات", "Categories")}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryFilter?.(null)}
              className="text-xs"
            >
              {t("الكل", "All")}
            </Button>
            {BUY_SELL_CATEGORIES.slice(0, 5).map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryFilter?.(cat.id)}
                className="text-xs"
              >
                {language === "ar" ? cat.nameAr : cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Indicator */}
      {selectedCategory && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-xs font-medium text-primary">
            {t("تصفية:", "Filtered:")} {selectedCategoryLabel}
          </span>
          <button
            onClick={() => onCategoryFilter?.(null)}
            className="ml-auto text-primary hover:text-primary/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
