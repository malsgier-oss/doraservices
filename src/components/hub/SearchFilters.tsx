import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Filter, X, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface FilterState {
  priceRange: [number, number];
  minRating: number;
  sortBy: "relevance" | "rating" | "price_low" | "price_high" | "newest";
}

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onReset: () => void;
  className?: string;
}

const defaultFilters: FilterState = {
  priceRange: [0, 10000],
  minRating: 0,
  sortBy: "relevance",
};

export function SearchFilters({
  filters,
  onFiltersChange,
  onReset,
  className,
}: SearchFiltersProps) {
  const { language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const hasActiveFilters =
    filters.priceRange[0] !== defaultFilters.priceRange[0] ||
    filters.priceRange[1] !== defaultFilters.priceRange[1] ||
    filters.minRating !== defaultFilters.minRating ||
    filters.sortBy !== defaultFilters.sortBy;

  const handlePriceChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [value[0], value[1]] as [number, number],
    });
  };

  const handleRatingChange = (value: number) => {
    onFiltersChange({
      ...filters,
      minRating: value,
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as FilterState["sortBy"],
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="h-9 gap-2"
          >
            <Filter className="h-4 w-4" />
            {t("تصفية", "Filters")}
            {hasActiveFilters && (
              <span className="ml-1 h-5 w-5 rounded-full bg-primary-foreground text-primary text-[10px] flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-80 p-4", isRTL ? "rtl" : "ltr")}
          align={isRTL ? "end" : "start"}
        >
          <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
            {/* Sort By */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t("ترتيب حسب", "Sort By")}
              </Label>
              <RadioGroup
                value={filters.sortBy}
                onValueChange={handleSortChange}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="relevance" id="sort-relevance" />
                  <Label htmlFor="sort-relevance" className="text-sm font-normal cursor-pointer">
                    {t("الأكثر صلة", "Most Relevant")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="rating" id="sort-rating" />
                  <Label htmlFor="sort-rating" className="text-sm font-normal cursor-pointer">
                    {t("الأعلى تقييماً", "Highest Rated")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="price_low" id="sort-price-low" />
                  <Label htmlFor="sort-price-low" className="text-sm font-normal cursor-pointer">
                    {t("السعر: منخفض إلى مرتفع", "Price: Low to High")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="price_high" id="sort-price-high" />
                  <Label htmlFor="sort-price-high" className="text-sm font-normal cursor-pointer">
                    {t("السعر: مرتفع إلى منخفض", "Price: High to Low")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="newest" id="sort-newest" />
                  <Label htmlFor="sort-newest" className="text-sm font-normal cursor-pointer">
                    {t("الأحدث", "Newest")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Min Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t("الحد الأدنى للتقييم", "Minimum Rating")}: {filters.minRating > 0 ? `${filters.minRating}+` : t("الكل", "All")}
              </Label>
              <Slider
                value={[filters.minRating]}
                onValueChange={(v) => handleRatingChange(v[0])}
                min={0}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>5</span>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t("نطاق السعر", "Price Range")}: {filters.priceRange[0]} - {filters.priceRange[1]} {t("دينار", "LYD")}
              </Label>
              <Slider
                value={filters.priceRange}
                onValueChange={handlePriceChange}
                min={0}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 {t("دينار", "LYD")}</span>
                <span>10,000+ {t("دينار", "LYD")}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {t("إعادة تعيين", "Reset")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                {t("تطبيق", "Apply")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick Sort Button */}
      {filters.sortBy !== "relevance" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2"
          onClick={() => handleSortChange("relevance")}
        >
          <ArrowUpDown className="h-4 w-4" />
          {t("إعادة الترتيب", "Reset Sort")}
        </Button>
      )}
    </div>
  );
}
