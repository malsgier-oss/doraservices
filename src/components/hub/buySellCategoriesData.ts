import type { LucideIcon } from "lucide-react";
import { ShoppingBag, Smartphone, Car, Home, Shirt, Gamepad2, Book, Dumbbell } from "lucide-react";

export interface BuySellCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: LucideIcon;
  color: string;
}

export const BUY_SELL_CATEGORIES: BuySellCategory[] = [
  { id: "electronics", name: "Electronics", nameAr: "إلكترونيات", icon: Smartphone, color: "#3b82f6" },
  { id: "vehicles", name: "Vehicles", nameAr: "مركبات", icon: Car, color: "#ef4444" },
  { id: "home", name: "Home & Garden", nameAr: "المنزل والحديقة", icon: Home, color: "#22c55e" },
  { id: "fashion", name: "Fashion", nameAr: "أزياء", icon: Shirt, color: "#a855f7" },
  { id: "sports", name: "Sports", nameAr: "رياضة", icon: Dumbbell, color: "#f59e0b" },
  { id: "games", name: "Games", nameAr: "ألعاب", icon: Gamepad2, color: "#ec4899" },
  { id: "books", name: "Books", nameAr: "كتب", icon: Book, color: "#06b6d4" },
  { id: "other", name: "Other", nameAr: "أخرى", icon: ShoppingBag, color: "#64748b" },
];

export const getBuySellCategory = (categoryId: string | null | undefined) => {
  if (!categoryId) return null;
  return BUY_SELL_CATEGORIES.find((cat) => cat.id === categoryId) ?? null;
};

export const getBuySellCategoryLabel = (categoryId: string | null | undefined, language: "ar" | "en") => {
  const category = getBuySellCategory(categoryId);
  if (!category) return null;
  return language === "ar" ? category.nameAr : category.name;
};

export interface BuySellSubcategory {
  id: string;
  name: string;
  nameAr: string;
}

export const BUY_SELL_SUBCATEGORIES: Record<string, BuySellSubcategory[]> = {
  electronics: [
    { id: "phones", name: "Phones", nameAr: "هواتف" },
    { id: "laptops", name: "Laptops", nameAr: "لابتوب" },
    { id: "tablets", name: "Tablets", nameAr: "تابلت" },
    { id: "accessories", name: "Accessories", nameAr: "إكسسوارات" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  vehicles: [
    { id: "cars", name: "Cars", nameAr: "سيارات" },
    { id: "motorcycles", name: "Motorcycles", nameAr: "دراجات نارية" },
    { id: "parts", name: "Parts", nameAr: "قطع غيار" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  home: [
    { id: "furniture", name: "Furniture", nameAr: "أثاث" },
    { id: "garden", name: "Garden", nameAr: "حديقة" },
    { id: "kitchen", name: "Kitchen", nameAr: "مطبخ" },
    { id: "decor", name: "Decor", nameAr: "ديكور" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  fashion: [
    { id: "clothing", name: "Clothing", nameAr: "ملابس" },
    { id: "shoes", name: "Shoes", nameAr: "أحذية" },
    { id: "bags", name: "Bags", nameAr: "حقائب" },
    { id: "accessories", name: "Accessories", nameAr: "إكسسوارات" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  sports: [
    { id: "equipment", name: "Equipment", nameAr: "معدات" },
    { id: "outdoor", name: "Outdoor", nameAr: "هواء الطلق" },
    { id: "fitness", name: "Fitness", nameAr: "لياقة" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  games: [
    { id: "consoles", name: "Consoles", nameAr: "كونسول" },
    { id: "video-games", name: "Video Games", nameAr: "ألعاب فيديو" },
    { id: "board-games", name: "Board Games", nameAr: "ألعاب لوحية" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  books: [
    { id: "fiction", name: "Fiction", nameAr: "روايات" },
    { id: "education", name: "Education", nameAr: "تعليمية" },
    { id: "children", name: "Children", nameAr: "أطفال" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
  other: [
    { id: "general", name: "General", nameAr: "عام" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ],
};

export function getBuySellSubcategories(categoryId: string | null | undefined): BuySellSubcategory[] {
  if (!categoryId) return [];
  return BUY_SELL_SUBCATEGORIES[categoryId] ?? [];
}

export function getBuySellSubcategoryLabel(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
  language: "ar" | "en"
): string | null {
  const subcats = getBuySellSubcategories(categoryId);
  const sub = subcats.find((s) => s.id === subcategoryId);
  if (!sub) return null;
  return language === "ar" ? sub.nameAr : sub.name;
}
