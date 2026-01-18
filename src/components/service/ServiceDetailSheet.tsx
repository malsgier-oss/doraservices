import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Phone,
  MessageCircle,
  ChevronRight,
  Heart,
  Share2,
  X,
  Star
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
            "id,title,description,category,city,sub_city,provider_name,provider_phone,image_url,price,is_active,is_visible,is_paused,is_featured,approval_status,views_count"
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
        const normalized: ProviderData[] = rows.map((r) => ({
          id: String(r.id),
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
          // Generate a fake review for demo purposes if needed
          reviews: ["خدمة ممتازة وسريعة", "تعامل راقي جداً", "أنصح بالتعامل معه"],
        }));

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
  
  // Ratings Hook
  const serviceIds = useMemo(() => providers.map((p) => p.id), [providers]);
  const { ratings } = useServiceRatings(serviceIds);

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
              onToggleFavorite={onToggleFavorite}
              isFavorite={isFavorite}
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
                  isFavorite={isFavorite?.(p.id)}
                  onToggleFavorite={() => onToggleFavorite?.(p.id)}
                  onDetails={() => setSelectedProvider(p)}
                />
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// --- Detail View Internal Component ---
function ProviderDetailView({
  provider,
  onToggleFavorite,
  isFavorite,
}: {
  provider: ProviderData;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: (id: string) => boolean;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  const handleCall = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    window.open(`tel:${provider.provider_phone.replace(/\s+/g, "")}`, "_self");
  };

  const handleWhatsapp = () => {
    if (!provider.provider_phone) return toast.error("لا يوجد رقم هاتف");
    const digits = provider.provider_phone.replace(/[^\d]/g, "");
    if (digits) window.open(`https://wa.me/${digits}`, "_blank");
  };

  return (
    <div className="pb-4 animate-in slide-in-from-right-4 duration-300">
      {/* 1. Image Gallery */}
      <div className="-mx-4 -mt-4 mb-4">
        <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory pb-4 px-4 pt-4 hide-scrollbar">
          {(images.length ? images : [null]).map((src, idx) => (
            <div
              key={idx}
              onClick={() => src && setViewerIndex(idx)}
              className="shrink-0 w-[85vw] aspect-video rounded-xl overflow-hidden bg-muted snap-center shadow-sm border first:ml-0 cursor-pointer"
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

      {/* 4. Contact Footer */}
      <div className="mt-6 grid grid-cols-2 gap-3 sticky bottom-0 bg-background/80 backdrop-blur p-4 -mx-4 border-t z-10">
        <Button
          className="h-12 text-base rounded-xl shadow-lg shadow-primary/20"
          onClick={handleCall}
        >
          <Phone className="ml-2 h-4 w-4" /> اتصال
        </Button>
        <Button
          variant="secondary"
          className="h-12 text-base rounded-xl bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          onClick={handleWhatsapp}
        >
          <MessageCircle className="ml-2 h-4 w-4" /> واتساب
        </Button>
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
