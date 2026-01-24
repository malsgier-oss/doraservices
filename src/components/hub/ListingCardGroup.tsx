import { cn } from "@/lib/utils";
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

  if (listings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
        "w-full"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {listings.map((listing) => (
        <ListingItem
          key={listing.id}
          listing={listing}
          isRTL={isRTL}
          onOpen={() => onOpen(listing)}
        />
      ))}
    </div>
  );
}
