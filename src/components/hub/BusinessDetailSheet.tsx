import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { useBusinessRating, useBusinessReviews } from "@/hooks/useBusinessReviews";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { DealCard } from "./DealCard";
import { HUB_CARD_BASE } from "./hubStyles";
import { Skeleton } from "@/components/ui/skeleton";
import type { Business } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";

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
  const { user } = useAuth();

  const { data: deals, isLoading: dealsLoading } = useDeals({
    businessId: business?.id || null,
    limit: 20,
  });

  const { data: rating } = useBusinessRating(business?.id || null);
  const { data: reviews, isLoading: reviewsLoading, refetch: refetchReviews } = useBusinessReviews(business?.id || null);

  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const myExistingReview = user ? (reviews || []).find((r) => r.user_id === user.id) : null;

  const openReviewDialog = () => {
    if (!user) return;
    setReviewStars(myExistingReview?.rating || 5);
    setReviewText(myExistingReview?.content || "");
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!user || !business) return;
    setSubmittingReview(true);
    try {
      const payload = {
        user_id: user.id,
        business_id: business.id,
        rating: Math.max(1, Math.min(5, Number(reviewStars || 5))),
        content: reviewText.trim() ? reviewText.trim() : null,
      };

      const { error } = await supabase.from("reviews").upsert(payload, { onConflict: "user_id,business_id" });
      if (error) throw error;

      toast.success(t("تم حفظ التقييم", "Review saved"));
      setReviewDialogOpen(false);
      await refetchReviews();
    } catch (err) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

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

            {/* Reviews */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Star className="h-4 w-4" />
                  <span>{t("التقييمات", "Reviews")}</span>
                  {rating && rating.totalReviews > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      ({rating.totalReviews})
                    </span>
                  ) : null}
                </div>
                {user ? (
                  <Button type="button" variant="outline" size="sm" className="h-9" onClick={openReviewDialog}>
                    {t("اكتب تقييم", "Write Review")}
                  </Button>
                ) : null}
              </div>

              {reviewsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={`review-skel-${i}`} className={`${HUB_CARD_BASE} bg-card p-4`}>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full mt-2" />
                      <Skeleton className="h-3 w-2/3 mt-2" />
                    </div>
                  ))}
                </div>
              ) : (reviews || []).length === 0 ? (
                <div className={`${HUB_CARD_BASE} bg-card p-4 text-sm text-muted-foreground text-center`}>
                  {t("لا توجد تقييمات بعد", "No reviews yet")}
                </div>
              ) : (
                <div className="space-y-2">
                  {(reviews || []).slice(0, 6).map((r) => {
                    const isMine = user && r.user_id === user.id;
                    return (
                      <div key={r.id} className={`${HUB_CARD_BASE} bg-card p-4 space-y-2`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const filled = idx < (r.rating || 0);
                              return (
                                <Star
                                  key={`${r.id}-star-${idx}`}
                                  className={cn("h-3.5 w-3.5", filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
                                />
                              );
                            })}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {isMine ? t("أنت", "You") : t("مستخدم", "User")} • {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {r.content ? (
                          <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                            {r.content}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className={cn("max-w-md", isRTL ? "rtl" : "ltr")}>
          <DialogHeader>
            <DialogTitle>{t("اكتب تقييم", "Write a review")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{t("التقييم", "Rating")}</div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const filled = value <= reviewStars;
                  return (
                    <button
                      key={`rate-${value}`}
                      type="button"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted"
                      onClick={() => setReviewStars(value)}
                      aria-label={`${value} stars`}
                    >
                      <Star className={cn("h-5 w-5", filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("ملاحظات (اختياري)", "Notes (optional)")}</div>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t("اكتب تجربتك...", "Share your experience...")}
              />
            </div>
          </div>

          <DialogFooter className={isRTL ? "sm:justify-start" : "sm:justify-end"}>
            <Button type="button" variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={submittingReview}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button type="button" onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? t("جارٍ الحفظ...", "Saving...") : t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}

