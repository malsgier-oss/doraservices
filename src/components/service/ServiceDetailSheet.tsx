import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Heart, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ProviderStatus = "pending" | "approved" | "rejected" | "suspended";

export type SheetService = {
  titleKey: string;
  descKey?: string;
  // Historically we store the *subcategory English name* in services.category.
  category: string;
  categoryName?: string;
  categoryNameAr?: string;
  color?: string;
  icon?: unknown;
};

export type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  sub_city: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  image_url: string | null;
  price: number | null;
  is_active: boolean;
  is_visible: boolean;
  is_paused: boolean;
  is_featured: boolean;
  approval_status: ProviderStatus | string;
  views_count: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: SheetService;
  city?: string | null;

  // Optional favorites integration
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;
};

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/\s+/g, "").trim();
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

async function logContactEvent(providerId: string, channel: "call" | "whatsapp") {
  try {
    await supabase.from("events").insert([
      {
        event_type: channel === "call" ? "call_click" : "whatsapp_click",
        provider_id: providerId,
        metadata: { source: "ServiceDetailSheet" },
      },
    ]);
  } catch {
    // best-effort
  }
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

export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  city = null,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [localFavs, setLocalFavs] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    setLocalFavs(readLocalFavorites());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    const run = async () => {
      setLoading(true);
      try {
        const categoryVal = (service?.category ?? "").trim();

        const base = supabase
          .from("services")
          .select(
            "id,title,description,category,city,sub_city,provider_name,provider_phone,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
          )
          .order("is_featured", { ascending: false })
          .order("views_count", { ascending: false });

        const runQuery = async (
          mode: "strict" | "permissive",
          withCity: boolean
        ) => {
          let q = base;

          if (mode === "strict") {
            q = q
              .eq("is_visible", true)
              .eq("is_active", true)
              .eq("is_paused", false)
              .eq("approval_status", "approved");
          } else {
            q = q
              .or("is_visible.eq.true,is_visible.is.null")
              .or("is_active.eq.true,is_active.is.null")
              .or("is_paused.eq.false,is_paused.is.null")
              .or("approval_status.eq.approved,approval_status.is.null");
          }

          if (categoryVal) {
            // In this schema, category holds either category OR subcategory label (legacy).
            q = q.eq("category", categoryVal);
          }

          if (withCity && city) {
            q = q.eq("city", city);
          }

          return await q;
        };

        // City filtering can easily mismatch (Arabic vs English city names).
        // We try with city first, then fall back to no-city before giving up.
        let { data, error } = await runQuery("strict", true);
        if (error) throw error;

        if (!data || data.length === 0) {
          const resNoCityStrict = await runQuery("strict", false);
          if (resNoCityStrict.error) throw resNoCityStrict.error;
          data = resNoCityStrict.data;
        }

        if (!data || data.length === 0) {
          const resPerm = await runQuery("permissive", true);
          if (resPerm.error) throw resPerm.error;
          data = resPerm.data;
        }

        if (!data || data.length === 0) {
          const resPermNoCity = await runQuery("permissive", false);
          if (resPermNoCity.error) throw resPermNoCity.error;
          data = resPermNoCity.data;
        }

        if (!alive) return;
        setRows((data ?? []) as ServiceRow[]);
      } catch (e) {
        console.error("ServiceDetailSheet load error:", e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, service?.category, city]);

  const list = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const isFav = (providerId: string) => {
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

  const headerTitle =
    service?.categoryNameAr ||
    service?.titleKey ||
    service?.categoryName ||
    service?.category ||
    "الخدمات";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="h-[100dvh] max-h-[100dvh] bg-background text-foreground"
        dir="rtl"
      >
        <DrawerHeader className="px-4 pt-4 pb-2">
          <DrawerTitle className="text-base text-right">{headerTitle}</DrawerTitle>
        </DrawerHeader>

        <Separator />

        <div className="h-full overflow-y-auto pb-10">
          <div className="px-4 py-4 space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                جارٍ التحميل...
              </div>
            ) : list.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                لا توجد خدمات/مزودون لهذه الفئة
              </div>
            ) : null}

            {list.map((p) => {
              const title = p.provider_name || p.title || "مزود";
              const desc = (p.description || "").trim();
              const priceText =
                typeof p.price === "number" && !Number.isNaN(p.price)
                  ? `${p.price} د.ل`
                  : "";

              return (
                <div
                  key={p.id}
                  className="w-[94%] mx-auto rounded-2xl border bg-card p-4 shadow-sm"
                >
                  {/* Header: name + rating (rating is placeholder until reviews) */}
                  <div className="text-right">
                    <div className="font-semibold text-base leading-6">{title}</div>
                    <div className="text-sm text-muted-foreground mt-1">★ —</div>
                  </div>

                  {/* 1-line description */}
                  {desc && (
                    <div className="mt-2 text-sm text-muted-foreground line-clamp-1 text-right">
                      {desc}
                    </div>
                  )}

                  <div className="my-3 border-t" />

                  {/* Actions: Call (primary) -> WhatsApp -> Heart (after WhatsApp). Price on the far left */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        className="h-11 px-6"
                        onClick={() => {
                          logContactEvent(p.id, "call");
                          openTel(p.provider_phone);
                        }}
                      >
                        <Phone className="h-4 w-4 ml-2" />
                        اتصال
                      </Button>

                      <Button
                        variant="secondary"
                        className="h-11 px-4"
                        onClick={() => {
                          logContactEvent(p.id, "whatsapp");
                          openWhatsApp(p.provider_phone);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 ml-2" />
                        واتساب
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-11 w-11",
                          isFav(p.id) && "text-red-600"
                        )}
                        aria-label="إضافة للمفضلة"
                        onClick={() => toggleFav(p.id)}
                      >
                        <Heart
                          className={cn(
                            "h-5 w-5",
                            isFav(p.id) && "fill-current"
                          )}
                        />
                      </Button>
                    </div>

                    <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {priceText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Keep default export for backward compatibility (some files may import default).
export default ServiceDetailSheet;
