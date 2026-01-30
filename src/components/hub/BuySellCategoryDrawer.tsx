import { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { ListingCardGroup } from "@/components/hub/ListingCardGroup";
import { Skeleton } from "@/components/ui/skeleton";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

interface BuySellCategoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  categoryName?: string | null;
  categoryNameAr?: string | null;
  cityId?: string | null;
  onListingClick: (listing: Listing) => void;
}

const BUY_SELL_CATEGORY_NAMES: Record<string, { name: string; nameAr: string }> = {
  electronics: { name: "Electronics", nameAr: "إلكترونيات" },
  vehicles: { name: "Vehicles", nameAr: "مركبات" },
  home: { name: "Home & Garden", nameAr: "المنزل والحديقة" },
  fashion: { name: "Fashion", nameAr: "أزياء" },
  sports: { name: "Sports", nameAr: "رياضة" },
  games: { name: "Games", nameAr: "ألعاب" },
  books: { name: "Books", nameAr: "كتب" },
  other: { name: "Other", nameAr: "أخرى" },
};

// Helper function to chunk array into groups
const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export function BuySellCategoryDrawer({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  categoryNameAr,
  cityId,
  onListingClick,
}: BuySellCategoryDrawerProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Fetch listings for this category
  const { data: listings, isLoading, error } = useListings({
    cityId,
    category: categoryId || undefined,
    limit: 20,
    enabled: open && !!categoryId,
  });

  // Get category display name
  const displayName = useMemo(() => {
    if (categoryNameAr || categoryName) {
      return language === "ar" ? (categoryNameAr || categoryName) : (categoryName || categoryNameAr);
    }
    if (categoryId && BUY_SELL_CATEGORY_NAMES[categoryId]) {
      const names = BUY_SELL_CATEGORY_NAMES[categoryId];
      return language === "ar" ? names.nameAr : names.name;
    }
    return categoryId || t("التصنيف", "Category");
  }, [categoryId, categoryName, categoryNameAr, language]);

  const handleListingClick = (listing: Listing) => {
    onListingClick(listing);
    // Close this drawer when listing detail opens
    onOpenChange(false);
  };

  if (!categoryId) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85dvh] max-h-[85dvh] flex flex-col overflow-hidden mt-0">
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-11 w-11 rounded-full bg-muted flex items-center justify-center">
            <X className="h-5 w-5 text-muted-foreground" />
          </DrawerClose>

          <div className="flex flex-col items-center pt-2">
            <DrawerTitle className="text-xl font-bold text-foreground">{displayName}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("إعلانات في هذا التصنيف", "Listings in this category")}</p>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {isLoading ? (
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y", scrollSnapType: "x mandatory" }}
              >
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={`listing-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[90vw] max-w-[700px] snap-start overflow-hidden`}>
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={`listing-loading-${i}-${j}`} className="rounded-xl overflow-hidden">
                          <Skeleton className="aspect-[4/3] w-full" />
                          <div className="p-2.5">
                            <Skeleton className="h-3 w-16 mb-1" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-muted-foreground">{t("تعذر تحميل الإعلانات. حاول مرة أخرى", "Failed to load listings. Please try again")}</div>
              </div>
            ) : !listings || listings.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="text-muted-foreground">{t("لا توجد إعلانات في هذا التصنيف حالياً", "No listings in this category right now")}</div>
              </div>
            ) : (
              <div
                dir={isRTL ? "rtl" : "ltr"}
                className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y", scrollSnapType: "x mandatory" }}
              >
                {chunkArray(listings, 4).map((chunk, chunkIndex) => (
                  <ListingCardGroup
                    key={`chunk-${chunkIndex}`}
                    listings={chunk}
                    isRTL={isRTL}
                    onOpen={handleListingClick}
                    labels={{
                      noPhoto: t("لا توجد صورة", "No photo"),
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
