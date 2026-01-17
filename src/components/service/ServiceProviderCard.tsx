import React, { useMemo, useState } from "react";
import { MessageCircle, Phone, Star, X } from "lucide-react";
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
    // OpenSooq-style: image on RIGHT, dense readable text on LEFT, no extra decoration.
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-3" dir="rtl">
        <div className="flex flex-row-reverse items-start gap-3">
          {/* Photo (RIGHT) */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => cover && setViewerOpen(true)}
              className="relative h-[104px] w-[104px] rounded-lg overflow-hidden border bg-muted focus:outline-none"
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
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    {initials}
                  </div>
                </div>
              )}
            </button>
          </div>

          {/* Text (LEFT) */}
          <div className="flex-1 min-w-0 text-right">
            <div className="font-bold text-base leading-tight truncate">{providerName}</div>
            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {serviceTitle}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="min-w-0 truncate">{locationText || ""}</div>
              {rating > 0 ? (
                <div className="shrink-0 flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
                </div>
              ) : null}
            </div>

            {showPrice && (
              <div className="mt-2 text-sm font-semibold text-foreground">
                {price} {tt?.common?.currency ?? ""}
              </div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="h-9 rounded-md px-3"
                disabled={!wa}
                title={!wa ? (tt?.services?.noPhone ?? "No phone") : undefined}
              >
                <a href={wa ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 ml-1" />
                  {tt?.services?.whatsapp ?? "WhatsApp"}
                </a>
              </Button>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 rounded-md px-3"
                disabled={!tel}
                title={!tel ? (tt?.services?.noPhone ?? "No phone") : undefined}
              >
                <a href={tel ? `tel:${tel}` : undefined}>
                  <Phone className="h-4 w-4 ml-1" />
                  {tt?.services?.call ?? "Call"}
                </a>
              </Button>
            </div>

            {detailsAction && (
              <button
                type="button"
                onClick={detailsAction}
                className="mt-2 text-sm text-primary underline underline-offset-2"
              >
                {tt?.common?.details ?? "Details"}
              </button>
            )}
          </div>
        </div>
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
