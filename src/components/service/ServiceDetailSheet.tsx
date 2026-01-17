import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  ChevronRight,
  Heart,
  MessageSquare,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceRatings } from "@/hooks/useReviews";

/**
 * ServiceDetailSheet
 * - Full-height (100%) bottom drawer
 * - Service list view: each row shows the service thumbnail on the right (if any),
 *   the provider/service title, rating, and is clickable.
 * - Detail view: basic provider card with Call / WhatsApp (can be swapped later).
 */

type ProviderStatus = "pending" | "approved" | "rejected" | "suspended";

export type ServiceProvider = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  city?: string | null;
  sub_city?: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  image_url?: string | null;
  // New (P0): service_images table (up to 5). Not in generated types yet.
  service_images?: { url: string; position: number }[] | null;
  price?: number | null;
  user_id?: string | null;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  is_paused?: boolean | null;
  is_featured?: boolean | null;
  approval_status?: ProviderStatus | string | null;
  views_count?: number | null;
};

// This sheet is used by Hub + Favorites. They pass a small "service" object
// describing which subcategory to show.
export type SheetService = {
  titleKey: string;
  descKey?: string;
  // NOTE: historically we store the *subcategory English name* in services.category.
  category: string;
  categoryName?: string;
  categoryNameAr?: string;
  color?: string;
  // icon is used in the Hub tiles; not required inside the sheet.
  // Keep it optional so callers can pass it without us depending on lucide types.
  icon?: unknown;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: SheetService;
  // Optional city filter (Hub has it, Favorites usually doesn't)
  city?: string | null;
  // When opening from a specific provider card, scroll/select it.
  initialProviderServiceId?: string | null;

  // Optional favorites integration (used in some screens)
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;

  // Optional: let parent open a different provider card implementation.
  // If provided, row click will call this instead of using the internal detail view.
  onSelectProviderService?: (serviceRow: ServiceProvider) => void;
};

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/\s+/g, "").trim();
}

function getCoverFromImages(p: ServiceProvider): string | null {
  const imgs = (p.service_images || []).slice().sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  const cover = imgs.find((x) => x.position === 1)?.url || imgs[0]?.url;
  if (cover) return String(cover).trim() || null;

  // Backward compat: some data still uses services.image_url
  const raw = (p.image_url || "").trim();
  return raw || null;
}

function getGalleryFromImages(p: ServiceProvider): string[] {
  const imgs = (p.service_images || []).slice().sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
  const urls = imgs.map((x) => String(x.url || "").trim()).filter(Boolean);
  if (urls.length) return urls.slice(0, 5);

  // Backward compat: sometimes image_url stores JSON array / CSV
  const raw = (p.image_url || "").trim();
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 5);
    } catch {
      return [];
    }
  }
  if (raw.includes(",")) return raw.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5);
  return [raw];
}

function readLocalFavorites(): Set<string> {
  try {
    const raw = window.localStorage.getItem("dora_fav_providers");
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

function writeLocalFavorites(next: Set<string>) {
  try {
    window.localStorage.setItem(
      "dora_fav_providers",
      JSON.stringify(Array.from(next.values()))
    );
  } catch {
    // ignore
  }
}

function openTel(phone?: string | null) {
  const p = normalizePhone(phone);
  if (!p) {
    toast.error("رقم الهاتف غير متوفر");
    return;
  }
  window.open(`tel:${p}`, "_self");
}

function openWhatsApp(phone?: string | null) {
  const p = normalizePhone(phone);
  if (!p) {
    toast.error("رقم الواتساب غير متوفر");
    return;
  }
  const digits = p.replace(/[^\d+]/g, "");
  window.open(`https://wa.me/${digits.replace("+", "")}`, "_blank");
}

// (removed duplicate helpers)

async function logContactEvent(
  providerId: string,
  channel: "call" | "whatsapp"
) {
  try {
    await supabase.from("events").insert([
      {
        event_type: channel === "call" ? "call_click" : "whatsapp_click",
        provider_id: providerId,
        metadata: { source: "ServiceDetailSheet" },
      },
    ]);
  } catch {
    // best-effort only
  }
}

export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  city,
  initialProviderServiceId = null,
  onToggleFavorite,
  isFavorite,
  onSelectProviderService,
}: Props) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [localFavs, setLocalFavs] = useState<Set<string>>(() => new Set());

  const serviceIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const { ratings } = useServiceRatings(serviceIds);

  useEffect(() => {
    if (!open) return;
    // Only read localStorage on the client, when the sheet is used.
    setLocalFavs(readLocalFavorites());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const escOrValue = (v: string) => {
          // PostgREST OR filter needs quoted values when they contain spaces/symbols.
          const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          return `"${escaped}"`;
        };

        const categoryVal = (service?.category ?? "").trim();
        // In this repository, services are tagged via `services.category`.
        // Keep the filter aligned with the actual DB schema (no `subcategory` column).
        const categoryOr = categoryVal ? `category.eq.${escOrValue(categoryVal)}` : "";

        // City filter: Hub passes the city name (often English). In Libya, data can be
        // stored in either Arabic or English. We best-effort map it to both.
        let cityOr = "";
        const cityVal = (city || "").trim();
        if (cityVal) {
          const cityNames = new Set<string>();
          cityNames.add(cityVal);

          try {
            const { data: cityRow } = await supabase
              .from("cities")
              .select("name,name_ar")
              .or(`name.eq.${escOrValue(cityVal)},name_ar.eq.${escOrValue(cityVal)}`)
              .maybeSingle();

            if (cityRow?.name) cityNames.add(String(cityRow.name));
            if (cityRow?.name_ar) cityNames.add(String(cityRow.name_ar));
          } catch {
            // ignore mapping errors
          }

          cityOr = Array.from(cityNames)
            .filter(Boolean)
            .map((n) => `city.eq.${escOrValue(n)}`)
            .join(",");
        }

        const base = supabase
          .from("services")
          .select(
            // Keep this aligned with generated Supabase types.
            "id,title,description,category,city,sub_city,provider_name,provider_phone,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count,service_images(url,position)"
          )
          .order("is_featured", { ascending: false })
          .order("views_count", { ascending: false });

        const runQuery = async (mode: "strict" | "permissive") => {
          let q = base;

          if (mode === "strict") {
            q = q
              .eq("is_visible", true)
              .eq("is_active", true)
              .eq("is_paused", false)
              .eq("approval_status", "approved");
          } else {
            q = q
              // Be permissive: older seeds sometimes leave these as NULL.
              .or("is_visible.eq.true,is_visible.is.null")
              .or("is_active.eq.true,is_active.is.null")
              .or("is_paused.eq.false,is_paused.is.null")
              // Only show approved providers; allow null during early data.
              .or("approval_status.eq.approved,approval_status.is.null");
          }

          if (categoryOr) {
            // IMPORTANT:
            q = q.or(categoryOr);
          }

          if (cityOr) {
            q = q.or(cityOr);
          }

          return await q;
        };

        let { data, error } = await runQuery("strict");
        if (error) throw error;

        // Fallback: if strict filters return nothing, try permissive filters.
        if (!data || data.length === 0) {
          const res = await runQuery("permissive");
          data = res.data;
          error = res.error;
          if (error) throw error;
        }
        const rows = (data || []) as any[];
        const normalized: ServiceProvider[] = rows.map((r) => ({
          id: String(r.id),
          title: r.title ?? null,
          description: r.description ?? null,
          category: r.category ?? null,
          city: r.city ?? null,
          sub_city: r.sub_city ?? null,
          provider_name: r.provider_name ?? null,
          provider_phone: r.provider_phone ?? null,
          image_url: r.image_url ?? null,
          service_images: Array.isArray(r.service_images)
            ? r.service_images.map((x: any) => ({ url: x.url, position: x.position }))
            : null,
          price: r.price ?? null,
          is_active: r.is_active ?? null,
          is_visible: r.is_visible ?? null,
          is_paused: r.is_paused ?? null,
          is_featured: r.is_featured ?? null,
          approval_status: r.approval_status ?? null,
          views_count: r.views_count ?? null,
        }));

        if (!alive) return;
        setProviders(normalized);

        // If we were opened for a specific provider service id, select it.
        if (initialProviderServiceId) {
          const match = normalized.find((p) => p.id === initialProviderServiceId) || null;
          setSelectedProvider(match);
        } else {
          setSelectedProvider(null);
        }
      } catch (e) {
        console.error("ServiceDetailSheet load error:", e);
        if (alive) setProviders([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, service.category, initialProviderServiceId]);

  // Keep it clean: no search in this sheet.
  const listProviders = Array.isArray(providers) ? providers : [];

  const isFav = (providerId: string) => {
    // Prefer external favorites integration if provided.
    if (isFavorite) return !!isFavorite(providerId);
    return localFavs.has(providerId);
  };

  const toggleFav = (providerId: string) => {
    if (onToggleFavorite) {
      onToggleFavorite(providerId);
      return;
    }

    setLocalFavs((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      writeLocalFavorites(next);
      return next;
    });
  };

  const isDetailOpen = !!selectedProvider && !onSelectProviderService;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Full-height drawer (A): opens at ~100% height */}
      <DrawerContent className="h-[100dvh] max-h-[100dvh] bg-background text-foreground" dir="rtl">
        <DrawerHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {isDetailOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setSelectedProvider(null)}
              >
                <ChevronRight className="h-4 w-4" />
                رجوع
              </Button>
            )}

            <div className="flex-1">
              <DrawerTitle className="text-base">
                {isDetailOpen
                  ? selectedProvider?.provider_name || "تفاصيل المزود"
                  : service.titleKey || service.categoryNameAr || service.categoryName || service.category || "المزودين"}
              </DrawerTitle>
            </div>
          </div>
        </DrawerHeader>

        <Separator />

        {/* LIST VIEW */}
        {!isDetailOpen && (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <div className="px-4 pb-6 space-y-3">
                {loading ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    جارٍ التحميل...
                  </div>
                ) : listProviders.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    لا يوجد مزودون
                  </div>
                ) : null}

                {listProviders.map((p) => {
                  const thumb = getCoverFromImages(p);
                  const rating = ratings.get(p.id);
                  const ratingText = rating?.averageRating
                    ? `★ ${rating.averageRating}`
                    : "★ —";

                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (onSelectProviderService) {
                          onSelectProviderService(p);
                          return;
                        }
                        setSelectedProvider(p);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (onSelectProviderService) onSelectProviderService(p);
                          else setSelectedProvider(p);
                        }
                      }}
                      className="w-[94%] mx-auto rounded-2xl border bg-card p-4 shadow-sm cursor-pointer hover:bg-accent/20 transition-colors"
                    >
                      {/* RTL row with thumbnail on the RIGHT */}
                      <div className="flex flex-row-reverse items-start gap-3">
                        {/* Thumbnail */}
                        <div className="shrink-0">
                          <div className="h-[70px] w-[90px] rounded-lg overflow-hidden border bg-muted">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </div>
                        </div>

                        {/* Text block */}
                        <div className="flex-1 min-w-0 text-right">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {p.provider_name || p.title || "مزود"}
                              </div>
                              <div className="text-sm text-muted-foreground mt-0.5">
                                {ratingText}
                              </div>
                            </div>

                            <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
                          </div>

                          {p.description && (
                            <div className="text-sm text-muted-foreground mt-2 line-clamp-1">
                              {p.description}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                            {!!p.sub_city && <span>{p.sub_city}</span>}
                            {!!p.city && (
                              <span className={p.sub_city ? "opacity-70" : ""}>
                                {p.city}
                              </span>
                            )}
                          </div>

                          {p.price != null && (
                            <div className="mt-2 text-sm font-medium text-muted-foreground">
                              {p.price} د.ل
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* DETAIL VIEW */}
        {isDetailOpen && selectedProvider && (
          <ScrollArea className="flex-1">
            <div className="px-4 py-4 pb-10">
              <div className="rounded-lg border p-4 bg-card">
                {/* Gallery (up to 5). ProviderCard stays 1 image; details show all. */}
                {getGalleryFromImages(selectedProvider).length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-2 overflow-x-auto scroll-smooth">
                      {getGalleryFromImages(selectedProvider).map((src, idx) => (
                        <div
                          key={`${src}-${idx}`}
                          className={cn(
                            "h-24 w-32 shrink-0 rounded-lg overflow-hidden border bg-muted",
                            idx === 0 && "ring-2 ring-primary/40"
                          )}
                        >
                          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-lg font-semibold truncate">
                  {selectedProvider.provider_name}
                </div>

                {selectedProvider.description && (
                  <div className="mt-4 text-sm">
                    {selectedProvider.description}
                  </div>
                )}

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      logContactEvent(selectedProvider.id, "call");
                      openTel(selectedProvider.provider_phone);
                    }}
                  >
                    <Phone className="h-4 w-4 ml-1" />
                    اتصال
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      logContactEvent(selectedProvider.id, "whatsapp");
                      openWhatsApp(selectedProvider.provider_phone);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 ml-1" />
                    واتساب
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={async () => {
                    try {
                      await supabase.from("events").insert([
                        {
                          event_type: "report",
                          provider_id: selectedProvider.id,
                          metadata: { source: "ServiceDetailSheet" },
                        },
                      ]);
                      toast.success("تم إرسال البلاغ");
                    } catch {
                      toast.error("تعذر إرسال البلاغ");
                    }
                  }}
                >
                  <Flag className="h-4 w-4 ml-1" />
                  إبلاغ عن مزود
                </Button>

                <Separator className="my-4" />

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  سيظهر طلب التقييم داخل التطبيق بعد التواصل
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default ServiceDetailSheet;
