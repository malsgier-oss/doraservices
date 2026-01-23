import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import type { Listing } from "@/hooks/useListings";
import { ListingCard } from "@/components/hub/ListingCard";
import { useLanguage } from "@/contexts/LanguageContext";

type ListingCardGroupProps = {
  listings: Listing[];
  isRTL?: boolean;
  onOpen: (listing: Listing) => void;
};

function ListingItem({
  listing,
  isRTL,
  onOpen,
}: {
  listing: Listing;
  isRTL?: boolean;
  onOpen: () => void;
}) {
  return (
    <ListingCard
      listing={listing}
      isRTL={isRTL}
      onClick={onOpen}
    />
  );
}

export function ListingCardGroup({
  listings,
  isRTL,
  onOpen,
}: ListingCardGroupProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  // Ensure we have exactly 4 listings (pad with null if needed)
  const paddedListings = [...listings];
  while (paddedListings.length < 4) {
    paddedListings.push(null as any);
  }
  const displayListings = paddedListings.slice(0, 4);

  return (
    <div
      className={cn(
        HUB_CARD_BASE,
        "bg-card shrink-0 w-[90vw] max-w-[700px] snap-start overflow-hidden",
        "hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
        "transition-all duration-300 ease-out"
      )}
    >
      <div className="grid grid-cols-2 gap-3 p-4">
        {displayListings.map((listing, index) => {
          if (!listing) {
            return (
              <div
                key={`empty-${index}`}
                className="aspect-[4/3] rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center"
              >
                <div className="text-xs text-muted-foreground/50">{t("لا توجد صورة", "No photo")}</div>
              </div>
            );
          }

          return (
            <ListingItem
              key={listing.id}
              listing={listing}
              isRTL={isRTL}
              onOpen={() => onOpen(listing)}
            />
          );
        })}
      </div>
    </div>
  );
}
