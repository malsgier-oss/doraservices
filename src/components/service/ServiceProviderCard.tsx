import React, { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Star, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServiceProviderCardProps {
  id: string;

  providerName: string;
  providerAvatar?: string;

  /** Primary listing title (service name) */
  serviceTitle: string;

  /** City/subcity shown under the title */
  city?: string;
  subCity?: string;

  /** Up to 5 images (free tier). We’ll render the first 5. */
  images?: string[];

  /** Optional rating; only shown when > 0 */
  rating?: number;

  /** Review snippets (written reviews). One line ticker swaps randomly. */
  reviewTexts?: string[];

  /** Optional price (some providers don’t have a fixed price) */
  price?: number;

  /** Provider phone for Call / WhatsApp actions */
  providerPhone?: string;

  /** Optional details action (e.g. open sheet). If omitted, no Details button. */
  onDetails?: () => void;

  /** Backward-compat: legacy booking action, used as Details when onDetails is not provided. */
  onBook?: () => void;
}

function toInitials(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters = parts.map((p) => p[0]).join("");
  return letters.slice(0, 2).toUpperCase();
}

function normalizePhoneForTel(phone?: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  // For tel:, we can keep '+' if present and strip spaces.
  return trimmed.replace(/\s+/g, "");
}

function normalizePhoneForWhatsApp(phone?: string): string | null {
  if (!phone) return null;
  // wa.me requires digits only (with country code).
  const digits = phone.replace(/\D/g, "");
  return digits.length ? digits : null;
}

export function ServiceProviderCard(props: ServiceProviderCardProps) {
  const {
    providerName,
    providerAvatar,
    serviceTitle,
    city,
    subCity,
    images = [],
    rating = 0,
    reviewTexts = [],
    price,
    providerPhone,
    onDetails,
    onBook,
  } = props;

  const { t } = useLanguage();
  const tt = t as any;

  const initials = useMemo(() => toInitials(providerName), [providerName]);
  // Confirmed product decision: ProviderCard shows ONLY 1 image (cover).
  // The full set (up to 5) is shown in the Service Detail Sheet.
  const coverImage = useMemo(() => (images || []).filter(Boolean)[0] || "", [images]);

  const locationText = useMemo(() => {
    const c = (city || "").trim();
    const s = (subCity || "").trim();
    if (c && s) return `${c} • ${s}`;
    return c || s || "";
  }, [city, subCity]);

  const [viewerOpen, setViewerOpen] = useState(false);

  const hasReviews = reviewTexts.filter(Boolean).length > 0;
  const [tickerIndex, setTickerIndex] = useState<number>(0);

  // Randomized auto-swapping review ticker
  useEffect(() => {
    const valid = reviewTexts.filter(Boolean);
    if (!valid.length) return;

    // Start from a random review
    setTickerIndex(Math.floor(Math.random() * valid.length));

    const intervalMs = 5000;
    const id = window.setInterval(() => {
      setTickerIndex((prev) => {
        if (valid.length <= 1) return prev;
        let next = Math.floor(Math.random() * valid.length);
        if (next === prev) next = (prev + 1) % valid.length;
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [reviewTexts]);

  const tel = useMemo(() => normalizePhoneForTel(providerPhone), [providerPhone]);
  const wa = useMemo(() => normalizePhoneForWhatsApp(providerPhone), [providerPhone]);

  const openViewer = () => setViewerOpen(true);

  const currentReview = useMemo(() => {
    const valid = reviewTexts.filter(Boolean);
    if (!valid.length) return "";
    const safeIdx = Math.max(0, Math.min(tickerIndex, valid.length - 1));
    return valid[safeIdx] || "";
  }, [reviewTexts, tickerIndex]);

  const hasSocialProofRow = rating > 0 || hasReviews;
  const showPrice = typeof price === "number" && Number.isFinite(price);

  const detailsAction = onDetails || onBook;

  return (
    <div className="bg-card rounded-2xl shadow-card animate-fade-in overflow-hidden">
      {/* Cover image (ProviderCard shows ONLY 1 image) */}
      <div className="relative">
        {coverImage ? (
          <button
            type="button"
            onClick={openViewer}
            className="w-full focus:outline-none"
            aria-label={tt?.common?.viewImage ?? "View image"}
          >
            <div className="h-44 w-full bg-muted">
              <img
                src={coverImage}
                alt={tt?.common?.image ?? "Image"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </button>
        ) : (
          // Placeholder banner (keeps layout stable)
          <div className="h-44 w-full bg-muted flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-muted-foreground/20">
                <AvatarImage src={providerAvatar} alt={providerName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{providerName}</p>
                <p className="text-xs text-muted-foreground">
                  {tt?.services?.noPhotosYet ?? "No photos yet"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header row: provider name + avatar */}
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-muted">
            <AvatarImage src={providerAvatar} alt={providerName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{providerName}</h3>

            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
              {serviceTitle}
              {locationText ? ` • ${locationText}` : ""}
            </p>

            {/* Social proof row */}
            {hasSocialProofRow && (
              <div className="flex items-center gap-3 mt-2">
                {rating > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star className="h-4 w-4 fill-star text-star" />
                    <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
                  </div>
                )}

                {hasReviews && (
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-muted-foreground truncate transition-opacity"
                      title={currentReview}
                    >
                      {currentReview}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            asChild
            className="flex-1 rounded-full"
            disabled={!tel}
            title={!tel ? (tt?.services?.noPhone ?? "No phone") : undefined}
          >
            <a href={tel ? `tel:${tel}` : undefined}>
              <Phone className="h-4 w-4" />
              <span className="ml-2">{tt?.services?.call ?? "Call"}</span>
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex-1 rounded-full"
            disabled={!wa}
            title={!wa ? (tt?.services?.noPhone ?? "No phone") : undefined}
          >
            <a
              href={wa ? `https://wa.me/${wa}` : undefined}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="ml-2">{tt?.services?.whatsapp ?? "WhatsApp"}</span>
            </a>
          </Button>
        </div>

        {/* Footer row: price + details */}
        {(showPrice || detailsAction) && (
          <div className="mt-3 flex items-center justify-between gap-3">
            {showPrice ? (
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">{tt?.services?.price ?? "Price"}</span>
                <p className="font-bold text-foreground truncate">
                  {price} {tt?.common?.currency ?? ""}
                </p>
              </div>
            ) : (
              <div />
            )}

            {detailsAction && (
              <Button
                onClick={detailsAction}
                size="sm"
                variant="ghost"
                className="rounded-full px-4"
              >
                {tt?.common?.details ?? "Details"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Full-screen viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden">
          <div className="relative bg-black">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white"
              onClick={() => setViewerOpen(false)}
              aria-label={tt?.common?.close ?? "Close"}
            >
              <X className="h-5 w-5" />
            </button>

            {coverImage && (
              <div className="w-full">
                <img
                  src={coverImage}
                  alt={tt?.common?.image ?? "Image"}
                  className="h-[75vh] w-full object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
