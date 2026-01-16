import { useEffect, useState } from "react";
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

/**
 * ServiceDetailSheet
 * - Provider list drawer + provider detail
 * - Drawer height = 90%
 * - Favorites supported
 * - Reviews section REMOVED (rating handled later via in-app prompt)
 */

type ProviderStatus = "pending" | "approved" | "rejected" | "suspended";

export type ServiceProvider = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  city?: string | null;
  sub_city?: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  image_url?: string | null;
  // Optional future-proof gallery support. Some environments may store multiple URLs.
  // We treat this as best-effort and keep the UI resilient.
  image_urls?: string[] | null;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  is_paused?: boolean | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
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
};

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/\s+/g, "").trim();
}

function parseImageUrls(provider: Pick<ServiceProvider, "image_url" | "image_urls">) {
  // 1) Preferred: explicit array.
  if (Array.isArray(provider.image_urls) && provider.image_urls.length > 0) {
    return provider.image_urls.filter(Boolean).slice(0, 10);
  }

  // 2) Back-compat: single string can contain JSON array or comma-separated URLs.
  const raw = (provider.image_url || "").trim();
  if (!raw) return [] as string[];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x)).filter(Boolean).slice(0, 10);
      }
    } catch {
      // fall through
    }
  }

  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  return [raw].slice(0, 10);
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

export default function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  initialProviderServiceId = null,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [localFavs, setLocalFavs] = useState<Set<string>>(() => new Set());

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
        const categoryOr = categoryVal
          ? `subcategory.eq.${escOrValue(categoryVal)},category.eq.${escOrValue(categoryVal)}`
          : "";

        const base = supabase
          .from("services")
          .select(
            // NOTE: `image_urls` may not exist in all DBs. Selecting it is safe; it will be null if absent.
            "id,title,description,category,subcategory,city,sub_city,provider_name,provider_phone,image_url,image_urls,is_active,is_visible,is_paused,is_featured,is_verified,approval_status,views_count"
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
            // Older seed/data sometimes stored the *subcategory name* in `services.category`.
            // Newer data uses `services.subcategory`.
            // Match either column.
            q = q.or(categoryOr);
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
          subcategory: r.subcategory ?? null,
          city: r.city ?? null,
          sub_city: r.sub_city ?? null,
          provider_name: r.provider_name ?? null,
          provider_phone: r.provider_phone ?? null,
          image_url: r.image_url ?? null,
          image_urls: Array.isArray(r.image_urls) ? r.image_urls : null,
          is_active: r.is_active ?? null,
          is_visible: r.is_visible ?? null,
          is_paused: r.is_paused ?? null,
          is_featured: r.is_featured ?? null,
          is_verified: r.is_verified ?? null,
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

  const isDetailOpen = !!selectedProvider;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90dvh] max-h-[90dvh] bg-background text-foreground">
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
                  const photos = parseImageUrls(p);

                  return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProvider(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedProvider(p);
                    }}
                    className="rounded-lg border p-3 bg-card flex gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold truncate">
                          {p.provider_name || p.title || "مزود"}
                        </div>

                        {/* Favorite (Heart) */}
                        <button
                          type="button"
                          aria-label="Favorite"
                          className={cn(
                            "shrink-0 rounded-full p-2 border bg-background hover:bg-accent/40 transition-colors",
                            isFav(p.id) && "text-red-600"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFav(p.id);
                          }}
                        >
                          <Heart
                            className={cn(
                              "h-4 w-4",
                              isFav(p.id) && "fill-current"
                            )}
                          />
                        </button>
                      </div>

                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        {p.is_verified && (
                          <Badge variant="secondary">موثّق</Badge>
                        )}
                        {p.is_featured && <Badge>مميز</Badge>}
                      </div>

                      {p.description && (
                        <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {p.description}
                        </div>
                      )}

                      {/* Photo strip (thumbnails only) */}
                      {photos.length > 0 && (
                        <div className="mt-3 -mx-1 overflow-x-auto">
                          <div className="flex gap-2 px-1">
                            {photos.map((url, idx) => (
                                <div
                                  key={`${p.id}-img-${idx}`}
                                  className="h-[96px] w-[96px] rounded-md overflow-hidden border bg-muted shrink-0"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
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

// Allow both default import and named import styles.
// Some screens import with: import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
export { ServiceDetailSheet };
