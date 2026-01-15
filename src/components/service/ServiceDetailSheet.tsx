import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  ChevronRight,
  Heart,
  MessageSquare,
  MapPin,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * ServiceDetailSheet
 * - Provider list drawer + provider detail sheet
 * - Drawer height = 90%
 * - Sub-city chips: horizontal scroll, NO "All" chip
 *   (tap selected chip again to reset)
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  city?: string | null;
  category?: string | null;
  subcategory?: string | null;
  providers: ServiceProvider[];
  initialSelectedProvider?: ServiceProvider | null;
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
  title,
  city,
  category,
  subcategory,
  providers,
  initialSelectedProvider = null,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedSubCity, setSelectedSubCity] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<ServiceProvider | null>(initialSelectedProvider);

  useEffect(() => {
    if (open && initialSelectedProvider) {
      setSelectedProvider(initialSelectedProvider);
    }
  }, [open, initialSelectedProvider]);

  const availableSubCities = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => {
      if (p.sub_city?.trim()) set.add(p.sub_city.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return providers.filter((p) => {
      if (selectedSubCity && p.sub_city !== selectedSubCity) return false;
      if (!q) return true;

      const hay = [
        p.provider_name,
        p.title,
        p.description,
        p.sub_city,
        p.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [providers, query, selectedSubCity]);

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
                  : title || subcategory || category || "المزودين"}
              </DrawerTitle>

              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                {city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {city}
                  </span>
                )}
                {subcategory && <span>{subcategory}</span>}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <Separator />

        {/* LIST VIEW */}
        {!isDetailOpen && (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مزود..."
              />
            </div>

            {availableSubCities.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex gap-2 overflow-x-auto whitespace-nowrap flex-nowrap">
                  {availableSubCities.map((sc) => {
                    const active = selectedSubCity === sc;
                    return (
                      <button
                        key={sc}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-sm border",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border"
                        )}
                        onClick={() =>
                          setSelectedSubCity((prev) =>
                            prev === sc ? null : sc
                          )
                        }
                      >
                        {sc}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="px-4 pb-6 space-y-3">
                {filteredProviders.length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    لا يوجد مزودون مطابقون
                  </div>
                )}

                {filteredProviders.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border p-3 bg-card flex gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {p.provider_name || p.title || "مزود"}
                      </div>

                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        {p.sub_city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {p.sub_city}
                          </span>
                        )}
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

                <div className="text-sm text-muted-foreground mt-1">
                  {selectedProvider.city}
                  {selectedProvider.sub_city &&
                    ` • ${selectedProvider.sub_city}`}
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
                  onClick={() => handleReport(selectedProvider)}
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