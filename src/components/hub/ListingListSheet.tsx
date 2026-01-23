import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings, type Listing } from "@/hooks/useListings";
import { ListingCard } from "@/components/hub/ListingCard";

interface ListingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityId?: string | null;
  category?: string | null;
  search?: string | null;
  onSelectListing: (listing: Listing) => void;
}

export function ListingListSheet({
  open,
  onOpenChange,
  cityId,
  category,
  search,
  onSelectListing,
}: ListingListSheetProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { data: listings, isLoading } = useListings({
    cityId,
    category,
    search,
    limit: 50,
    enabled: open,
  });

  const title = category || t("الإعلانات", "Listings");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95dvh] flex flex-col bg-background/95 backdrop-blur-sm" dir={isRTL ? "rtl" : "ltr"}>
        <DrawerHeader className="px-4 py-3 shrink-0 border-b bg-background">
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle className="text-base font-semibold truncate flex-1">
              {title}
            </DrawerTitle>
            {open && !isLoading ? (
              <div className="text-xs text-muted-foreground font-normal">
                {(listings || []).length} {t("نتيجة", "results")}
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto bg-muted/10 px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`listing-skeleton-${idx}`} className="rounded-xl overflow-hidden border border-border/50">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("لا توجد إعلانات حالياً", "No listings right now")}
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isRTL={isRTL}
                  onClick={() => onSelectListing(listing)}
                />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
