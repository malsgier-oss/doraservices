import { Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StoreListing } from "@/types/store";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: StoreListing;
  onClick: () => void;
  className?: string;
}

export function ListingCard({ listing, onClick, className }: ListingCardProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const firstImage = listing.image_urls?.[0];

  return (
    <Card
      className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative w-full" style={{ aspectRatio: "1" }}>
          {firstImage ? (
            <img
              src={firstImage}
              alt={listing.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
              <span className="text-muted-foreground text-sm">{t("لا توجد صورة", "No image")}</span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
          {listing.price && (
            <p className="text-lg font-bold text-primary">
              {listing.price} {listing.currency}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-muted rounded">{listing.category}</span>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{listing.views_count || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
