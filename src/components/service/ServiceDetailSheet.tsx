import { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  ChevronRight,
  Heart,
  Share2,
  X,
  Star,
  Flag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServiceRatings } from "@/hooks/useReviews";
import { Dialog, DialogContent } from "@/components/ui/dialog";
// Ensure you import the Card and Type from the file we created previously
import { ServiceProviderCard, ProviderData } from "./ServiceProviderCard";

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
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;
};

type SuggestedProvider = ProviderData;

function pickRandomReviews<T>(arr: T[], n: number): T[] {
  if (!arr || arr.length === 0) return [];
  const copy = arr.slice();
  // Fisher-Yates shuffle (small n, small arrays)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function pickOneRandom<T>(arr: T[], seed: number): T | null {
  if (!arr || arr.length === 0) return null;
  // Deterministic-ish per seed to avoid “changing every render”.
  const idx = Math.abs(seed) % arr.length;
  return arr[idx] ?? null;
}

// --- Hook: Robust Data Fetching (Restored Logic) ---
function useSheetData(open: boolean, service: SheetService, city?: string | null) {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const escOrValue = (v: string) => {
          const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          return `"${escaped}"`;
        };

        const categoryVal = (service?.category ?? "").trim();
        // Construct Category Filter
        const categoryOr = categoryVal ? `category.eq.${escOrValue(categoryVal)}` : "";

        // Construct City Filter (Handle AR/EN variants)
        let cityOr = "";
        const cityVal = (city || "").trim();
        if (cityVal) {
          const cityNames = new Set<string>();
          cityNames.add(cityVal);

          try {
            // Check DB for Arabic/English synonyms
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
            "id,user_id,title,description,category,city,sub_city,provider_name,provider_phone,allow_whatsapp,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
          )
          .order("is_featured", { ascending: false })
          .order("views_count", { ascending: false });

        // Helper to run query in Strict or Permissive mode
        const runQuery = async (mode: "strict" | "permissive") => {
          let q = base;

          if (mode === "strict") {
            q = q
              .eq("is_visible", true)
              .eq("is_active", true)
              .eq("is_paused", false)
              .eq("approval_status", "approved");
          } else {
            // Permissive: allow NULLs or non-approved for dev/legacy data
            q = q
              .or("is_visible.eq.true,is_visible.is.null")
              .or("is_active.eq.true,is_active.is.null")
              .or("is_paused.eq.false,is_paused.is.null")
              .or("approval_status.eq.approved,approval_status.is.null");
          }

          if (categoryOr) q = q.or(categoryOr);
          if (cityOr) q = q.or(cityOr);

          return await q;
        };

        // 1. Try Strict
        let { data, error } = await runQuery("strict");
        if (error) throw error;

        // 2. Fallback to Permissive if no data found
        if (!data || data.length === 0) {
          const res = await runQuery("permissive");
          data = res.data;
          error = res.error;
          if (error) throw error;
        }

        // 3. Normalize Data
        const rows = (data || []) as any[];
        const normalizedBase: ProviderData[] = rows.map((r) => ({
          id: String(r.id),
          user_id: r.user_id ? String(r.user_id) : null,
          title: r.title ?? null,
          description: r.description ?? null,
          category: r.category ?? null,
          city: r.city ?? null,
          sub_city: r.sub_city ?? null,
          provider_name: r.provider_name ?? null,
          provider_phone: r.provider_phone ?? null,
          allow_whatsapp: r.allow_whatsapp ?? true,
          image_url: r.image_url ?? null,
          image_urls: null, // You can populate this from image_url parsing if needed
          price: r.price,
          is_active: r.is_active ?? null,
          approval_status: r.approval_status ?? null,
          reviews: undefined,
        }));

        // Attach lightweight review snippets (for cards) from DB (best-effort).
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
            (revs || []).forEach((r: any) => {
              const sid = String(r.service_id);
              const txt = (r.content ?? "").trim();
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
        if (alive) setProviders([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [open, service.category, city]);

  return { providers, loading };
}

// --- Main Component ---
export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  city,
  initialProviderServiceId,
  onToggleFavorite,
  isFavorite,
}: Props) {
  // Use the robust hook
  const { providers, loading } = useSheetData(open, service, city);
  
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  // Prevent double-counting "view" during a single sheet open.
  const viewedServiceIdsRef = useRef<Set<string>>(new Set());

  // The scrollable container inside the drawer (NOT window). We must scroll this to top
  // when switching providers via Suggestions so the user instantly sees the new provider.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSuggestionTapAtRef = useRef<number>(0);

  // ---- Favorites (fallback wiring)
  // If the parent doesn't provide favorite handlers, we make favorites work here using Supabase.
  const [userId, setUserId] = useState<string | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  
  // Ratings Hook
  const serviceIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const { ratings } = useServiceRatings(serviceIds);

  // Load auth user (best-effort)
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

  // Fetch favorites for the visible providers (only when we manage favorites internally)
  useEffect(() => {
    if (!open) return;
    if (onToggleFavorite || isFavorite) return; // parent manages it
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
      // revert optimistic update
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
    if (!reporterId) return toast.info("سجل دخولك للإبلاغ");
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

  // Sync Initial Selection
  useEffect(() => {
    if (initialProviderServiceId && providers.length > 0) {
      const match = providers.find((p) => p.id === initialProviderServiceId);
      if (match) setSelectedProvider(match);
    }
  }, [initialProviderServiceId, providers]);

  // Track a provider view when a provider becomes active (best-effort, no UI dependency).
  useEffect(() => {
    if (!open) return;
    const id = selectedProvider?.id;
    if (!id) return;
    if (viewedServiceIdsRef.current.has(id)) return;
    viewedServiceIdsRef.current.add(id);
    supabase.rpc("record_service_event", { p_service_id: id, p_event_type: "view" } as any).catch(() => {});
  }, [open, selectedProvider?.id]);

  // Helper to merge ratings into provider object
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
    // Suggest other providers from the same list (same category/city filter), excluding the active one.
    // Keep it small to avoid overwhelming the user.
    return providers
      .filter((p) => p?.id && p.id !== activeProvider.id)
      .slice(0, 12)
      .map((p) => getProviderWithRating(p));
  }, [activeProvider?.id, providers, ratings]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95dvh] flex flex-col bg-background/95 backdrop-blur-sm" dir="rtl">
        {/* Header */}
        <DrawerHeader className="px-4 py-3 shrink-0 border-b bg-background">
          <div className="flex items-center gap-2">
            {selectedProvider && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2"
                onClick={() => setSelectedProvider(null)}
              >
                <ChevronRight className="h-5 w-5" />
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
          </div>
        </DrawerHeader>

        {/* Body Content (scrollable) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/10 p-4">
          {activeProvider ? (
            <ProviderDetailView
              provider={activeProvider}
              onToggleFavorite={toggleFavoriteLocal}
              isFavorite={isFavoriteLocal}
              userId={userId}
              onReport={(serviceId, reason) => reportService(serviceId, userId, reason)}
              suggestions={suggestedProviders}
              onOpenSuggestion={(p) => {
                // Prevent rapid taps from fighting scroll / state.
                const now = Date.now();
                if (now - lastSuggestionTapAtRef.current < 200) return;
                lastSuggestionTapAtRef.current = now;

                setSelectedProvider(p);

                // Scroll the drawer content to top so the change is obvious to the user.
                // Important: this is NOT window scroll.
                const el = scrollRef.current;
                if (!el) return;
                if (el.scrollTop < 40) return;
                el.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : (
            <div className="space-y-3 pb-8">
              {loading && (
                <div className="text-center py-10 text-muted-foreground animate-pulse">
                  جاري التحميل...
                </div>
              )}

              {!loading && providers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  لا يوجد مزودين حالياً في هذه القائمة
                </div>
              )}

              {providers.map((p) => (
                <ServiceProviderCard
                  key={p.id}
                  provider={getProviderWithRating(p)}
                  variant="row"
                  isFavorite={isFavoriteLocal(p.id)}
                  onToggleFavorite={() => toggleFavoriteLocal(p.id)}
                  onReport={() => {
                    // report from list (small action)
                    if (!p?.id) return;
                    reportService(p.id, userId, "");
                  }}
                  onDetails={() => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fixed-in-drawer action bar (does NOT scroll) */}
        {activeProvider && (
          <ProviderActionBar
            provider={activeProvider}
            userId={userId}
            onRequireAuth={() => toast.info("سجل دخولك للإبلاغ")}
            onReport={(reason) => {
              if (!activeProvider?.id) return;
              return reportService(activeProvider.id, userId, reason);
            }}
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
  onReport,
}: {
  provider: ProviderData;
  userId: string | null;
  onRequireAuth: () => void;
  onReport: (reason: string) => Promise<void> | void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCall = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    // Best-effort tracking (doesn't block the call)
    if (provider?.id) {
      supabase.rpc("record_service_event", { p_service_id: provider.id, p_event_type: "call" } as any).catch(() => {});
    }
    window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = () => {
    if (provider.allow_whatsapp === false) return;
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    const digits = provider.provider_phone.replace(/[^\d]/g, "");
    // Best-effort tracking (doesn't block WhatsApp)
    if (provider?.id) {
      supabase.rpc("record_service_event", { p_service_id: provider.id, p_event_type: "whatsapp" } as any).catch(() => {});
    }
    if (digits) window.open(`https://wa.me/${digits}`, "_blank");
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
      dir="rtl"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex gap-3 items-center">
        <Button
          className={cn(
            "h-12 text-base rounded-xl shadow-lg shadow-primary/20",
            allowWhatsapp ? "flex-1" : "flex-[1]"
          )}
          onClick={handleCall}
        >
          <Phone className="ml-2 h-4 w-4" /> اتصال
        </Button>

        {allowWhatsapp && (
          <Button
            variant="secondary"
            className="h-12 text-base rounded-xl flex-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
            onClick={handleWhatsapp}
          >
            <MessageCircle className="ml-2 h-4 w-4" /> واتساب
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
          <div className="space-y-4" dir="rtl">
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

            <div className="flex gap-2" dir="rtl">
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
}: {
  provider: ProviderData;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
  userId?: string | null;
  onReport?: (serviceId: string, reason?: string | null) => Promise<void> | void;
  suggestions?: SuggestedProvider[];
  onOpenSuggestion?: (provider: SuggestedProvider) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const sanitizedDescription = useMemo(() => {
    const raw = (provider.description || "").trim();
    if (!raw) return "";
    // Remove phone-like patterns and emojis to keep layout clean
    const noPhones = raw
      .replace(/\b\+?\d[\d\s\-()]{7,}\d\b/g, "")
      .replace(/\b0\d{8,}\b/g, "");
    const noEmoji = noPhones.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    const normalized = noEmoji.replace(/\n{3,}/g, "\n\n").trim();
    return normalized;
  }, [provider.description]);


  // Reviews + rating submission
  const [reviews, setReviews] = useState<
    { id: string; rating: number; content: string | null; created_at: string; user_id: string | null }[]
  >([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState<number>(5);
  const [rateText, setRateText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewSeed, setReviewSeed] = useState(1);

  // Fetch specific images for detail view
  useEffect(() => {
    const fetchImages = async () => {
      // 1. Try fetching from service_images table
      const { data } = await supabase
        .from("service_images")
        .select("url")
        .eq("service_id", provider.id)
        .order("position")
        .limit(5);

      const dbImages = data?.map((x: any) => x.url) || [];

      // 2. Fallback to parsing image_url
      if (dbImages.length === 0 && provider.image_url) {
        let fallback = [provider.image_url];
        if (provider.image_url.startsWith("[")) {
          try {
            fallback = JSON.parse(provider.image_url);
          } catch {}
        }
        // Handle comma separated
        if (fallback.length === 1 && fallback[0].includes(",")) {
            fallback = fallback[0].split(",").map(s => s.trim());
        }
        setImages(fallback.filter(Boolean));
      } else {
        setImages(dbImages);
      }
    };
    fetchImages();
  }, [provider.id, provider.image_url]);

  // Fetch latest reviews (best-effort) for the random reviews section and count.
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
            (data || []).map((r: any) => ({
              id: String(r.id),
              rating: Number(r.rating || 0),
              content: r.content ?? null,
              created_at: String(r.created_at),
              user_id: r.user_id ? String(r.user_id) : null,
            }))
          );
          // Randomize on open / refresh.
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

  const handleCall = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = () => {
    if (provider.allow_whatsapp === false) return;
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    const digits = provider.provider_phone.replace(/[^\d]/g, "");
    if (digits) window.open(`https://wa.me/${digits}`, "_blank");
  };

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

      // Allow re-rating: relies on UNIQUE(service_id, user_id)
      const { error } = await supabase
        .from("service_reviews")
        .upsert(payload, { onConflict: "service_id,user_id" });
      if (error) throw error;

      toast.success("تم إرسال تقييمك");
      setRateOpen(false);
      setReviewSeed((s) => s + 1);

      // Refresh reviews list (best-effort)
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
            <h1 className="text-xl font-bold text-foreground">
              {provider.provider_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{provider.title}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="rounded-full h-9 w-9"
              onClick={() => {
                // Share Logic placeholder
                if (navigator.share) {
                    navigator.share({ 
                        title: provider.provider_name || "", 
                        text: provider.title || "" 
                    }).catch(() => {});
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
                className={cn(
                  "h-4 w-4",
                  isFavorite?.(provider.id) && "fill-current"
                )}
              />
            </Button>
          </div>
        </div>

        {/* Rating summary + rate icon */}
        <div className="flex items-center justify-between gap-3" dir="rtl">
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

            {/* Random 1-line review snippet */}
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

          {/* Rate icon (symbol) */}
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
              // change snippet on intent
              setReviewSeed((s) => s + 1);
            }}
          >
            <Star className={cn("h-4 w-4", hasUserRated && "fill-current")} />
          </button>
        </div>

        {/* Trust strip (minimal) */}
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
             <span className="text-lg font-bold text-primary">
               {provider.price} د.ل
             </span>
          </div>
        )}
      </div>

      {/* 3. Description */}
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
                descExpanded ? "line-clamp-6" : "line-clamp-2"
              )}
            >
              {sanitizedDescription}
            </p>
            {!descExpanded && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            {descExpanded ? "اضغط لإغلاق" : "اضغط لقراءة المزيد"}
          </div>
        </div>
      ) : null}

      {/* 4. Suggestions: other providers in the same list (horizontal scroll) */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2" dir="rtl">
            <div className="text-sm font-semibold text-foreground">اقتراحات</div>
            <div className="text-xs text-muted-foreground">{suggestions.length} مزود</div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory">
            {suggestions.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenSuggestion?.(s)}
                // Mobile Safari sometimes misses click events inside horizontal scrollers.
                // PointerUp is more reliable.
                onPointerUp={() => onOpenSuggestion?.(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSuggestion?.(s);
                }}
                className="shrink-0 w-[68vw] max-w-[320px] snap-center text-right cursor-pointer focus:outline-none"
                style={{ touchAction: "pan-x" }}
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
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-foreground">تقييم الخدمة</div>
              <div className="text-xs text-muted-foreground mt-1">اختر عدد النجوم واكتب تعليق (اختياري)</div>
            </div>

            <div className="flex items-center gap-1 text-amber-600" dir="rtl">
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

            <div className="flex gap-2" dir="rtl">
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
      <Dialog
        open={viewerIndex !== null}
        onOpenChange={(o) => !o && setViewerIndex(null)}
      >
        <DialogContent className="max-w-[100vw] h-[100dvh] p-0 border-none bg-black flex flex-col justify-center">
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
