import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Copy,
  Share2,
  Clock,
  Tag,
  MapPin,
  Check,
  X,
  Store,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Deal } from "@/hooks/useDeals";

interface DealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
}

export function DealDetailSheet({
  open,
  onOpenChange,
  deal,
}: DealDetailSheetProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { data: business } = useBusiness(deal?.business_id || null);
  const [copied, setCopied] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Track view when sheet opens
  useEffect(() => {
    if (open && deal?.id) {
      // Debounce view tracking to prevent multiple increments
      const timer = setTimeout(async () => {
        try {
          await supabase.rpc("increment_deal_views", { deal_id: deal.id }).catch(() => {
            // Fallback to direct update if RPC doesn't exist
            supabase
              .from("deals")
              .update({ views_count: (deal.views_count || 0) + 1 })
              .eq("id", deal.id)
              .then(() => {});
          });
        } catch {
          // Best-effort tracking only
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [open, deal?.id]);

  const discountText = useMemo(() => {
    if (!deal) return "";
    if (deal.discount_type === "percentage") {
      return `${deal.discount}% ${t("خصم", "OFF")}`;
    }
    if (deal.discount_type === "fixed") {
      return `${deal.discount} ${t("د.ل", "LYD")} ${t("خصم", "OFF")}`;
    }
    if (deal.discount_type === "free_item") {
      return t("عنصر مجاني", "Free Item");
    }
    return deal.discount || "";
  }, [deal, language]);

  const daysRemaining = useMemo(() => {
    if (!deal?.expires_at) return null;
    const days = Math.ceil(
      (new Date(deal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days : null;
  }, [deal?.expires_at]);

  const expiryColor = useMemo(() => {
    if (!daysRemaining) return "text-destructive";
    if (daysRemaining <= 3) return "text-destructive";
    if (daysRemaining <= 7) return "text-orange-500";
    return "text-muted-foreground";
  }, [daysRemaining]);

  const handleCopyPromo = async () => {
    if (!deal?.promo_code) return;

    try {
      await navigator.clipboard.writeText(deal.promo_code);
      setCopiedPromo(true);
      toast.success(t("تم نسخ الرمز", "Promo code copied!"));
      setTimeout(() => setCopiedPromo(false), 2000);
    } catch {
      toast.error(t("فشل النسخ", "Failed to copy"));
    }
  };

  const handleShare = async () => {
    if (!deal) return;

    const url = `${window.location.origin}/?deal=${deal.id}`;
    const title = deal.title;
    const text = deal.description || title;

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
    if (!deal) return;

    const url = `${window.location.origin}/?deal=${deal.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("تم نسخ الرابط", "Link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("فشل النسخ", "Failed to copy"));
    }
  };

  if (!deal) return null;

  const hasLongDescription = (deal.description || "").length > 200;
  const description = deal.description || "";
  const displayDescription = descExpanded || !hasLongDescription 
    ? description 
    : description.slice(0, 200) + "...";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="sr-only">
              {t("تفاصيل العرض", "Deal Details")}
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
          {deal.image_url && (
            <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden -mx-4 -mt-4 mb-4">
              <img
                src={deal.image_url}
                alt={deal.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {deal.featured && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  {isRTL ? "مميز" : "FEATURED"}
                </div>
              )}
            </div>
          )}

          <div className="px-4 space-y-6">
            {/* Discount Badge & Expiry */}
            <div className="flex items-start justify-between gap-4">
              <div className="bg-red-500 text-white text-xl font-bold px-4 py-2 rounded-lg">
                {discountText}
              </div>
              {daysRemaining !== null && (
                <div className={cn("flex items-center gap-1.5 text-sm font-medium", expiryColor)}>
                  <Clock className="h-4 w-4" />
                  <span>
                    {daysRemaining === 1
                      ? t("يوم واحد متبقي", "1 day left")
                      : daysRemaining <= 7
                        ? t(`${daysRemaining} أيام متبقية`, `${daysRemaining} days left`)
                        : t(`${daysRemaining} يوم متبقي`, `${daysRemaining} days left`)}
                  </span>
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {deal.title}
            </h1>

            {/* Description */}
            {description && (
              <div className="space-y-2">
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

            {/* Promo Code Section */}
            {deal.promo_code && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4 text-primary" />
                  <span>{t("رمز الخصم", "Promo Code")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3 font-mono text-lg font-bold text-primary">
                    {deal.promo_code}
                  </div>
                  <Button
                    size="lg"
                    onClick={handleCopyPromo}
                    className={cn(
                      "h-12 px-4",
                      copiedPromo && "bg-green-500 hover:bg-green-600"
                    )}
                  >
                    {copiedPromo ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {deal.terms_conditions && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t("الشروط والأحكام", "Terms & Conditions")}
                </h3>
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {deal.terms_conditions}
                </p>
              </div>
            )}

            {/* Business Information */}
            {business && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Store className="h-4 w-4" />
                  <span>{t("المتجر", "Business")}</span>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">{business.name}</h4>
                  {business.category && (
                    <div className="text-xs text-primary">{business.category}</div>
                  )}
                  {business.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{business.location}</span>
                    </div>
                  )}
                  {business.rating !== undefined && business.rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium">
                        {business.rating.toFixed(1)}
                      </span>
                      {business.rating_count !== undefined && business.rating_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({business.rating_count})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                {copied ? t("تم النسخ!", "Copied!") : t("مشاركة", "Share")}
              </Button>
              {deal.promo_code && (
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleCopyPromo}
                >
                  {copiedPromo ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("تم النسخ!", "Copied!")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t("نسخ الرمز", "Copy Code")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
