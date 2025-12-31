import { useState } from "react";
import { Filter, Star, MapPin, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Libyan cities
export const LIBYAN_CITIES = [
  { id: "tripoli", en: "Tripoli", ar: "طرابلس" },
  { id: "benghazi", en: "Benghazi", ar: "بنغازي" },
  { id: "misrata", en: "Misrata", ar: "مصراتة" },
  { id: "zawiya", en: "Zawiya", ar: "الزاوية" },
  { id: "zliten", en: "Zliten", ar: "زليتن" },
  { id: "bayda", en: "Bayda", ar: "البيضاء" },
  { id: "khoms", en: "Khoms", ar: "الخمس" },
  { id: "derna", en: "Derna", ar: "درنة" },
  { id: "sirte", en: "Sirte", ar: "سرت" },
  { id: "tobruk", en: "Tobruk", ar: "طبرق" },
  { id: "sebha", en: "Sebha", ar: "سبها" },
  { id: "gharyan", en: "Gharyan", ar: "غريان" },
];

export interface SearchFiltersState {
  city: string | null;
  minRating: boolean; // 4+ stars
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const { t, isRTL, language } = useLanguage();
  const [open, setOpen] = useState(false);

  const hasActiveFilters = filters.city || filters.minRating;
  const activeFilterCount = (filters.city ? 1 : 0) + (filters.minRating ? 1 : 0);

  const handleCityChange = (value: string) => {
    onFiltersChange({
      ...filters,
      city: value === "all" ? null : value,
    });
  };

  const handleRatingToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      minRating: checked,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({ city: null, minRating: false });
    setOpen(false);
  };

  const getCityLabel = (cityId: string) => {
    const city = LIBYAN_CITIES.find(c => c.id === cityId);
    return city ? (language === "ar" ? city.ar : city.en) : cityId;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full bg-white border-0 shadow-sm relative",
            hasActiveFilters && "ring-2 ring-primary"
          )}
        >
          <Filter className="h-5 w-5 text-[#333]" />
          {activeFilterCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4" 
        align={isRTL ? "start" : "end"}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {isRTL ? "تصفية النتائج" : "Filter Results"}
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                {isRTL ? "مسح الكل" : "Clear all"}
              </Button>
            )}
          </div>

          {/* City Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              {isRTL ? "المدينة" : "City"}
            </Label>
            <Select
              value={filters.city || "all"}
              onValueChange={handleCityChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isRTL ? "جميع المدن" : "All cities"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isRTL ? "جميع المدن" : "All cities"}
                </SelectItem>
                {LIBYAN_CITIES.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {language === "ar" ? city.ar : city.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center justify-between py-2">
            <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              {isRTL ? "4+ نجوم فقط" : "4+ stars only"}
            </Label>
            <Switch
              checked={filters.minRating}
              onCheckedChange={handleRatingToggle}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Active filter chips component
interface ActiveFilterChipsProps {
  filters: SearchFiltersState;
  onRemoveFilter: (key: keyof SearchFiltersState) => void;
}

export function ActiveFilterChips({ filters, onRemoveFilter }: ActiveFilterChipsProps) {
  const { language, isRTL } = useLanguage();

  const getCityLabel = (cityId: string) => {
    const city = LIBYAN_CITIES.find(c => c.id === cityId);
    return city ? (language === "ar" ? city.ar : city.en) : cityId;
  };

  if (!filters.city && !filters.minRating) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
      {filters.city && (
        <Badge
          variant="secondary"
          className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-secondary/80"
          onClick={() => onRemoveFilter("city")}
        >
          <MapPin className="h-3 w-3" />
          {getCityLabel(filters.city)}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
      {filters.minRating && (
        <Badge
          variant="secondary"
          className="pl-2 pr-1 py-1 gap-1 cursor-pointer hover:bg-secondary/80"
          onClick={() => onRemoveFilter("minRating")}
        >
          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
          {isRTL ? "4+ نجوم" : "4+ stars"}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}
