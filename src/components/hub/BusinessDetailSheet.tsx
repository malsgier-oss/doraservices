import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Share2,
  MapPin,
  Store,
  Star,
  Tag,
  X,
  ChevronRight,
} from "lucide-react";
import { useDeals, type Deal } from "@/hooks/useDeals";
import { useBusinessRating } from "@/hooks/useBusinessReviews";
import { useLanguage } from "@/contexts/LanguageContext";
import { DealCard } from "./DealCard";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";
import type { Business } from "@/hooks/useBusiness";

interface BusinessDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business | null;
  onDealClick?: (deal: Deal) => void;
}

export function BusinessDetailSheet({
  open,
  onOpenChange,
  business,
  onDealClick,
}: BusinessDetailSheetProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { data: deals, isLoading: dealsLoading } = useDeals({
    businessId: business?.id || null,
    limit: 20,
  });

  const { data: rating } = useBusinessRating(business?.id || null);

  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const activeDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      if (deal.status !== "active") return false;
      if (deal.expires_at) {
        return new Date(deal.expires_at) > new Date();
      }
      return true;
    });
  }, [deals]);

  const hasLongDescription = (business?.description || "").length > 200;
  const description = business?.description || "";
  const displayDescription = descExpanded || !hasLongDescription
    ? description
    : description.slice(0, 200) + "...";

  const handleShare = async () => {
    if (!business) return;

    const url = `${window.location.origin}/?business=${business.id}`;
    const title = business.name;
    const text = business.description || title;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch {
        // User cancelled or error, try fallback
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    if (!business) return;

    const url = `${window.location.origin}/?business=${business.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("تم نسخ الرابط", "Link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("فشل النسخ", "Failed to copy"));
    }
  };

  if (!business) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="sr-only">
              {t("تفاصيل المتجر", "Business Details")}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto pb-8" dir={isRTL ? "rtl" : "ltr"}>
          {/* Hero Image */}
          {business.image_url && (
            <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden -mx-4 -mt-4 mb-4">
              <img
                src={business.image_url}
                alt={business.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {business.featured && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  {isRTL ? "مميز" : "FEATURED"}
                </div>
              )}
            </div>
          )}

          <div className="px-4 space-y-6">
            {/* Business Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground leading-tight">
                    {business.name}
                  </h1>
                  {business.category && (
                    <div className="text-sm text-primary mt-1 font-medium">
                      {business.category}
                    </div>
                  )}
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 shrink-0"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  {copied ? t("تم النسخ!", "Copied!") : t("مشاركة", "Share")}
                </Button>
              </div>

              {/* Location */}
              {business.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{business.location}</span>
                </div>
              )}

              {/* Rating */}
              {rating && rating.totalReviews > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">
                      {rating.averageRating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({rating.totalReviews} {t("تقييم", "reviews")})
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t("الوصف", "Description")}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {displayDescription}
                </p>
                {hasLongDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setDescExpanded(!descExpanded)}
                  >
                    {descExpanded
                      ? t("عرض أقل", "Show less")
                      : t("عرض المزيد", "Show more")}
                  </Button>
                )}
              </div>
            )}

            {/* Active Deals Section */}
            {dealsLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  <span>{t("العروض النشطة", "Active Deals")}</span>
                </div>
                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar"
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`deal-loading-${i}`} className={`${HUB_CARD_BASE} bg-card shrink-0 w-[72vw] max-w-[320px] overflow-hidden`}>
                      <Skeleton className="aspect-[4/3] w-full" />
                      <div className="p-4">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeDeals.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Tag className="h-4 w-4" />
                    <span>{t("العروض النشطة", "Active Deals")}</span>
                    <span className="text-xs text-muted-foreground">
                      ({activeDeals.length})
                    </span>
                  </div>
                </div>
                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                >
                  {activeDeals.map((deal) => (
                    <div key={deal.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                      <DealCard
                        deal={deal}
                        onClick={() => {
                          onDealClick?.(deal);
                          onOpenChange(false);
                        }}
                        isRTL={isRTL}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  <span>{t("العروض النشطة", "Active Deals")}</span>
                </div>
                <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
                  {t("لا توجد عروض نشطة حالياً", "No active deals at the moment")}
                </div>
              </div>
            )}

            {/* Business Info Footer */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                <span>{t("متجر معتمد", "Verified Business")}</span>
              </div>
              {business.created_at && (
                <div className="text-xs text-muted-foreground">
                  {t("منذ", "Since")} {new Date(business.created_at).getFullYear()}
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
