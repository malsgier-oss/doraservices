import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE } from "./hubStyles";
import { ShoppingBag, Smartphone, Car, Home, Shirt, Gamepad2, Book, Dumbbell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: LucideIcon;
  color: string;
}

const BUY_SELL_CATEGORIES: Category[] = [
  { id: "electronics", name: "Electronics", nameAr: "إلكترونيات", icon: Smartphone, color: "#3b82f6" },
  { id: "vehicles", name: "Vehicles", nameAr: "مركبات", icon: Car, color: "#ef4444" },
  { id: "home", name: "Home & Garden", nameAr: "المنزل والحديقة", icon: Home, color: "#22c55e" },
  { id: "fashion", name: "Fashion", nameAr: "أزياء", icon: Shirt, color: "#a855f7" },
  { id: "sports", name: "Sports", nameAr: "رياضة", icon: Dumbbell, color: "#f59e0b" },
  { id: "games", name: "Games", nameAr: "ألعاب", icon: Gamepad2, color: "#ec4899" },
  { id: "books", name: "Books", nameAr: "كتب", icon: Book, color: "#06b6d4" },
  { id: "other", name: "Other", nameAr: "أخرى", icon: ShoppingBag, color: "#64748b" },
];

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
