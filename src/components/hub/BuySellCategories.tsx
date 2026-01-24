import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { BUY_SELL_CATEGORIES } from "@/components/hub/buySellCategories";
import { useNavigate } from "react-router-dom";

export { BUY_SELL_CATEGORIES };

interface BuySellCategoriesProps {
  onCategoryClick?: (categoryId: string) => void;
}

export function BuySellCategories({ onCategoryClick }: BuySellCategoriesProps) {
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick?.(categoryId);
    navigate(`/buy-sell/category/${categoryId}`);
  };

  return (
    <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
      {BUY_SELL_CATEGORIES.map((cat) => {
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
  );
}

const t = (ar: string, en: string) => ar;
