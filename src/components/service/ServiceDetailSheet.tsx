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
import { useServices, Service as DoraService } from "@/hooks/useServices";

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
  city,
  initialProviderServiceId = null,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const { services, loading } = useServices();
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  // "As it was": the sheet should show providers based on the already-loaded services list.
  // This avoids RLS/joins issues and matches the rest of the app.
  const listProviders = useMemo<ServiceProvider[]>(() => {
    const rows: DoraService[] = Array.isArray(services) ? services : [];
    const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

    // "As it was": match what is stored in services.category, regardless of Arabic/English labels.
    // The app sometimes passes English name, sometimes Arabic label for display.
    const targets = [
      service?.category,
      (service as any)?.categoryName,
      (service as any)?.categoryNameAr,
      (service as any)?.titleKey,
    ]
      .filter(Boolean)
      .map(norm)
      .filter(Boolean);

    // Keep UI clean: no city shown. But if caller passes city, we can still filter silently.
    const cityFilter = city ?? undefined;

    // Support both legacy and newer shapes:
    // - some rows store the *subcategory* value in `services.category`
    // - some rows may store subcategory in `services.subcategory` (if present in DB)
    return rows
      .filter((s: any) => {
        if (!s) return false;
        const cat = norm((s as any).category);
        const sub = norm((s as any).subcategory);

        const matchCategory = targets.length
          ? targets.some((t) =>
              cat === t ||
              sub === t ||
              (cat && t && (cat.includes(t) || t.includes(cat))) ||
              (sub && t && (sub.includes(t) || t.includes(sub)))
            )
          : true;

        const matchCity = cityFilter
          ? norm((s as any).city) === norm(cityFilter)
          : true;

        // If these flags exist in the row, respect them. (Some older rows may not have them.)
        const isVisible = (s as any).is_visible;
        const isPaused = (s as any).is_paused;
        const approval = (s as any).approval_status;

        const okVisible = typeof isVisible === "boolean" ? isVisible : true;
        const okPaused = typeof isPaused === "boolean" ? !isPaused : true;
        const okApproved = typeof approval === "string" ? approval === "approved" : true;

        return matchCategory && matchCity && okVisible && okPaused && okApproved;
      })
      .map((s: any) => ({
        id: String(s.id),
        title: s.title ?? null,
        description: s.description ?? null,
        category: s.category ?? null,
        subcategory: (s as any).subcategory ?? null,
        city: (s as any).city ?? null,
        sub_city: (s as any).sub_city ?? null,
        provider_name: s.provider_name ?? null,
        provider_phone: s.provider_phone ?? null,
        image_url: s.image_url ?? null,
        is_active: s.is_active ?? null,
        is_visible: (s as any).is_visible ?? null,
        is_paused: (s as any).is_paused ?? null,
        is_featured: (s as any).is_featured ?? null,
        is_verified: (s as any).is_verified ?? null,
        approval_status: (s as any).approval_status ?? null,
        views_count: (s as any).views_count ?? null,
      }));
  }, [services, city, service?.category, (service as any)?.categoryName, (service as any)?.categoryNameAr, (service as any)?.titleKey]);

  // Select the requested provider when the drawer opens.
  useEffect(() => {
    if (!open) return;

    if (initialProviderServiceId) {
      const match = listProviders.find((p) => p.id === initialProviderServiceId) || null;
      setSelectedProvider(match);
      return;
    }
    setSelectedProvider(null);
  }, [open, initialProviderServiceId, listProviders]);

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

                {listProviders.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border p-3 bg-card flex gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {p.provider_name || p.title || "مزود"}
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
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedProvider(p)}
                      >
                        التفاصيل
                      </Button>

                      {onToggleFavorite && isFavorite && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToggleFavorite(p.id)}
                        >
                          <Heart
                            className={cn(
                              "h-4 w-4",
                              isFavorite(p.id) && "fill-current"
                            )}
                          />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
