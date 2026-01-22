import { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Share2, MapPin, Tag, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";

interface ListingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing | null;
}

export function ListingDetailSheet({ open, onOpenChange, listing }: ListingDetailSheetProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [copied, setCopied] = useState(false);

  const cover = listing?.image_urls?.[0] || null;

  const priceText = useMemo(() => {
    if (!listing) return "";
    if (listing.price !== null && listing.price !== undefined) {
      return `${listing.price} ${t("د.ل", listing.currency || "LYD")}`;
    }
    return t("السعر عند التواصل", "Price on request");
  }, [listing, language]);

  const handleShare = async () => {
    if (!listing) return;
    const url = `${window.location.origin}/?listing=${listing.id}`;
    const title = listing.title;
    const text = listing.description || title;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    if (!listing) return;
    const url = `${window.location.origin}/?listing=${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("تم نسخ الرابط", "Link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("فشل النسخ", "Failed to copy"));
    }
  };

  if (!listing) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="sr-only">{t("تفاصيل الإعلان", "Listing Details")}</DrawerTitle>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto pb-8" dir={isRTL ? "rtl" : "ltr"}>
          {cover ? (
            <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden -mx-4 -mt-4 mb-4">
              <img src={cover} alt={listing.title} className="w-full h-full object-cover" loading="eager" />
              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t("للبيع", "FOR SALE")}
              </div>
            </div>
          ) : null}

          <div className="px-4 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="text-2xl font-bold text-foreground">{priceText}</div>
              <Button size="lg" variant="outline" className="gap-2 shrink-0" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {copied ? t("تم النسخ!", "Copied!") : t("مشاركة", "Share")}
              </Button>
            </div>

            <h1 className="text-2xl font-bold text-foreground leading-tight">{listing.title}</h1>

            {listing.description ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("الوصف", "Description")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            ) : null}

            <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/50">
              {listing.category ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{listing.category}</span>
                </div>
              ) : null}
              {listing.location ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{listing.location}</span>
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                {t("نُشر في", "Posted")} {new Date(listing.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button size="lg" variant="outline" className="flex-1 gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {copied ? t("تم النسخ!", "Copied!") : t("مشاركة", "Share")}
              </Button>
              <Button size="lg" className="flex-1 gap-2" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
                {t("نسخ الرابط", "Copy Link")}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

