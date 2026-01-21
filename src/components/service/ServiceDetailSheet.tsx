import { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, normalizeCategory } from "@/lib/utils";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  X,
  Star,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceRatings } from "@/hooks/useReviews";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { ServiceProviderCard, ProviderData } from "./ServiceProviderCard";
import { trackProviderEvent } from "@/lib/providerTelemetry";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";

type UnknownRecord = Record<string, unknown>;
function toRecord(v: unknown): UnknownRecord {
  if (v && typeof v === "object") return v as UnknownRecord;
  return {};
}
function getString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return String(v);
}
function getNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// --- Types ---
export type SheetService = {
  titleKey: string;
  category: string;
  categoryName?: string;
  categoryNameAr?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: SheetService;
  city?: string | null;
  initialProviderServiceId?: string | null;
  startInProviderView?: boolean;
  isRTL?: boolean;
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;
};

type SuggestedProvider = ProviderData;

function pickRandomReviews<T>(arr: T[], n: number): T[] {
  if (!arr || arr.length === 0) return [];
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function pickOneRandom<T>(arr: T[], seed: number): T | null {
  if (!arr || arr.length === 0) return null;
  const idx = Math.abs(seed) % arr.length;
  return arr[idx] ?? null;
}

// --- Hook: Robust Data Fetching (Restored Logic) ---
function useSheetData(open: boolean, service: SheetService, city?: string | null) {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const escOrValue = (v: string) => {
          const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          return `"${escaped}"`;
        };

        // Normalize category value for matching with stored services.category
        const categoryVal = service?.category ? normalizeCategory(service.category) : "";
        const categoryNames = new Set<string>();
        if (categoryVal) categoryNames.add(categoryVal);
        if (service?.categoryName) categoryNames.add(String(service.categoryName));
        if (service?.categoryNameAr) categoryNames.add(String(service.categoryNameAr));

        // Use `.in()` instead of `.or(...)` for reliability with quoting/encoding.
        // Include both raw + normalized variants to match legacy stored values.
        const categoryList = Array.from(categoryNames)
          .map((n) => String(n || "").trim())
          .filter(Boolean)
          .flatMap((n) => [n, normalizeCategory(n)]);
        const categoryIn = Array.from(new Set(categoryList)).filter(Boolean);

        // DEV: Log filter values for debugging (console only, no UI)
        if (import.meta.env?.DEV || import.meta.env?.MODE === "development") {
          console.log("[ServiceDetailSheet] Filter values:", {
            category: categoryVal || "(empty)",
            city: city || "(empty)",
            categoryFilter: categoryIn.length ? categoryIn : "(none)",
          });
        }

        let cityIn: string[] = [];
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

          const cityList = Array.from(cityNames)
            .map((n) => String(n || "").trim())
            .filter(Boolean);
          cityIn = Array.from(new Set(cityList));
        }

        const baseWithCity = supabase
          .from("services")
          // Use select("*") so this stays compatible across older schemas
          // (some deployments may not have optional columns like allow_whatsapp/call_clicks/etc).
          .select("*")
          .order("views_count", { ascending: false })
          .order("created_at", { ascending: false });

        const baseNoCity = supabase
          .from("services")
          .select("*")
          .order("views_count", { ascending: false })
          .order("created_at", { ascending: false });

        const runQuery = async (
          mode: "strict" | "permissive",
          allowCityFilter: boolean
        ) => {
          let q = allowCityFilter ? baseWithCity : baseNoCity;

          if (mode === "strict") {
            q = q
              .eq("is_visible", true)
              .eq("is_active", true)
              .eq("is_paused", false)
              // Approval status matching should be case-insensitive to align with RLS (lower(...) = 'approved')
              .ilike("approval_status", "approved");
          } else {
            q = q
              .or("is_visible.eq.true,is_visible.is.null")
              .or("is_active.eq.true,is_active.is.null")
              .or("is_paused.eq.false,is_paused.is.null")
              .or("approval_status.ilike.approved,approval_status.is.null");
          }

          // Filter by category name (matches services.category column)
          if (categoryIn.length > 0) {
            q = q.in("category", categoryIn);
          }
          if (allowCityFilter && cityIn.length > 0) q = q.in("city", cityIn);

          return await q;
        };

        let allowCityFilter = true;
        let { data, error } = await runQuery("strict", allowCityFilter);
        if (error) {
          const msg = String((error as { message?: string } | null)?.message || error);
          const low = msg.toLowerCase();
          const missingCity =
            low.includes("column") &&
            (low.includes("city") || low.includes("sub_city")) &&
            low.includes("does not exist");
          if (missingCity) {
            allowCityFilter = false;
            ({ data, error } = await runQuery("strict", allowCityFilter));
          }
        }
        if (error) throw error;

        if (!data || data.length === 0) {
          // Retry permissive filters (allows NULLs)
          let res = await runQuery("permissive", allowCityFilter);
          data = res.data;
          error = res.error;

          // If city filtering yields zero, retry without city filters
          if ((!data || data.length === 0) && allowCityFilter && cityIn.length > 0) {
            allowCityFilter = false;
            res = await runQuery("permissive", allowCityFilter);
            data = res.data;
            error = res.error;
          }

          if (error) throw error;

          // DEV: Log empty result (console only, no UI)
          if ((!data || data.length === 0) && (import.meta.env?.DEV || import.meta.env?.MODE === "development")) {
            console.warn("[ServiceDetailSheet] No providers found with filters:", {
              categoryFilter: categoryVal || "(none)",
            cityFilter: cityIn.length ? cityIn : "(none)",
              allowCityFilter,
            });
          }
        }

        const rows = (data || []) as unknown[];
        const normalizedBase: ProviderData[] = rows.map((raw) => {
          const r = toRecord(raw);
          return {
            id: String(getString(r.id) || ""),
            user_id: getString(r.user_id),
            title: getString(r.title),
            description: getString(r.description),
            category: getString(r.category),
            city: getString(r.city),
            sub_city: getString(r.sub_city),
            provider_name: getString(r.provider_name),
            provider_phone: getString(r.provider_phone),
            allow_whatsapp: (r.allow_whatsapp as boolean | null | undefined) ?? true,
            image_url: getString(r.image_url),
            image_urls: null,
            price: getNumber(r.price),
            is_active: (r.is_active as boolean | null | undefined) ?? null,
            approval_status: getString(r.approval_status),
            views_count: getNumber(r.views_count),
            call_clicks: getNumber(r.call_clicks),
            whatsapp_clicks: getNumber(r.whatsapp_clicks),
            reviews: undefined,
          };
        }).filter((p) => !!p.id);

        let normalized = normalizedBase;
        try {
          const ids = normalizedBase.map((x) => x.id).filter(Boolean);
          if (ids.length > 0) {
            const { data: revs } = await supabase
              .from("service_reviews")
              .select("service_id,content,created_at")
              .in("service_id", ids)
              .order("created_at", { ascending: false })
              .limit(50);

            const map = new Map<string, string[]>();
            (revs || []).forEach((raw) => {
              const r = toRecord(raw);
              const sid = String(getString(r.service_id) || "");
              const txt = String(getString(r.content) || "").trim();
              if (!sid || !txt) return;
              if (!map.has(sid)) map.set(sid, []);
              const arr = map.get(sid)!;
              if (arr.length < 5) arr.push(txt);
            });

            normalized = normalizedBase.map((p) => ({
              ...p,
              reviews: map.get(p.id) || undefined,
            }));
          }
        } catch {
          // ignore
        }

        if (alive) setProviders(normalized);
      } catch (e) {
        console.error("ServiceDetailSheet load error:", e);
        if (alive) {
          setError(e);
          setProviders([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, service.category, city]);

  return { providers, setProviders, loading, error };
}

// --- Main Component ---
export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  city,
  initialProviderServiceId,
  startInProviderView,
  isRTL,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const { providers, setProviders, loading, error } = useSheetData(open, service, city);

  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const viewedServiceIdsRef = useRef<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSuggestionTapAtRef = useRef<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const rtl = !!isRTL;
  const dir = rtl ? "rtl" : "ltr";
  const BackIcon = rtl ? ChevronRight : ChevronLeft;

  // If a specific provider is requested, fetch it directly so the details view can open immediately.
  // We still keep the category-based list fetch for suggestions + robustness.
  useEffect(() => {
    if (!open) return;
    if (!startInProviderView) return;
    const id = (initialProviderServiceId || "").trim();
    if (!id) return;

    let alive = true;
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (!alive) return;
        if (error || !data) return;

        const r = toRecord(data);
        const p: ProviderData = {
          id: String(getString(r.id) || ""),
          user_id: getString(r.user_id),
          title: getString(r.title),
          description: getString(r.description),
          category: getString(r.category),
          city: getString(r.city),
          sub_city: getString(r.sub_city),
          provider_name: getString(r.provider_name),
          provider_phone: getString(r.provider_phone),
          allow_whatsapp: (r.allow_whatsapp as boolean | null | undefined) ?? true,
          image_url: getString(r.image_url),
          image_urls: null,
          price: getNumber(r.price),
          is_active: (r.is_active as boolean | null | undefined) ?? null,
          approval_status: getString(r.approval_status),
          views_count: getNumber(r.views_count),
          call_clicks: getNumber(r.call_clicks),
          whatsapp_clicks: getNumber(r.whatsapp_clicks),
          reviews: undefined,
        };

        setSelectedProvider((prev) => (prev?.id === p.id ? prev : p));
        setProviders((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
      } catch {
        // ignore: fall back to category-based list
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [open, startInProviderView, initialProviderServiceId, setProviders]);

  const serviceIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const { ratings } = useServiceRatings(serviceIds);

  // Prevent the sheet from opening scrolled to the bottom (especially after a previous scroll).
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    // Ensure this runs after layout so the scroll container exists and has height.
    requestAnimationFrame(() => {
      try {
        el.scrollTo({ top: 0, behavior: "auto" });
      } catch {
        el.scrollTop = 0;
      }
    });
  }, [open, selectedProvider?.id]);

  const bumpProviderStat = (
    id: string,
    field: "views_count" | "call_clicks" | "whatsapp_clicks"
  ) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [field]: Number(p[field] ?? 0) + 1 } : p
      )
    );
    setSelectedProvider((prev) =>
      prev?.id === id ? { ...prev, [field]: Number(prev[field] ?? 0) + 1 } : prev
    );
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const id = data?.user?.id ?? null;
        if (alive) setUserId(id);
      } catch {
        if (alive) setUserId(null);
      }
    };
    if (open) run();
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (onToggleFavorite || isFavorite) return;
    if (!userId) {
      setFavIds(new Set());
      return;
    }

    let alive = true;
    const run = async () => {
      try {
        const ids = providers.map((p) => p.id).filter(Boolean);
        if (ids.length === 0) {
          if (alive) setFavIds(new Set());
          return;
        }
        const { data, error } = await supabase
          .from("saved_businesses")
          .select("business_id")
          .eq("user_id", userId)
          .in("business_id", ids.map(String));

        if (error) throw error;
        const next = new Set<string>((data || []).map((x: any) => String(x.business_id)));
        if (alive) setFavIds(next);
      } catch {
        if (alive) setFavIds(new Set());
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, providers, userId, onToggleFavorite, isFavorite]);

  const isFavoriteLocal = (providerId: string) => {
    if (isFavorite) return !!isFavorite(providerId);
    return favIds.has(providerId);
  };

  const toggleFavoriteLocal = async (providerId: string) => {
    if (onToggleFavorite) return onToggleFavorite(providerId);
    if (!userId) return toast.info("سجل دخولك لحفظ المفضلة");

    const already = favIds.has(providerId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (already) next.delete(providerId);
      else next.add(providerId);
      return next;
    });

    try {
      if (already) {
        const { error } = await supabase
          .from("saved_businesses")
          .delete()
          .eq("user_id", userId)
          .eq("business_id", String(providerId));
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_businesses")
          .insert({ user_id: userId, business_id: String(providerId) });
        if (error) throw error;
      }
    } catch {
      setFavIds((prev) => {
        const next = new Set(prev);
        if (already) next.add(providerId);
        else next.delete(providerId);
        return next;
      });
      toast.error("تعذر تحديث المفضلة");
    }
  };

  const reportService = async (
    serviceId: string,
    reporterId?: string | null,
    reason?: string | null
  ) => {
    if (!reporterId) {
      toast.info("سجل دخولك للإبلاغ");
      return;
    }
    try {
      const { error } = await supabase.from("user_reports").insert({
        reporter_id: reporterId,
        report_type: "service",
        reason: (reason || "").trim().slice(0, 200) || "بلاغ",
        reported_service_id: serviceId,
      });
      if (error) throw error;
      toast.success("تم إرسال البلاغ");
    } catch {
      toast.error("تعذر إرسال البلاغ");
    }
  };

  useEffect(() => {
    if (initialProviderServiceId && providers.length > 0) {
      const match = providers.find((p) => p.id === initialProviderServiceId);
      if (match) setSelectedProvider(match);
    }
  }, [initialProviderServiceId, providers]);

  useEffect(() => {
    if (!open) return;
    const id = selectedProvider?.id;
    if (!id) return;
    const shouldTrackView = () => {
      const key = `viewed_provider_${id}`;
      const now = Date.now();
      const ttlMs = 30 * 60 * 1000;
      try {
        const raw = sessionStorage.getItem(key);
        const last = raw ? Number(raw) : null;
        if (last && !Number.isNaN(last) && now - last < ttlMs) return false;
        sessionStorage.setItem(key, String(now));
        return true;
      } catch {
        if (viewedServiceIdsRef.current.has(id)) return false;
        viewedServiceIdsRef.current.add(id);
        return true;
      }
    };

    if (!shouldTrackView()) return;

    void trackProviderEvent(id, "view");
    bumpProviderStat(id, "views_count");
  }, [open, selectedProvider?.id]);

  const getProviderWithRating = (p: ProviderData) => {
    const r = ratings.get(p.id);
    return {
      ...p,
      rating: r?.averageRating || 0,
      rating_count: r?.totalReviews || 0,
    };
  };

  const activeProvider = selectedProvider ? getProviderWithRating(selectedProvider) : null;

  const suggestedProviders: SuggestedProvider[] = useMemo(() => {
    if (!activeProvider) return [];
    return providers
      .filter((p) => p?.id && p.id !== activeProvider.id)
      .slice(0, 12)
      .map((p) => getProviderWithRating(p));
  }, [activeProvider?.id, providers, ratings]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95dvh] flex flex-col bg-background/95 backdrop-blur-sm" dir={dir}>
        <DrawerHeader className="px-4 py-3 shrink-0 border-b bg-background" dir={dir}>
          <div className="flex items-center gap-2">
            {selectedProvider && (
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", rtl ? "-mr-2" : "-ml-2")}
                onClick={() => setSelectedProvider(null)}
              >
                <BackIcon className="h-5 w-5" />
              </Button>
            )}
            <DrawerTitle className="text-base font-semibold truncate flex-1 text-right">
              {selectedProvider
                ? selectedProvider.provider_name
                : service.categoryNameAr || service.titleKey || "المزودين"}
            </DrawerTitle>

            {!selectedProvider && !loading && (
              <div className="text-xs text-muted-foreground font-normal">
                {providers.length} نتيجة
              </div>
            )}

            <button
              type="button"
              aria-label="Close"
              className="h-10 w-10 rounded-full hover:bg-muted transition flex items-center justify-center"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DrawerHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/10 p-4" dir={dir}>
          {activeProvider ? (
            <ProviderDetailView
              provider={activeProvider}
              onToggleFavorite={toggleFavoriteLocal}
              isFavorite={isFavoriteLocal}
              userId={userId}
              onReport={(serviceId, reason) => reportService(serviceId, userId, reason)}
              suggestions={suggestedProviders}
              onOpenSuggestion={(p) => {
                const now = Date.now();
                if (now - lastSuggestionTapAtRef.current < 200) return;
                lastSuggestionTapAtRef.current = now;

                setSelectedProvider(p);

                const el = scrollRef.current;
                if (!el) return;
                if (el.scrollTop < 40) return;
                el.scrollTo({ top: 0, behavior: "smooth" });
              }}
              isRTL={rtl}
            />
          ) : (
            <div className="space-y-3 pb-8">
              {loading && (
                <div className="text-center py-10 text-muted-foreground animate-pulse">
                  جاري التحميل...
                </div>
              )}

              {!loading && error && (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">⚠️</div>
                  <div className="text-muted-foreground">
                    تعذر تحميل المزودين. حاول مرة أخرى.
                  </div>
                </div>
              )}

              {!loading && !error && providers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="text-base font-medium">لا يوجد مزودين حالياً في هذه القائمة</div>
                </div>
              )}

              {providers.map((p) => {
                const openDetails = () => setSelectedProvider(p);

                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={openDetails}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openDetails();
                    }}
                    className="cursor-pointer"
                    style={{ touchAction: "manipulation" }}
                    aria-label="open-provider-details"
                  >
                    <ServiceProviderCard
                      provider={getProviderWithRating(p)}
                      variant="row"
                      isFavorite={isFavoriteLocal(p.id)}
                      onToggleFavorite={() => toggleFavoriteLocal(p.id)}
                      onReport={() => {
                        if (!p?.id) return;
                        reportService(p.id, userId, "");
                      }}
                      // keep passing this too (in case the card already uses it)
                      onDetails={openDetails}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activeProvider && (
          <ProviderActionBar
            provider={activeProvider}
            userId={userId}
            onRequireAuth={() => toast.info("سجل دخولك للإبلاغ")}
            onTrack={(eventType) => bumpProviderStat(activeProvider.id, eventType)}
            onReport={(reason) => {
              if (!activeProvider?.id) return;
              return reportService(activeProvider.id, userId, reason);
            }}
            isRTL={rtl}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function ProviderActionBar({
  provider,
  userId,
  onRequireAuth,
  onTrack,
  onReport,
  isRTL,
}: {
  provider: ProviderData;
  userId: string | null;
  onRequireAuth: () => void;
  onTrack?: (eventType: "call_clicks" | "whatsapp_clicks") => void;
  onReport: (reason: string) => Promise<void> | void;
  isRTL?: boolean;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCall = () => {
    const telLink = getTelLink(String(provider.provider_phone || ""));
    if (telLink === "tel:") return toast.error("لا يوجد رقم هاتف");
    if (provider?.id) {
      void trackProviderEvent(provider.id, "call");
      onTrack?.("call_clicks");
    }
    try {
      window.location.href = telLink;
    } catch {
      window.open(telLink, "_self");
    }
  };

  const handleWhatsapp = () => {
    if (provider.allow_whatsapp === false) return;
    const waLink = getWhatsAppLink(String(provider.provider_phone || ""));
    if (waLink === "https://wa.me/") return toast.error("لا يوجد رقم هاتف");
    if (provider?.id) {
      void trackProviderEvent(provider.id, "whatsapp");
      onTrack?.("whatsapp_clicks");
    }
    try {
      const w = window.open(waLink, "_blank", "noopener,noreferrer");
      if (!w) window.location.href = waLink;
    } catch {
      window.location.href = waLink;
    }
  };

  const submitReport = async () => {
    if (!userId) return onRequireAuth();
    const reason = reportReason.trim();
    if (!reason) return toast.error("اكتب سبب البلاغ");
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onReport(reason));
      toast.success("تم إرسال البلاغ");
      setReportReason("");
      setReportOpen(false);
    } catch {
      toast.error("تعذر إرسال البلاغ");
    } finally {
      setSubmitting(false);
    }
  };

  const allowWhatsapp = provider.allow_whatsapp !== false;

  return (
    <div
      className="shrink-0 border-t bg-background/90 backdrop-blur px-4 py-3"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {/* Lightweight stats row (visible + kept in sync with optimistic bumps) */}
      <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 opacity-70" />
          {Number(provider.views_count || 0)} مشاهدة
        </span>
        <span className="inline-flex items-center gap-1">
          <Phone className="h-3 w-3 opacity-70" />
          {Number(provider.call_clicks || 0)} اتصال
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3 w-3 opacity-70" />
          {Number(provider.whatsapp_clicks || 0)} واتساب
        </span>
      </div>
      <div className="flex gap-3 items-center">
        <Button
          className={cn(
            "h-12 text-base rounded-xl shadow-lg shadow-primary/20",
            allowWhatsapp ? "flex-1" : "flex-[1]"
          )}
          onClick={handleCall}
        >
          <Phone className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> اتصال
        </Button>

        {allowWhatsapp && (
          <Button
            variant="secondary"
            className="h-12 text-base rounded-xl flex-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
            onClick={handleWhatsapp}
          >
            <MessageCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} /> واتساب
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl"
          onClick={() => {
            if (!userId) return onRequireAuth();
            setReportReason("");
            setReportOpen(true);
          }}
          title="إبلاغ"
          aria-label="report"
        >
          <Flag className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
          <DialogDescription className="sr-only">
            {isRTL ? "نموذج إبلاغ عن مشكلة مع مزود الخدمة" : "Report an issue with a service provider"}
          </DialogDescription>
          <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
            <div>
              <div className="text-lg font-bold text-foreground">إبلاغ عن مشكلة</div>
              <div className="text-xs text-muted-foreground mt-1">
                نستخدم البلاغات لتحسين جودة المزودين.
              </div>
            </div>

            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="اكتب سبب البلاغ"
              className="min-h-[90px]"
              maxLength={200}
            />

            <div className="flex gap-2" dir={isRTL ? "rtl" : "ltr"}>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReportOpen(false)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button className="flex-1" onClick={submitReport} disabled={submitting}>
                {submitting ? "جاري الإرسال..." : "إرسال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Detail View Internal Component ---
function ProviderDetailView({
  provider,
  onToggleFavorite,
  isFavorite,
  userId,
  onReport,
  suggestions,
  onOpenSuggestion,
  isRTL,
}: {
  provider: ProviderData;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
  userId?: string | null;
  onReport?: (serviceId: string, reason?: string | null) => Promise<void> | void;
  suggestions?: SuggestedProvider[];
  onOpenSuggestion?: (provider: SuggestedProvider) => void;
  isRTL?: boolean;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const sanitizedDescription = useMemo(() => {
    const raw = (provider.description || "").trim();
    if (!raw) return "";
    const noPhones = raw
      .replace(/\b\+?\d[\d\s\-()]{7,}\d\b/g, "")
      .replace(/\b0\d{8,}\b/g, "");
    const noEmoji = noPhones.replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    );
    const normalized = noEmoji.replace(/\n{3,}/g, "\n\n").trim();
    return normalized;
  }, [provider.description]);

  const [reviews, setReviews] = useState<
    { id: string; rating: number; content: string | null; created_at: string; user_id: string | null }[]
  >([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState<number>(5);
  const [rateText, setRateText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewSeed, setReviewSeed] = useState(1);

  useEffect(() => {
    const fetchImages = async () => {
      const { data } = await supabase
        .from("service_images")
        .select("url")
        .eq("service_id", provider.id)
        .order("position")
        .limit(5);

      const dbImages = (data || []).map((x) => getString(toRecord(x).url)).filter(Boolean) as string[];

      if (dbImages.length === 0 && provider.image_url) {
        let fallback = [provider.image_url];
        if (provider.image_url.startsWith("[")) {
          try {
            fallback = JSON.parse(provider.image_url);
          } catch {
            // ignore
          }
        }
        if (fallback.length === 1 && fallback[0].includes(",")) {
          fallback = fallback[0].split(",").map((s) => s.trim());
        }
        setImages(fallback.filter(Boolean));
      } else {
        setImages(dbImages);
      }
    };
    fetchImages();
  }, [provider.id, provider.image_url]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("service_reviews")
          .select("id,rating,content,created_at,user_id")
          .eq("service_id", provider.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        if (alive) {
          setReviews(
            (data || []).map((raw) => {
              const r = toRecord(raw);
              return {
                id: String(getString(r.id) || ""),
                rating: Number(getNumber(r.rating) || 0),
                content: getString(r.content),
                created_at: String(getString(r.created_at) || ""),
                user_id: getString(r.user_id),
              };
            }).filter((r) => !!r.id)
          );
          setReviewSeed((s) => s + 1);
        }
      } catch {
        if (alive) setReviews([]);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [provider.id]);

  const userReview = useMemo(() => {
    if (!userId) return null;
    return reviews.find((r) => r.user_id === userId) || null;
  }, [reviews, userId]);

  const hasUserRated = !!userReview;

  const randomReviewText = useMemo(() => {
    const pool = reviews
      .map((r) => (r.content || "").trim())
      .filter((t) => t.length > 0);
    const picked = pickOneRandom(pool, reviewSeed);
    if (!picked) return null;
    return picked.length > 90 ? picked.slice(0, 90) + "..." : picked;
  }, [reviews, reviewSeed]);

  const submitReview = async () => {
    if (!userId) return toast.info("سجل دخولك لتقييم الخدمة");
    if (!provider.user_id) return toast.error("تعذر تحديد المزود");
    if (rateStars < 1 || rateStars > 5) return toast.error("اختر التقييم بالنجوم");
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        service_id: provider.id,
        user_id: userId,
        provider_id: provider.user_id,
        rating: rateStars,
        content: rateText.trim() ? rateText.trim().slice(0, 200) : null,
      };

      const { error } = await supabase
        .from("service_reviews")
        .upsert(payload, { onConflict: "service_id,user_id" });
      if (error) throw error;

      toast.success("تم إرسال تقييمك");
      setRateOpen(false);
      setReviewSeed((s) => s + 1);

      try {
        const { data } = await supabase
          .from("service_reviews")
          .select("id,rating,content,created_at,user_id")
          .eq("service_id", provider.id)
          .order("created_at", { ascending: false })
          .limit(20);

        setReviews(
          (data || []).map((r: any) => ({
            id: String(r.id),
            rating: Number(r.rating || 0),
            content: r.content ?? null,
            created_at: String(r.created_at),
            user_id: r.user_id ? String(r.user_id) : null,
          }))
        );
      } catch {
        // ignore
      }
    } catch {
      toast.error("تعذر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24 animate-in slide-in-from-right-4 duration-300">
      {/* 1. Image Gallery */}
      <div className="-mx-4 -mt-4 mb-4">
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-4 px-2 pt-3 hide-scrollbar">
          {(images.length ? images : [null]).map((src, idx) => (
            <div
              key={idx}
              onClick={() => src && setViewerIndex(idx)}
              className="shrink-0 w-[82vw] h-[170px] rounded-2xl overflow-hidden bg-muted snap-center shadow-sm border first:ml-0 cursor-pointer"
            >
              {src ? (
                <img src={src} className="h-full w-full object-cover" alt="" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  لا توجد صور
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Info Card */}
      <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-foreground">{provider.provider_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{provider.title}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full h-9 w-9"
              onClick={() => {
                if (navigator.share) {
                  navigator
                    .share({
                      title: provider.provider_name || "",
                      text: provider.title || "",
                    })
                    .catch(() => {});
                } else {
                  toast.success("تم نسخ الرابط");
                }
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "rounded-full h-9 w-9",
                isFavorite?.(provider.id) &&
                  "border-red-200 bg-red-50 text-red-500 hover:text-red-600"
              )}
              onClick={() => onToggleFavorite?.(provider.id)}
            >
              <Heart
                className={cn("h-4 w-4", isFavorite?.(provider.id) && "fill-current")}
              />
            </Button>
          </div>
        </div>

        {/* Rating summary + rate icon */}
        <div className="flex items-center justify-between gap-3" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-center gap-2 min-w-0">
            {provider.rating_count && provider.rating_count > 0 ? (
              <div className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                <span>{provider.rating.toFixed(1)}</span>
                <Star className="h-4 w-4 fill-current" />
                <span className="text-muted-foreground font-normal ml-1">
                  ({provider.rating_count})
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-md text-sm">
                جديد
              </div>
            )}

            {randomReviewText ? (
              <div className="text-xs text-muted-foreground italic line-clamp-1">
                “{randomReviewText}”
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {reviews.length > 0 ? `${reviews.length} تقييم` : "لا يوجد تقييمات بعد"}
              </div>
            )}
          </div>

          {/* Rate icon */}
          <button
            type="button"
            className={cn(
              "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
              hasUserRated
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-muted-foreground/20 text-muted-foreground hover:text-amber-700 hover:border-amber-200"
            )}
            title={hasUserRated ? "تعديل التقييم" : "قيّم الخدمة"}
            aria-label={hasUserRated ? "edit-rating" : "rate-service"}
            onClick={() => {
              if (!userId) return toast.info("سجل دخولك لتقييم الخدمة");
              setRateStars(userReview?.rating || 5);
              setRateText(userReview?.content || "");
              setRateOpen(true);
              setReviewSeed((s) => s + 1);
            }}
          >
            <Star className={cn("h-4 w-4", hasUserRated && "fill-current")} />
          </button>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1">✓ رقم هاتف حقيقي</span>
          <span className="rounded-md bg-muted px-2 py-1">✓ مزود نشط</span>
          {provider.city ? (
            <span className="rounded-md bg-muted px-2 py-1">{provider.city}</span>
          ) : null}
        </div>

        {provider.price && provider.price > 0 && (
          <div className="pt-2 border-t mt-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">السعر المبدئي</span>
            <span className="text-lg font-bold text-primary">{provider.price} د.ل</span>
          </div>
        )}
      </div>

      {/* 3. Description (tap to expand) */}
      {sanitizedDescription ? (
        <div className="mt-4 bg-card rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold mb-2 text-sm text-foreground">التفاصيل</h3>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setDescExpanded((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setDescExpanded((v) => !v);
            }}
            className="relative cursor-pointer select-none"
            aria-expanded={descExpanded}
          >
            <p
              className={cn(
                "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all duration-150",
                // FIX: expanded should show full text (no clamp)
                descExpanded ? "" : "line-clamp-2"
              )}
            >
              {sanitizedDescription}
            </p>
            {!descExpanded && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" aria-hidden="true" />
            )}
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            {descExpanded ? "اضغط لإغلاق" : "اضغط لقراءة المزيد"}
          </div>
        </div>
      ) : null}

      {/* 4. Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2" dir={isRTL ? "rtl" : "ltr"}>
            <div className="text-sm font-semibold text-foreground">اقتراحات</div>
            <div className="text-xs text-muted-foreground">{suggestions.length} مزود</div>
          </div>

          <div 
            className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
          >
            {suggestions.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenSuggestion?.(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSuggestion?.(s);
                }}
                className="shrink-0 w-[68vw] max-w-[320px] snap-center text-right cursor-pointer focus:outline-none"
                style={{ touchAction: "manipulation" }}
              >
                <div className="rounded-2xl border bg-card overflow-hidden shadow-sm active:scale-[0.99] transition-transform">
                  <div className="h-[110px] bg-muted">
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                        بدون صورة
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm text-foreground line-clamp-1">
                      {s.provider_name}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {s.title}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="line-clamp-1">{s.city || ""}</span>
                      {typeof s.rating === "number" && s.rating > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" /> {s.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate Dialog */}
      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
          <DialogDescription className="sr-only">
            {isRTL ? "نموذج تقييم خدمة المزود" : "Rate a service provider"}
          </DialogDescription>
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-foreground">تقييم الخدمة</div>
              <div className="text-xs text-muted-foreground mt-1">
                اختر عدد النجوم واكتب تعليق (اختياري)
              </div>
            </div>

            <div className="flex items-center gap-1 text-amber-600" dir={isRTL ? "rtl" : "ltr"}>
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                return (
                  <button
                    key={v}
                    type="button"
                    className="p-1"
                    onClick={() => setRateStars(v)}
                    aria-label={`rate-${v}`}
                  >
                    <Star className={cn("h-7 w-7", v <= rateStars ? "fill-current" : "opacity-30")} />
                  </button>
                );
              })}
            </div>

            <Textarea
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
              placeholder="اكتب رأيك (اختياري)"
              className="min-h-[100px]"
              maxLength={200}
            />

            <div className="flex gap-2" dir={isRTL ? "rtl" : "ltr"}>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRateOpen(false)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button className="flex-1" onClick={submitReview} disabled={submitting}>
                {submitting ? "جاري الإرسال..." : "إرسال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Screen Viewer */}
      <Dialog open={viewerIndex !== null} onOpenChange={(o) => !o && setViewerIndex(null)}>
        <DialogContent className="max-w-[100vw] h-[100dvh] p-0 border-none bg-black flex flex-col justify-center">
          <DialogDescription className="sr-only">
            {isRTL ? "عرض صورة بحجم كامل" : "Full screen image viewer"}
          </DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              onClick={() => setViewerIndex(null)}
            >
              <X className="h-6 w-6" />
            </button>
            {viewerIndex !== null && images[viewerIndex] && (
              <img
                src={images[viewerIndex]}
                className="max-w-full max-h-full object-contain"
                alt=""
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ServiceDetailSheet;
