import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { BUY_SELL_CATEGORIES } from "@/components/hub/buySellCategories";

export { BUY_SELL_CATEGORIES };

export { BUY_SELL_CATEGORIES };

interface BuySellCategoriesProps {
  onCategoryClick?: (categoryId: string) => void;
}

export function BuySellCategories({ onCategoryClick }: BuySellCategoriesProps) {
  const { isRTL, language } = useLanguage();

  return (
    <div className="grid grid-cols-4 gap-4">
      {BUY_SELL_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const label = language === "ar" ? cat.nameAr : cat.name;

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryClick?.(cat.id)}
            className={`${HUB_CARD_BASE} bg-card min-h-[112px] px-3 py-4 flex flex-col items-center justify-center gap-3 text-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
          >
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: cat.color + "1f" }}
            >
              <Icon className="h-7 w-7" style={{ color: cat.color }} strokeWidth={2.2} />
            </div>
            <div className="text-xs font-medium text-muted-foreground leading-snug line-clamp-2">
              {label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
