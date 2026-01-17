import React, { useMemo, useState } from "react";
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

  /** Up to 5 images; ProviderCard shows ONLY the cover (first image). */
  images?: string[];

  /** Optional rating; only shown when > 0 */
  rating?: number;

  /** Review snippets (written reviews). Optional; not emphasized in card. */
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
  return trimmed.replace(/\s+/g, "");
}

function normalizePhoneForWhatsApp(phone?: string): string | null {
  if (!phone) return null;
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
    price,
    providerPhone,
    onDetails,
    onBook,
  } = props;

  const { t } = useLanguage();
  const tt = t as any;

  const initials = useMemo(() => toInitials(providerName), [providerName]);
  const cover = useMemo(() => (images || []).filter(Boolean)[0] || null, [images]);

  const locationText = useMemo(() => {
    const c = (city || "").trim();
    const s = (subCity || "").trim();
    if (c && s) return `${c} • ${s}`;
    return c || s || "";
  }, [city, subCity]);

  const tel = useMemo(() => normalizePhoneForTel(providerPhone), [providerPhone]);
  const wa = useMemo(() => normalizePhoneForWhatsApp(providerPhone), [providerPhone]);

  const showPrice = typeof price === "number" && Number.isFinite(price) && price > 0;
  const detailsAction = onDetails || onBook;

  // Full-screen viewer for cover image (single).
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div className="bg-card rounded-2xl shadow-card animate-fade-in overflow-hidden">
      <div className="p-4">
        {/* Top row: photo on the RIGHT, text to its left (RTL-friendly) */}
        <div className="flex flex-row-reverse items-start gap-4" dir="rtl">
          {/* Photo */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => cover && setViewerOpen(true)}
              className="relative h-[92px] w-[118px] sm:h-[100px] sm:w-[132px] rounded-xl overflow-hidden border bg-muted focus:outline-none"
              aria-label={tt?.common?.viewImage ?? "View image"}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={tt?.common?.image ?? "Image"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Avatar className="h-12 w-12 ring-2 ring-muted-foreground/20">
                    <AvatarImage src={providerAvatar} alt={providerName} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </button>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 text-right">
            {/* Provider name + avatar */}
            <div className="flex flex-row-reverse items-start gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-muted">
                <AvatarImage src={providerAvatar} alt={providerName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{providerName}</h3>

                {/* Rating under the name */}
                {rating > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-star text-star" />
                    <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service description (2 lines) */}
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {serviceTitle}
            </p>

            {/* Location */}
            {locationText && (
              <div className="mt-2 text-sm text-muted-foreground truncate">{locationText}</div>
            )}

            {/* Price (only if provider added it) */}
            {showPrice && (
              <div className="mt-2 text-sm font-semibold text-foreground">
                {price} {tt?.common?.currency ?? ""}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            asChild
            className="rounded-full"
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
            className="rounded-full"
            disabled={!wa}
            title={!wa ? (tt?.services?.noPhone ?? "No phone") : undefined}
          >
            <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              <span className="ml-2">{tt?.services?.whatsapp ?? "WhatsApp"}</span>
            </a>
          </Button>
        </div>

        {detailsAction && (
          <div className="mt-3">
            <Button onClick={detailsAction} variant="ghost" className="w-full rounded-full">
              {tt?.common?.details ?? "Details"}
            </Button>
          </div>
        )}
      </div>

      {/* Full-screen viewer (cover only) */}
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

            {cover && (
              <img
                src={cover}
                alt={tt?.common?.image ?? "Image"}
                className="h-[75vh] w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ServiceProviderCard;
