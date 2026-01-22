import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Share2, MapPin, Tag, X, Phone, MessageCircle, PencilLine, Archive, Trash2, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfileByUserId } from "@/hooks/usePublicProfileByUserId";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { useListings } from "@/hooks/useListings";
import { ListingCard } from "@/components/hub/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ListingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing | null;
  onSelectListing?: (listing: Listing) => void;
}

export function ListingDetailSheet({ open, onOpenChange, listing, onSelectListing }: ListingDetailSheetProps) {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  const images = (listing?.image_urls || []).filter(Boolean);
  const cover = images[0] || null;
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Profiles are SELECTable only for authenticated users (RLS).
  const { data: seller } = usePublicProfileByUserId(listing?.user_id || null, !!user);

  const { data: maybeLike } = useListings({
    cityId: listing?.city_id || null,
    category: listing?.category || null,
    excludeId: listing?.id || null,
    limit: 12,
    enabled: open && !!listing,
  });

  const { data: moreListings } = useListings({
    cityId: listing?.city_id || null,
    excludeId: listing?.id || null,
    limit: 18,
    enabled: open && !!listing,
  });

  useEffect(() => {
    setCopied(false);
    setActiveIndex(0);
    // Reset carousel scroll when listing changes
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
  }, [listing?.id]);

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

  const canContact = !!seller?.phone;
  const telLink = canContact ? getTelLink(String(seller?.phone)) : null;
  const waLink = canContact ? getWhatsAppLink(String(seller?.phone)) : null;
  const canWhatsApp = !!waLink && waLink !== "https://wa.me/";
  const isOwner = !!user && listing.user_id === user.id;

  const youMayAlsoLike = (maybeLike || []).slice(0, 8);
  const more = (moreListings || []).filter((x) => !(new Set(youMayAlsoLike.map((y) => y.id)).has(x.id))).slice(0, 8);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh] flex flex-col">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="sr-only">{t("تفاصيل الإعلان", "Listing Details")}</DrawerTitle>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
          {cover ? (
            <div className="relative -mx-4 -mt-4 mb-4">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory"
                style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                dir={isRTL ? "rtl" : "ltr"}
                onScroll={() => {
                  const el = carouselRef.current;
                  if (!el) return;
                  const w = el.clientWidth || 1;
                  const left = Math.abs(el.scrollLeft);
                  const idx = Math.max(0, Math.min(images.length - 1, Math.round(left / w)));
                  setActiveIndex(idx);
                }}
              >
                {images.map((src, idx) => (
                  <div key={`${listing.id}-img-${idx}`} className="w-full shrink-0 snap-center">
                    <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                      <img src={src} alt={listing.title} className="w-full h-full object-cover" loading={idx === 0 ? "eager" : "lazy"} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t("للبيع", "FOR SALE")}
              </div>
              {images.length > 1 ? (
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {activeIndex + 1}/{images.length}
                </div>
              ) : null}

              {images.length > 1 ? (
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {images.map((_, i) => (
                    <div
                      key={`dot-${i}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all bg-white/70",
                        i === activeIndex ? "w-6" : "w-2",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="px-4 space-y-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-4">
              <div className="text-2xl font-bold text-foreground">{priceText}</div>
              <Button size="lg" variant="outline" className="gap-2 shrink-0" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {copied ? t("تم النسخ!", "Copied!") : t("مشاركة", "Share")}
              </Button>
            </div>

            <h1 className="text-2xl font-bold text-foreground leading-tight">{listing.title}</h1>

            {isOwner ? (
              <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
                <div className="text-sm font-semibold">{t("إدارة الإعلان", "Manage")}</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => navigate(`/buy-sell/edit-listing/${listing.id}`)}
                  >
                    <PencilLine className="h-4 w-4 mr-1" />
                    {t("تعديل", "Edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={async () => {
                      const ok = window.confirm(t("تأكيد: تم البيع؟", "Mark as sold?"));
                      if (!ok) return;
                      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);
                      if (error) toast.error(t("فشل التحديث", "Failed to update"));
                      else toast.success(t("تم وضعه كمباع", "Marked as sold"));
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t("تم البيع", "Sold")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={async () => {
                      const nextStatus = listing.status === "archived" ? "active" : "archived";
                      const ok = window.confirm(
                        nextStatus === "archived" ? t("تأكيد: أرشفة الإعلان؟", "Archive this listing?") : t("تأكيد: إلغاء الأرشفة؟", "Unarchive this listing?"),
                      );
                      if (!ok) return;
                      const { error } = await supabase.from("listings").update({ status: nextStatus }).eq("id", listing.id);
                      if (error) toast.error(t("فشل التحديث", "Failed to update"));
                      else toast.success(nextStatus === "archived" ? t("تمت الأرشفة", "Archived") : t("تم إلغاء الأرشفة", "Unarchived"));
                    }}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    {listing.status === "archived" ? t("إلغاء الأرشفة", "Unarchive") : t("أرشفة", "Archive")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10"
                    onClick={async () => {
                      const ok = window.confirm(t("تأكيد: حذف الإعلان نهائياً؟", "Delete this listing permanently?"));
                      if (!ok) return;
                      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
                      if (error) toast.error(t("فشل الحذف", "Failed to delete"));
                      else {
                        toast.success(t("تم الحذف", "Deleted"));
                        onOpenChange(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("حذف", "Delete")}
                  </Button>
                </div>
              </div>
            ) : null}

            {listing.description ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t("الوصف", "Description")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            ) : null}

            {/* Seller */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-1 border border-border/50">
              <div className="text-sm font-semibold">{t("البائع", "Seller")}</div>
              <div className="text-sm text-muted-foreground">
                {user ? (seller?.full_name || t("مستخدم", "User")) : t("سجّل دخولك لعرض بيانات البائع", "Sign in to view seller info")}
              </div>
            </div>

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

            {/* You may also like */}
            {youMayAlsoLike.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold">{t("قد يعجبك أيضاً", "You may also like")}</div>
                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                >
                  {youMayAlsoLike.map((l) => (
                    <div key={l.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                      <ListingCard
                        listing={l}
                        isRTL={isRTL}
                        onClick={() => {
                          onSelectListing?.(l);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* More listings */}
            {more.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold">{t("إعلانات أخرى", "More listings")}</div>
                <div
                  dir={isRTL ? "rtl" : "ltr"}
                  className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
                >
                  {more.map((l) => (
                    <div key={l.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                      <ListingCard
                        listing={l}
                        isRTL={isRTL}
                        onClick={() => {
                          onSelectListing?.(l);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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

        {/* Bottom contact bar */}
        <div className="border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" dir={isRTL ? "rtl" : "ltr"}>
          {user ? (
            canContact ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="flex-1 gap-2 h-12"
                  onClick={() => {
                    if (telLink) window.location.href = telLink;
                  }}
                >
                  <Phone className="h-4 w-4" />
                  {t("اتصال", "Call")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className={cn(
                    "flex-1 gap-2 h-12 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400",
                    !canWhatsApp && "opacity-50",
                  )}
                  disabled={!canWhatsApp}
                  onClick={() => {
                    if (waLink) window.location.href = waLink;
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("واتساب", "WhatsApp")}
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center">{t("رقم الهاتف غير متوفر حالياً", "Phone number not available")}</div>
            )
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("سجّل دخولك للتواصل مع البائع", "Sign in to contact the seller")}
              </div>
              <Button type="button" variant="outline" onClick={() => (window.location.href = "/auth?tab=login")}>
                {t("تسجيل الدخول", "Sign in")}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

