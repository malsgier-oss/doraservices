import { useState } from "react";
import { Filter, X, Star, MapPin, Sparkles, TrendingUp, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { ServiceFilters as FiltersType, SortOption } from "@/hooks/useServiceFilters";
import { cn } from "@/lib/utils";

interface ServiceFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  className?: string;
}

export function ServiceFilters({ filters, onFiltersChange, className }: ServiceFiltersProps) {
  const { language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const { data: cities } = useCities();
  const { data: subCities } = useSubCities(filters.city);
  const { data: categories } = useCategories();
  const { data: subcategories } = useAllSubcategories();

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId];
    updateFilter("categories", newCategories);
  };

  const toggleSubcategory = (subcategoryId: string) => {
    const newSubcategories = filters.subcategories.includes(subcategoryId)
      ? filters.subcategories.filter((id) => id !== subcategoryId)
      : [...filters.subcategories, subcategoryId];
    updateFilter("subcategories", newSubcategories);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      priceRange: [0, 10000],
      categories: [],
      subcategories: [],
      city: null,
      subCity: null,
      minRating: 0,
      verifiedOnly: false,
      featuredOnly: false,
      trendingOnly: false,
      sortBy: "relevance",
    });
    setOpen(false);
  };

  const activeFilterCount =
    (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 10000 ? 1 : 0) +
    filters.categories.length +
    filters.subcategories.length +
    (filters.city ? 1 : 0) +
    (filters.subCity ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.featuredOnly ? 1 : 0) +
    (filters.trendingOnly ? 1 : 0) +
    (filters.sortBy !== "relevance" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sort Dropdown */}
      <Select
        value={filters.sortBy}
        onValueChange={(value) => updateFilter("sortBy", value as SortOption)}
      >
        <SelectTrigger className="h-10 w-[140px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="relevance">{t("الأكثر صلة", "Most Relevant")}</SelectItem>
          <SelectItem value="price_low">{t("السعر: منخفض إلى عالي", "Price: Low to High")}</SelectItem>
          <SelectItem value="price_high">{t("السعر: عالي إلى منخفض", "Price: High to Low")}</SelectItem>
          <SelectItem value="rating">{t("الأعلى تقييماً", "Highest Rated")}</SelectItem>
          <SelectItem value="newest">{t("الأحدث", "Newest")}</SelectItem>
          <SelectItem value="popular">{t("الأكثر شعبية", "Most Popular")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant={filters.verifiedOnly ? "default" : "outline"}
          size="sm"
          className="h-10 text-sm gap-1.5"
          onClick={() => updateFilter("verifiedOnly", !filters.verifiedOnly)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("موثق", "Verified")}
        </Button>

        <Button
          type="button"
          variant={filters.featuredOnly ? "default" : "outline"}
          size="sm"
          className="h-10 text-sm gap-1.5"
          onClick={() => updateFilter("featuredOnly", !filters.featuredOnly)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("مميز", "Featured")}
        </Button>

        <Button
          type="button"
          variant={filters.trendingOnly ? "default" : "outline"}
          size="sm"
          className="h-10 text-sm gap-1.5"
          onClick={() => updateFilter("trendingOnly", !filters.trendingOnly)}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {t("ترند", "Trending")}
        </Button>
      </div>

      {/* Advanced Filters Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 text-sm gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("تصفية", "Filters")}
            {hasActiveFilters && (
              <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align={isRTL ? "end" : "start"}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t("تصفية متقدمة", "Advanced Filters")}</h3>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={clearAllFilters}
                >
                  <X className="h-3 w-3" />
                  {t("مسح الكل", "Clear All")}
                </Button>
              )}
            </div>

            <Separator />

            {/* Price Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("نطاق السعر", "Price Range")}</Label>
              <div className="px-2">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                  min={0}
                  max={10000}
                  step={50}
                  className="w-full"
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{filters.priceRange[0]} SAR</span>
                  <span>{filters.priceRange[1]} SAR</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rating Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4" />
                {t("الحد الأدنى للتقييم", "Minimum Rating")}
              </Label>
              <Select
                value={filters.minRating.toString()}
                onValueChange={(value) => updateFilter("minRating", Number(value))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("أي تقييم", "Any Rating")}</SelectItem>
                  <SelectItem value="3">{t("3 نجوم أو أكثر", "3+ Stars")}</SelectItem>
                  <SelectItem value="4">{t("4 نجوم أو أكثر", "4+ Stars")}</SelectItem>
                  <SelectItem value="4.5">{t("4.5 نجوم أو أكثر", "4.5+ Stars")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Location Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("الموقع", "Location")}
              </Label>
              <Select
                value={filters.city || "all"}
                onValueChange={(value) => {
                  updateFilter("city", value === "all" ? null : value);
                  updateFilter("subCity", null);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("اختر المدينة", "Select City")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("جميع المدن", "All Cities")}</SelectItem>
                  {cities?.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {language === "ar" && city.name_ar ? city.name_ar : city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.city && subCities && subCities.length > 0 && (
                <Select
                  value={filters.subCity || "all"}
                  onValueChange={(value) => updateFilter("subCity", value === "all" ? null : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("اختر المنطقة", "Select Area")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("جميع المناطق", "All Areas")}</SelectItem>
                    {subCities.map((subCity) => (
                      <SelectItem key={subCity.id} value={subCity.id}>
                        {language === "ar" && subCity.name_ar ? subCity.name_ar : subCity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Categories */}
            {categories && categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("الفئات", "Categories")}</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={filters.categories.includes(category.id) ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {language === "ar" && category.name_ar ? category.name_ar : category.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 text-sm gap-1.5"
          onClick={clearAllFilters}
        >
          <X className="h-4 w-4" />
          {t("مسح", "Clear")}
        </Button>
      )}
    </div>
  );
}
