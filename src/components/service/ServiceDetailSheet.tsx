import { useEffect, useMemo, useState } from "react";
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
import { useReviews, useServiceRatings } from "@/hooks/useReviews";
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
            "id,user_id,title,description,category,city,sub_city,provider_name,provider_phone,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
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
          user_id: r.user_id ?? null,
          title: r.title ?? null,
          description: r.description ?? null,
          category: r.category ?? null,
          city: r.city ?? null,
          sub_city: r.sub_city ?? null,
          provider_name: r.provider_name ?? null,
          provider_phone: r.provider_phone ?? null,
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
          .in("business_id", ids as any);

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
          .eq("business_id", providerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_businesses")
          .insert({ user_id: userId, business_id: providerId });
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

  // ---- Reports (functional)
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportSending, setReportSending] = useState(false);

  const openReportDialog = (serviceId: string) => {
    setReportTargetId(serviceId);
    setReportReason("");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportTargetId) return;
    if (reportSending) return;

    setReportSending(true);
    try {
      const payload = {
        reporter_id: userId ?? null,
        reported_service_id: reportTargetId,
        report_type: "service",
        reason: (reportReason || "").trim() || "بلاغ",
        status: "pending",
      } as any;

      const { error } = await supabase.from("user_reports").insert(payload);
      if (error) throw error;

      toast.success("تم إرسال البلاغ");
      setReportOpen(false);
    } catch {
      toast.error("تعذر إرسال البلاغ");
    } finally {
      setReportSending(false);
    }
  };

  // Sync Initial Selection
  useEffect(() => {
    if (initialProviderServiceId && providers.length > 0) {
      const match = providers.find((p) => p.id === initialProviderServiceId);
      if (match) setSelectedProvider(match);
    }
  }, [initialProviderServiceId, providers]);

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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
          {activeProvider ? (
            <ProviderDetailView
              provider={activeProvider}
              onToggleFavorite={toggleFavoriteLocal}
              isFavorite={isFavoriteLocal}
              userId={userId}
              onReport={(serviceId) => openReportDialog(serviceId)}
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
                    openReportDialog(p.id);
                  }}
                  onDetails={() => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Report Dialog (functional) */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl" dir="rtl">
            <div className="space-y-4">
              <div>
                <div className="text-lg font-bold text-foreground">إبلاغ</div>
                <div className="text-xs text-muted-foreground mt-1">
                  اكتب سبب البلاغ (اختياري). سيتم إرساله للمراجعة.
                </div>
              </div>

              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="سبب البلاغ..."
                className="min-h-[90px]"
                maxLength={300}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReportOpen(false)}
                  disabled={reportSending}
                >
                  إلغاء
                </Button>
                <Button className="flex-1" onClick={submitReport} disabled={reportSending}>
                  {reportSending ? "جاري الإرسال..." : "إرسال"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DrawerContent>
    </Drawer>
  );
}

// --- Detail View Internal Component ---
function ProviderDetailView({
  provider,
  onToggleFavorite,
  isFavorite,
  userId,
  onReport,
}: {
  provider: ProviderData;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
  userId?: string | null;
  onReport?: (serviceId: string) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Reviews (DB-backed) + rating submission
  const {
    reviews: fullReviews,
    submitReview: submitReviewHook,
    loading: reviewsLoading,
  } = useReviews(provider.id);

  // We need the provider account id for reviews. It usually exists on services.user_id.
  const [providerAccountId, setProviderAccountId] = useState<string | null>(
    (provider as any).user_id ? String((provider as any).user_id) : null
  );

  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState<number>(5);
  const [rateText, setRateText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // If providerAccountId is missing (legacy rows), fetch it once.
  useEffect(() => {
    if (providerAccountId) return;
    let alive = true;
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("user_id")
          .eq("id", provider.id)
          .maybeSingle();
        if (error) throw error;
        const id = data?.user_id ? String(data.user_id) : null;
        if (alive) setProviderAccountId(id);
      } catch {
        if (alive) setProviderAccountId(null);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [provider.id, providerAccountId]);

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

  const reviewsForUi = useMemo(() => {
    return (fullReviews || []).map((r: any) => ({
      id: String(r.id),
      rating: Number(r.rating || 0),
      review_text: (r.content ?? null) as string | null,
      created_at: String(r.created_at),
    }));
  }, [fullReviews]);

  const handleCall = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    const digits = provider.provider_phone.replace(/[^\d]/g, "");
    if (digits) window.open(`https://wa.me/${digits}`, "_blank");
  };

  const submitReview = async () => {
    if (rateStars < 1 || rateStars > 5) return toast.error("اختر التقييم بالنجوم");
    if (submitting) return;
    if (!providerAccountId) return toast.error("تعذر تحديد المزود للتقييم");

    setSubmitting(true);
    try {
      const { error } = await submitReviewHook({
        rating: rateStars,
        content: rateText,
        providerId: providerAccountId,
      } as any);

      if (error) throw error;
      toast.success("تم إرسال تقييمك");
      setRateOpen(false);
    } catch {
      toast.error("تعذر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-4 animate-in slide-in-from-right-4 duration-300">
      {/* 1. Image Gallery */}
      <div className="-mx-4 -mt-4 mb-4">
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-4 px-2 pt-3 hide-scrollbar">
          {(images.length ? images : [null]).map((src, idx) => (
            <div
              key={idx}
              onClick={() => src && setViewerIndex(idx)}
              className="shrink-0 w-[92vw] aspect-video rounded-2xl overflow-hidden bg-muted snap-center shadow-sm border first:ml-0 cursor-pointer"
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
      <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
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
              variant="ghost"
              className="rounded-full h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => onReport?.(provider.id)}
              title="إبلاغ"
              aria-label="إبلاغ"
            >
              <Flag className="h-4 w-4" />
            </Button>
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

        <div className="flex items-center gap-3 text-sm flex-wrap">
          {provider.rating ? (
            <div className="flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
              <span>{provider.rating.toFixed(1)}</span>
              <Star className="h-4 w-4 fill-current" />
              <span className="text-muted-foreground font-normal ml-1">
                ({provider.rating_count})
              </span>
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              جديد
            </div>
          )}

          {provider.city && (
            <div className="text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {provider.city}
            </div>
          )}
        </div>

        {/* Rate + Random Reviews */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="h-9 rounded-xl text-sm"
            onClick={() => {
              setRateStars(5);
              setRateText("");
              setRateOpen(true);
            }}
          >
            قيم الخدمة
          </Button>

          <div className="text-xs text-muted-foreground">
            {reviewsLoading
              ? "..."
              : reviews.length > 0
              ? `${reviews.length} تقييم`
              : "لا يوجد تقييمات بعد"}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="rounded-xl bg-muted/30 border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">آراء العملاء</div>
            <div className="space-y-2">
              {pickRandomReviews(reviews, 2).map((r) => (
                <div key={r.id} className="rounded-lg bg-background border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-600">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < r.rating ? "fill-current" : "opacity-30"
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ar-LY")}
                    </div>
                  </div>
                  {r.review_text ? (
                    <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {r.review_text}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

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
      {provider.description && (
        <div className="mt-4 bg-card rounded-2xl border p-5 shadow-sm">
          <h3 className="font-semibold mb-2 text-sm text-foreground">التفاصيل</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {provider.description}
          </p>
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

      {/* 4. Contact Footer */}
      <div className="mt-6 sticky bottom-0 bg-background/80 backdrop-blur p-4 -mx-4 border-t z-10" dir="rtl">
        <div className="flex gap-3">
          <Button
            className="h-12 text-base rounded-xl shadow-lg shadow-primary/20 flex-1"
            onClick={handleCall}
          >
            <Phone className="ml-2 h-4 w-4" /> اتصال
          </Button>
          <Button
            variant="secondary"
            className="h-12 text-base rounded-xl flex-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
            onClick={handleWhatsapp}
          >
            <MessageCircle className="ml-2 h-4 w-4" /> واتساب
          </Button>
        </div>
      </div>

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
