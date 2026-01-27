import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Share2, MapPin, Tag, X, Phone, MessageCircle, PencilLine, Archive, Trash2, CheckCircle2, Star, Shield, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Listing } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfileByUserId } from "@/hooks/usePublicProfileByUserId";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { useListings } from "@/hooks/useListings";
import { useListingReviews } from "@/hooks/useListingReviews";
import { ListingCard } from "@/components/hub/ListingCard";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ListingDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing | null;
  listingId?: string;      // For loading state when listing not yet fetched
  categorySlug?: string;   // For route-based URL construction
  onSelectListing?: (listing: Listing) => void;
}

export function ListingDetailSheet({ open, onOpenChange, listing, listingId, categorySlug, onSelectListing }: ListingDetailSheetProps) {
  // #region agent log
  console.log('[DEBUG] ListingDetailSheet MOUNTED (DRAWER):', {open, listingId, categorySlug});
  fetch('http://127.0.0.1:7242/ingest/9400dad2-6936-4b7c-930c-5ff551ab6c67',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListingDetailSheet.tsx:40',message:'ListingDetailSheet MOUNTED (DRAWER)',data:{open,listingId,categorySlug},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
  // #endregion

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [copied, setCopied] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user } = useAuth();

  // Check if listing is favorited
  useEffect(() => {
    if (!user || !listing) {
      setIsFavorite(false);
      return;
    }
    let alive = true;
    const checkFavorite = async () => {
      try {
        const { data } = await supabase
          .from("saved_listings")
          .select("id")
          .eq("user_id", user.id)
          .eq("listing_id", listing.id)
          .maybeSingle();
        if (alive) setIsFavorite(!!data);
      } catch {
        if (alive) setIsFavorite(false);
      }
    };
    checkFavorite();
    return () => { alive = false; };
  }, [user, listing?.id]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.info(t("سجل دخولك لحفظ المفضلة", "Sign in to save favorites"));
      return;
    }
    if (!listing) return;

    const wasF = isFavorite;
    setIsFavorite(!wasF);

    try {
      if (wasF) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listing.id });
        if (error) throw error;
      }
    } catch {
      setIsFavorite(wasF);
      toast.error(t("تعذر تحديث المفضلة", "Failed to update favorites"));
    }
  };

  const images = (listing?.image_urls || []).filter(Boolean);
  const cover = images[0] || null;
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: seller } = usePublicProfileByUserId(listing?.user_id || null, open && !!listing);

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

  const { rating, userReview, loading: reviewsLoading, submitReview, refreshReviews } = useListingReviews(
    listing?.id ?? null,
    open && !!listing
  );

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

  // Build shareable URL - use route-based URL when categorySlug is available
  const getShareUrl = () => {
    if (!listing) return "";
    if (categorySlug) {
      return `${window.location.origin}/buy-sell/category/${categorySlug}/listing/${listing.id}`;
    }
    // Fallback to current URL (works when opened via route)
    return window.location.href;
  };

  const handleShare = async () => {
    if (!listing) return;
    const url = getShareUrl();
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
    const url = getShareUrl();
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

  const contactPhone = listing.contact_phone ?? seller?.phone ?? null;
  const canContact = !!contactPhone;
  const telLink = contactPhone ? getTelLink(String(contactPhone)) : null;
  const waLink = contactPhone ? getWhatsAppLink(String(contactPhone)) : null;
  const allowWhatsApp = listing.allow_whatsapp !== false;
  const canWhatsApp = !!waLink && waLink !== "https://wa.me/" && allowWhatsApp;
  const isOwner = !!user && listing.user_id === user.id;

  const youMayAlsoLike = (maybeLike || []).slice(0, 8);
  const more = (moreListings || []).filter((x) => !(new Set(youMayAlsoLike.map((y) => y.id)).has(x.id))).slice(0, 8);

  // Get seller initials for avatar fallback
  const sellerName = seller?.full_name || t("بائع", "Seller");
  const sellerInitials = sellerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" dir={isRTL ? "rtl" : "ltr"}>
          {cover ? (
            <div className="relative -mx-4 -mt-4 mb-6">
              <div
                ref={carouselRef}
                className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth"
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

              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                {t("للبيع", "FOR SALE")}
              </div>
              {images.length > 1 ? (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {activeIndex + 1}/{images.length}
                </div>
              ) : null}

              {images.length > 1 ? (
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                  {images.map((_, i) => (
                    <div
                      key={`dot-${i}`}
                      className={cn(
                        "h-2 rounded-full transition-all bg-white/70",
                        i === activeIndex ? "w-6" : "w-2",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="px-4 space-y-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
            {/* 1. Share + Copy buttons row (matching Service Detail Sheet) */}
            <div className="flex gap-3">
              <Button size="lg" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                {t("مشاركة", "Share")}
              </Button>
              <Button size="lg" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
                {copied ? t("تم النسخ!", "Copied!") : t("نسخ الرابط", "Copy Link")}
              </Button>
            </div>

            {/* 2. Price */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("السعر", "Price")}</p>
              <div className="text-3xl font-bold text-foreground">{priceText}</div>
            </div>

            {/* 3. Title */}
            <h1 className="text-2xl font-bold text-foreground leading-tight">{listing.title}</h1>

            {/* Owner management */}
            {isOwner ? (
              <div className="bg-primary/5 rounded-2xl p-4 space-y-3 border border-primary/10">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold">{t("إدارة الإعلان", "Manage Listing")}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/buy-sell/edit-listing/${listing.id}`)}
                  >
                    <PencilLine className="h-4 w-4 mr-1" />
                    {t("تعديل", "Edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ok = window.confirm(t("تأكيد: تم البيع؟", "Mark as sold?"));
                      if (!ok) return;
                      const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);
                      if (error) toast.error(t("فشل التحديث", "Failed to update"));
                      else {
                        toast.success(t("تم وضعه كمباع", "Marked as sold"));
                        await queryClient.invalidateQueries({ queryKey: ["listings"] });
                        await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {t("مباع", "Sold")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const nextStatus = listing.status === "archived" ? "active" : "archived";
                      const ok = window.confirm(
                        nextStatus === "archived" ? t("تأكيد: أرشفة الإعلان؟", "Archive this listing?") : t("تأكيد: إلغاء الأرشفة؟", "Unarchive this listing?"),
                      );
                      if (!ok) return;
                      const updateData = nextStatus === "archived" 
                        ? { status: nextStatus, archived_at: new Date().toISOString() }
                        : { status: nextStatus, archived_at: null };
                      const { error } = await supabase.from("listings").update(updateData).eq("id", listing.id);
                      if (error) toast.error(t("فشل التحديث", "Failed to update"));
                      else {
                        toast.success(nextStatus === "archived" ? t("تمت الأرشفة", "Archived") : t("تم إلغاء الأرشفة", "Unarchived"));
                        await queryClient.invalidateQueries({ queryKey: ["listings"] });
                        await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
                      }
                    }}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    {listing.status === "archived" ? t("إلغاء الأرشفة", "Unarchive") : t("أرشفة", "Archive")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      const ok = window.confirm(t("تأكيد: حذف الإعلان نهائياً؟", "Delete this listing permanently?"));
                      if (!ok) return;
                      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
                      if (error) toast.error(error.message || t("فشل الحذف", "Failed to delete"));
                      else {
                        toast.success(t("تم الحذف", "Deleted"));
                        await queryClient.invalidateQueries({ queryKey: ["listings"] });
                        await queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
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

            {/* 5. Seller Info Card (avatar, name, verified badge only) */}
            <div className="bg-muted/40 rounded-2xl p-5 border border-border/50">
              <div className="text-sm font-semibold text-muted-foreground mb-3">{t("البائع", "Seller")}</div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={seller?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {sellerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{sellerName}</p>
                      <Shield className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {t("موثوق", "Verified")}
                </Badge>
              </div>
            </div>

            {/* 6. Reviews Section (separate card with rating + "Leave a review") */}
            <div className="bg-muted/40 rounded-2xl p-5 border border-border/50 space-y-3">
              <div className="text-sm font-semibold text-muted-foreground">{t("التقييمات", "Reviews")}</div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {!reviewsLoading && rating.totalReviews > 0 ? (
                    <>
                      <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <span>{rating.averageRating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({rating.totalReviews} {t("تقييم", "reviews")})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("لا توجد تقييمات بعد", "No reviews yet")}</span>
                  )}
                </div>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setReviewRating(userReview?.rating ?? 0);
                      setReviewContent(userReview?.content ?? "");
                      setReviewDialogOpen(true);
                    }}
                  >
                    {userReview ? t("تعديل التقييم", "Edit review") : t("كتابة تقييم", "Leave a review")}
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            {listing.description ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{t("الوصف", "Description")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{listing.description}</p>
              </div>
            ) : null}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {listing.category ? (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>{t("الفئة", "Category")}</span>
                  </div>
                  <p className="text-sm font-medium">{listing.category}</p>
                </div>
              ) : null}
              {listing.location || listing.sub_city ? (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{t("الموقع", "Location")}</span>
                  </div>
                  <p className="text-sm font-medium">{listing.sub_city || listing.location || t("غير محدد", "Not specified")}</p>
                </div>
              ) : null}
            </div>

            {/* Posted date */}
            <div className="text-xs text-muted-foreground py-2">
              {t("نُشر في", "Posted on")} {new Date(listing.created_at).toLocaleDateString(language === "ar" ? "ar-LY" : "en-US")}
            </div>

            {/* You may also like */}
            {youMayAlsoLike.length > 0 ? (
              <div className="space-y-3 pt-2">
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
              <div className="space-y-3 pt-2">
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
          </div>
        </div>

        {/* Bottom contact bar - Fixed Premium Action Bar (matching Service Detail Sheet) */}
        <div className="border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2" dir={isRTL ? "rtl" : "ltr"}>
          {canContact ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="lg"
                className="flex-1 gap-2 h-12 rounded-xl font-semibold shadow-lg shadow-primary/20"
                onClick={() => {
                  if (telLink) window.location.href = telLink;
                }}
              >
                <Phone className="h-4 w-4" />
                {t("اتصال", "Call")}
              </Button>
              {allowWhatsApp && (
                <Button
                  type="button"
                  size="lg"
                  className={cn(
                    "flex-1 gap-2 h-12 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800",
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
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={cn(
                  "h-12 w-12 rounded-xl shrink-0",
                  isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
                )}
                onClick={toggleFavorite}
                aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
              >
                <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex-1 text-sm text-muted-foreground text-center py-2">{t("رقم الهاتف غير متوفر حالياً", "Phone number not available")}</div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={cn(
                  "h-12 w-12 rounded-xl shrink-0",
                  isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
                )}
                onClick={toggleFavorite}
                aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
              >
                <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>

      <Dialog open={reviewDialogOpen} onOpenChange={(o) => { setReviewDialogOpen(o); if (!o) { setReviewRating(0); setReviewContent(""); } }}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{userReview ? t("تعديل التقييم", "Edit review") : t("كتابة تقييم", "Leave a review")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("تقييمك", "Your rating")}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={cn("h-8 w-8 transition-colors", reviewRating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-content">{t("تعليق (اختياري)", "Comment (optional)")}</Label>
              <Textarea id="review-content" value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} placeholder={t("اكتب تعليقك...", "Write your review...")} maxLength={500} className="min-h-[80px]" />
              <p className="text-xs text-muted-foreground">{reviewContent.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button
              disabled={reviewRating < 1 || reviewSubmitting}
              onClick={async () => {
                if (reviewRating < 1) return;
                setReviewSubmitting(true);
                const { error } = await submitReview({ rating: reviewRating, content: reviewContent.trim() || undefined });
                setReviewSubmitting(false);
                if (error) {
                  toast.error(t("فشل حفظ التقييم", "Failed to save review"));
                } else {
                  setReviewDialogOpen(false);
                  toast.success(userReview ? t("تم تحديث التقييم", "Review updated") : t("شكراً لتقييمك!", "Thanks for your review!"));
                  refreshReviews();
                }
              }}
            >
              {reviewSubmitting ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
