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
  ChevronRight,
  Heart,
  Share2,
  X,
  Star,
  Flag,
  MapPin,
  Tag,
  Shield,
  ImageOff,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServiceRatings } from "@/hooks/useReviews";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
export function useSheetData(open: boolean, service: SheetService, city?: string | null) {
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

        // Match services.category by primary name and, when available, name_ar (so services stored in either language show)
        const primary = service?.category ? normalizeCategory(service.category) : "";
        const alt = (service?.categoryNameAr && normalizeCategory(service.categoryNameAr) !== primary)
          ? normalizeCategory(service.categoryNameAr)
          : "";
        const categoryValues = [primary, alt].filter(Boolean);
        const categoryOr = categoryValues.length > 0
          ? categoryValues.map((v) => `category.eq.${escOrValue(v)}`).join(",")
          : "";

        // DEV: Log filter values for debugging (console only, no UI)
        if (import.meta.env?.DEV || import.meta.env?.MODE === "development") {
          console.log("[ServiceDetailSheet] Filter values:", {
            category: primary || "(empty)",
            categoryAr: alt || "(none)",
            city: city || "(empty)",
            categoryFilter: categoryOr || "(none)",
          });
        }

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

          const cityArray = Array.from(cityNames).filter(Boolean);
          if (cityArray.length > 0) {
            cityOr = cityArray
              .map((n) => `city.eq.${escOrValue(n)}`)
              .join(",");
          }
        }

        const baseWithCity = supabase
          .from("services")
          .select(
            "id,user_id,title,description,category,city,sub_city,provider_name,provider_phone,allow_whatsapp,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
          )
          .order("is_featured", { ascending: false })
          .order("views_count", { ascending: false });

        const baseNoCity = supabase
          .from("services")
          .select(
            "id,user_id,title,description,category,provider_name,provider_phone,allow_whatsapp,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
          )
          .order("is_featured", { ascending: false })
          .order("views_count", { ascending: false });

        const runQuery = async (
          mode: "strict" | "permissive",
          allowCityFilter: boolean
        ) => {
          let q: any = allowCityFilter ? baseWithCity : baseNoCity;

          if (mode === "strict") {
            q = q
              .eq("is_visible", true)
              .eq("is_active", true)
              .eq("is_paused", false)
              .eq("approval_status", "approved")
              .is("deleted_at", null);
          } else {
            q = q
              .or("is_visible.eq.true,is_visible.is.null")
              .or("is_active.eq.true,is_active.is.null")
              .or("is_paused.eq.false,is_paused.is.null")
              .or("approval_status.eq.approved,approval_status.is.null")
              .is("deleted_at", null);
          }

          // Filter by category name (matches services.category column exactly)
          if (categoryOr) {
            q = q.or(categoryOr);
          }
          if (allowCityFilter && cityOr) q = q.or(cityOr);

          return await q;
        };

        let allowCityFilter = true;
        let { data, error } = await runQuery("strict", allowCityFilter);
        if (error) {
          const msg = String((error as any)?.message || error);
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
          if ((!data || data.length === 0) && allowCityFilter && cityOr) {
            allowCityFilter = false;
            res = await runQuery("permissive", allowCityFilter);
            data = res.data;
            error = res.error;
          }

          if (error) throw error;

          // DEV: Log empty result (console only, no UI)
          if ((!data || data.length === 0) && (import.meta.env?.DEV || import.meta.env?.MODE === "development")) {
            console.warn("[ServiceDetailSheet] No providers found with filters:", {
              categoryFilter: categoryOr || "(none)",
              cityFilter: cityOr || "(none)",
              allowCityFilter,
            });
          }
        }

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
          image_urls: null,
          price: r.price,
          is_active: r.is_active ?? null,
          approval_status: r.approval_status ?? null,
          reviews: undefined,
        }));

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

  return { providers, loading, error };
}

/** Listing-style single-service layout (buy-and-sell style): image → price+share → title → provider card → description → details → similar */
function ServiceDetailListingStyle({
  provider,
  service,
  suggestions,
  userId,
  onToggleFavorite,
  isFavorite,
  onReport,
}: {
  provider: ProviderData & { rating?: number; rating_count?: number };
  service: SheetService;
  suggestions: (ProviderData & { rating?: number; rating_count?: number })[];
  userId: string | null;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
  onReport?: (serviceId: string, reason?: string | null) => void;
}) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [images, setImages] = useState<string[]>([]);
  const [reviews, setReviews] = useState<{ user_id: string | null; rating?: number; content?: string | null }[]>([]);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState(5);
  const [rateText, setRateText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("service_images")
        .select("url")
        .eq("service_id", provider.id)
        .order("position")
        .limit(5);
      const dbImages = (data?.map((x: any) => x.url) || []) as string[];
      if (dbImages.length === 0 && provider.image_url) {
        let fallback = [provider.image_url];
        if (typeof provider.image_url === "string" && provider.image_url.startsWith("[")) {
          try {
            fallback = JSON.parse(provider.image_url);
          } catch {
            /**/
          }
        }
        if (fallback.length === 1 && typeof fallback[0] === "string" && fallback[0].includes(",")) {
          fallback = fallback[0].split(",").map((s) => String(s).trim());
        }
        setImages(fallback.filter(Boolean));
      } else {
        setImages(dbImages);
      }
    };
    run();
  }, [provider.id, provider.image_url]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("service_reviews")
      .select("user_id,rating,content")
      .eq("service_id", provider.id)
      .then(({ data }) => {
        if (alive) setReviews((data || []) as { user_id: string | null; rating?: number; content?: string | null }[]);
      });
    return () => {
      alive = false;
    };
  }, [provider.id]);

  const userReview = userId ? reviews.find((r) => r.user_id === userId) : null;
  const hasPrice = provider.price != null && provider.price !== undefined && provider.price > 0;
  const priceText = hasPrice ? `${provider.price} ${t("د.ل", "LYD")}` : "";

  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: provider.provider_name || "", text: provider.title || "" }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/services/service/${provider.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("تم نسخ الرابط", "Link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("فشل النسخ", "Failed to copy"));
    }
  };

  const submitReview = async () => {
    if (!userId || !provider.user_id) return;
    if (rateStars < 1 || rateStars > 5) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("service_reviews").upsert(
        {
          service_id: provider.id,
          user_id: userId,
          provider_id: provider.user_id,
          rating: rateStars,
          content: rateText.trim().slice(0, 200) || null,
        },
        { onConflict: "service_id,user_id" }
      );
      if (error) throw error;
      toast.success(t("تم إرسال تقييمك", "Thanks for your review!"));
      setRateOpen(false);
      const { data } = await supabase.from("service_reviews").select("user_id,rating,content").eq("service_id", provider.id);
      setReviews((data || []) as { user_id: string | null; rating?: number; content?: string | null }[]);
    } catch {
      toast.error(t("تعذر إرسال التقييم", "Failed to save review"));
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (provider.provider_name || "P")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="overflow-x-hidden max-w-full w-full">
      {/* 1. Image carousel (same structure as ListingDetailSheet) */}
      {images.length > 0 ? (
        <div className="relative -mx-4 -mt-4 mb-6">
          <div
            ref={carouselRef}
            className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], touchAction: "pan-x pan-y" }}
            dir={isRTL ? "rtl" : "ltr"}
            onScroll={() => {
              const el = carouselRef.current;
              if (!el) return;
              const w = el.clientWidth || 1;
              const left = Math.abs(el.scrollLeft);
              const idx = Math.max(0, Math.min(images.length - 1, Math.round(left / w)));
              setActiveIndex(idx);
            }}
          >
            {images.map((src, idx) => (
              <div key={idx} className="w-full shrink-0 snap-center">
                <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" loading={idx === 0 ? "eager" : "lazy"} />
                </div>
              </div>
            ))}
          </div>
          <div className={cn("absolute top-3 text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md", isRTL ? "right-3" : "left-3")}>
            {t("خدمة", "SERVICE")}
          </div>
          {images.length > 1 ? (
            <div className={cn("absolute top-3 text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md", isRTL ? "left-3" : "right-3")}>
              {activeIndex + 1}/{images.length}
            </div>
          ) : null}
          {images.length > 1 ? (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={cn("h-2 rounded-full transition-all bg-white/70", i === activeIndex ? "w-6" : "w-2")}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 space-y-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      {/* 2. Share + Copy link row (under photo) */}
      <div className="flex gap-3">
        <Button size="lg" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          {t("مشاركة", "Share")}
        </Button>
        <Button size="lg" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleCopyLink}>
          <Copy className="h-4 w-4" />
          {copied ? t("تم النسخ!", "Copied!") : t("نسخ الرابط", "Copy Link")}
        </Button>
      </div>

      {/* 3. Price — only when price is available */}
      {hasPrice ? (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("السعر", "Price")}</p>
          <div className="text-3xl font-bold text-foreground">{priceText}</div>
        </div>
      ) : null}

      {/* 4. Title */}
      <h1 className="text-2xl font-bold text-foreground leading-tight">
        {provider.title || service.titleKey || provider.provider_name || ""}
      </h1>

      {/* 5. Provider card (Seller-style) — avatar, name, verified only; reviews moved to separate section */}
      <div className="bg-muted/40 rounded-2xl p-5 border border-border/50">
        <div className="text-sm font-semibold text-muted-foreground mb-3">{t("المزود", "Provider")}</div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={(provider as any).provider_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">{provider.provider_name || t("مزود", "Provider")}</p>
                <Shield className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">{t("موثوق", "Verified")}</Badge>
        </div>
      </div>

      {/* 6. Reviews — dedicated section for rating and “Leave a review” */}
      <div className="bg-muted/40 rounded-2xl p-5 border border-border/50 space-y-3">
        <div className="text-sm font-semibold text-muted-foreground">{t("التقييمات", "Reviews")}</div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(provider.rating_count ?? 0) > 0 ? (
              <>
                <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span>{Number(provider.rating ?? 0).toFixed(1)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  ({provider.rating_count} {t("تقييم", "reviews")})
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{t("لا توجد تقييمات بعد", "No reviews yet")}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => {
              if (userReview) {
                setRateStars(typeof userReview.rating === "number" ? userReview.rating : 5);
                setRateText(typeof userReview.content === "string" ? userReview.content : "");
              } else {
                setRateStars(5);
                setRateText("");
              }
              setRateOpen(true);
            }}
          >
            {userReview ? t("تعديل التقييم", "Edit review") : t("كتابة تقييم", "Leave a review")}
          </Button>
        </div>
      </div>

      {/* 7. Description */}
      {provider.description?.trim() ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("الوصف", "Description")}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{provider.description.trim()}</p>
        </div>
      ) : null}

      {/* 8. Details grid */}
      <div className="grid grid-cols-2 gap-3">
        {(service.categoryName || provider.category) && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>{t("الفئة", "Category")}</span>
            </div>
            <p className="text-sm font-medium">{service.categoryName || provider.category || "—"}</p>
          </div>
        )}
        {(provider.city || provider.sub_city) && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{t("الموقع", "Location")}</span>
            </div>
            <p className="text-sm font-medium">{provider.sub_city || provider.city || "—"}</p>
          </div>
        )}
      </div>

      {/* 9. Related services carousel */}
      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("خدمات مشابهة", "Related Services")}</div>
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {suggestions.slice(0, 4).map((p) => (
              <div key={p.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                <ServiceProviderCard
                  provider={p}
                  variant="card"
                  isFavorite={!!isFavorite?.(p.id)}
                  onToggleFavorite={() => onToggleFavorite?.(p.id)}
                  onDetails={undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 10. Other suggested services carousel */}
      {suggestions.length > 4 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold">{t("خدمات أخرى مقترحة", "Other Suggested Services")}</div>
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {suggestions.slice(4, 12).map((p) => (
              <div key={p.id} className="shrink-0 w-[72vw] max-w-[320px] snap-center">
                <ServiceProviderCard
                  provider={p}
                  variant="card"
                  isFavorite={!!isFavorite?.(p.id)}
                  onToggleFavorite={() => onToggleFavorite?.(p.id)}
                  onDetails={undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      </div>
      {/* end px-4 space-y-6 content wrapper */}

      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{userReview ? t("تعديل التقييم", "Edit review") : t("كتابة تقييم", "Leave a review")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("تقييمك", "Your rating")}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRateStars(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={cn("h-8 w-8", rateStars >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="listing-style-review">{t("تعليق (اختياري)", "Comment (optional)")}</Label>
              <Textarea
                id="listing-style-review"
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                placeholder={t("اكتب تعليقك...", "Write your review...")}
                maxLength={500}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">{rateText.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button disabled={rateStars < 1 || submitting} onClick={submitReview}>
              {submitting ? t("جاري الحفظ...", "Saving...") : t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type ServiceDetailContentProps = {
  service: SheetService;
  city?: string | null;
  initialProviderServiceId?: string | null;
  onToggleFavorite?: (providerId: string) => void;
  isFavorite?: (providerId: string) => boolean;
};

// --- Shared inner content (used by sheet and by ServiceDetailPage) ---
export function ServiceDetailContent({
  service,
  city,
  initialProviderServiceId,
  onToggleFavorite,
  isFavorite,
}: ServiceDetailContentProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { providers, loading, error } = useSheetData(true, service, city);

  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const viewedServiceIdsRef = useRef<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSuggestionTapAtRef = useRef<number>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const serviceIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const { ratings } = useServiceRatings(serviceIds);

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
    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
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
  }, [providers, userId, onToggleFavorite, isFavorite]);

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

  useEffect(() => {
    if (initialProviderServiceId && providers.length > 0) {
      const match = providers.find((p) => p.id === initialProviderServiceId);
      if (match) setSelectedProvider(match);
    }
  }, [initialProviderServiceId, providers]);

  useEffect(() => {
    const id = selectedProvider?.id;
    if (!id) return;
    if (viewedServiceIdsRef.current.has(id)) return;
    viewedServiceIdsRef.current.add(id);
    // Best-effort telemetry. In some builds supabase.rpc() is not a real Promise (no .catch).
    void (async () => {
      try {
        await supabase.rpc("record_service_event", { p_service_id: id, p_event_type: "view" } as any);
      } catch {
        // ignore
      }
    })();
  }, [selectedProvider?.id]);

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

  // Listing-style single-service view when opened from Hub with a specific service id (buy-and-sell style)
  if (initialProviderServiceId) {
    if (loading) {
      return (
        <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-16 px-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-muted-foreground">{t("جاري التحميل...", "Loading...")}</p>
        </div>
      );
    }
    if (activeProvider) {
      return (
        <>
          <ServiceDetailListingStyle
            provider={activeProvider}
            service={service}
            suggestions={suggestedProviders}
            userId={userId}
            onToggleFavorite={toggleFavoriteLocal}
            isFavorite={isFavoriteLocal}
            onReport={(id, reason) => void reportService(id, userId, reason)}
          />
          <ProviderActionBar
            variant="listing"
            provider={activeProvider}
            userId={userId}
            onRequireAuth={() => toast.info("سجل دخولك للإبلاغ")}
            onReport={(reason) => {
              if (activeProvider?.id) return reportService(activeProvider.id, userId, reason);
            }}
            isFavorite={isFavoriteLocal(activeProvider.id)}
            onToggleFavorite={() => toggleFavoriteLocal(activeProvider.id)}
          />
        </>
      );
    }
    return (
      <div className="flex flex-col flex-1 min-h-0 justify-center items-center py-16 px-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">{t("تعذر تحميل الخدمة", "Could not load service")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden max-w-full" dir="rtl">
      <div className="px-4 py-3 shrink-0 border-b bg-background w-full">
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
          <div className="text-base font-semibold truncate flex-1 text-right">
            {selectedProvider
              ? selectedProvider.provider_name
              : service.categoryNameAr || service.titleKey || "المزودين"}
          </div>

          {!selectedProvider && !loading && (
            <div className="text-xs text-muted-foreground font-normal">
              {providers.length} نتيجة
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10 p-4 min-h-0 max-w-full">
          {activeProvider ? (
            <ProviderDetailView
              provider={activeProvider}
              onToggleFavorite={toggleFavoriteLocal}
              isFavorite={isFavoriteLocal}
              userId={userId}
              onReport={(serviceId, reason) => {
                void reportService(serviceId, userId, reason);
              }}
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
          onReport={(reason) => {
            if (!activeProvider?.id) return;
            return reportService(activeProvider.id, userId, reason);
          }}
          isFavorite={isFavoriteLocal(activeProvider.id)}
          onToggleFavorite={() => toggleFavoriteLocal(activeProvider.id)}
        />
      )}
    </div>
  );
}

// --- Drawer wrapper (used by callers that still use the sheet) ---
export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  city,
  initialProviderServiceId,
  onToggleFavorite,
  isFavorite,
}: Props) {
  const { isRTL } = useLanguage();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh] flex flex-col overflow-x-hidden" dir={isRTL ? "rtl" : "ltr"}>
        <DrawerHeader className="pb-2 shrink-0 w-full px-4">
          <div className="flex items-center justify-between w-full">
            <DrawerTitle className="sr-only">{service.titleKey || service.categoryName || "Service details"}</DrawerTitle>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-full" dir={isRTL ? "rtl" : "ltr"}>
          <ServiceDetailContent
            service={service}
            city={city}
            initialProviderServiceId={initialProviderServiceId}
            onToggleFavorite={onToggleFavorite}
            isFavorite={isFavorite}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ProviderActionBar({
  variant = "default",
  provider,
  userId,
  onRequireAuth,
  onReport,
  isFavorite,
  onToggleFavorite,
}: {
  variant?: "default" | "listing";
  provider: ProviderData;
  userId: string | null;
  onRequireAuth: () => void;
  onReport: (reason: string) => Promise<string | number> | void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCall = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    if (provider?.id) {
      void (async () => {
        try {
          await supabase.rpc("record_service_event", { p_service_id: provider.id, p_event_type: "call" } as any);
        } catch {
          // ignore
        }
      })();
    }
    window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = () => {
    if (provider.allow_whatsapp === false) return;
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    const digits = provider.provider_phone.replace(/[^\d]/g, "");
    if (provider?.id) {
      void (async () => {
        try {
          await supabase.rpc("record_service_event", { p_service_id: provider.id, p_event_type: "whatsapp" } as any);
        } catch {
          // ignore
        }
      })();
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
  const canContact = !!provider.provider_phone;
  const canWhatsApp = allowWhatsapp && !!provider.provider_phone?.replace(/\s/g, "");

  const isListingStyle = variant === "listing";
  const wrapperClass = isListingStyle
    ? "border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2"
    : "shrink-0 border-t bg-background/90 backdrop-blur px-4 py-3";
  const wrapperStyle = isListingStyle ? undefined : { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" };

  return (
    <div className={cn(wrapperClass, "fixed bottom-0 left-0 right-0 z-50")} dir={isRTL ? "rtl" : "ltr"} style={wrapperStyle}>
      {isListingStyle ? (
        canContact ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="lg"
              className="flex-1 gap-2 h-12 rounded-xl font-semibold shadow-lg shadow-primary/20"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
              {t("اتصال", "Call")}
            </Button>
            {allowWhatsapp && (
              <Button
                type="button"
                size="lg"
                className={cn(
                  "flex-1 gap-2 h-12 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800",
                  !canWhatsApp && "opacity-50"
                )}
                disabled={!canWhatsApp}
                onClick={handleWhatsapp}
              >
                <MessageCircle className="h-4 w-4" />
                {t("واتساب", "WhatsApp")}
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn(
                "h-12 w-12 rounded-xl shrink-0",
                isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
              )}
              onClick={() => {
                if (!userId) return onRequireAuth();
                onToggleFavorite?.();
              }}
              aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="flex-1 text-sm text-muted-foreground text-center py-2">{t("رقم الهاتف غير متوفر حالياً", "Phone number not available")}</div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={cn(
                "h-12 w-12 rounded-xl shrink-0",
                isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
              )}
              onClick={() => {
                if (!userId) return onRequireAuth();
                onToggleFavorite?.();
              }}
              aria-label={isFavorite ? t("إزالة من المفضلة", "Remove from favorites") : t("إضافة للمفضلة", "Add to favorites")}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            </Button>
          </div>
        )
      ) : (
        <div className="flex gap-3 items-center">
          <Button
            className={cn("h-12 text-base rounded-xl shadow-lg shadow-primary/20", allowWhatsapp ? "flex-1" : "flex-[1]")}
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
            className={cn(
              "h-12 w-12 rounded-xl",
              isFavorite && "border-red-200 bg-red-50 text-red-500 hover:text-red-600 dark:border-red-800 dark:bg-red-950"
            )}
            onClick={() => {
              if (!userId) return onRequireAuth();
              onToggleFavorite?.();
            }}
            aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
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
      )}

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
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
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

      const dbImages = data?.map((x: any) => x.url) || [];

      if (dbImages.length === 0 && provider.image_url) {
        let fallback = [provider.image_url];
        if (provider.image_url.startsWith("[")) {
          try {
            fallback = JSON.parse(provider.image_url);
          } catch {
            // ignore invalid JSON
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
            (data || []).map((r: any) => ({
              id: String(r.id),
              rating: Number(r.rating || 0),
              content: r.content ?? null,
              created_at: String(r.created_at),
              user_id: r.user_id ? String(r.user_id) : null,
            }))
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
    <div className="pb-24 animate-in slide-in-from-right-4 duration-300 overflow-x-hidden max-w-full">
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
                <img src={src} className="h-full w-full object-cover" alt="" loading="lazy" decoding="async" />
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
          <div className="flex items-center justify-between mb-2" dir="rtl">
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
                  <div className="h-[110px] bg-muted overflow-hidden">
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/70 text-muted-foreground">
                        <ImageOff className="h-8 w-8 mb-1 opacity-50" />
                        <span className="text-xs font-medium">{t("بدون صورة", "No Photo")}</span>
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
                      {typeof (s as any).rating === "number" && (s as any).rating > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" /> {(s as any).rating.toFixed(1)}
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
              <div className="text-xs text-muted-foreground mt-1">
                اختر عدد النجوم واكتب تعليق (اختياري)
              </div>
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
      <Dialog open={viewerIndex !== null} onOpenChange={(o) => !o && setViewerIndex(null)}>
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
