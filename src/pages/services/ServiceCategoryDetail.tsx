import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCardCompact } from "@/components/hub/ServiceCardCompact";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useServiceRatings } from "@/hooks/useReviews";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { normalizeCategory } from "@/lib/utils";
import { getTelLink, getWhatsAppLink } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

type ServiceRow = {
  id: string;
  title: string | null;
  category: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
};

export default function ServiceCategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const subFromUrl = searchParams.get("sub");
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const { data: categoriesData } = useCategories();
  const category = useMemo(
    () => (categoriesData || []).find((c) => c.id === categoryId) ?? null,
    [categoriesData, categoryId]
  );
  const { data: subcategories = [] } = useSubcategories(categoryId ?? undefined);
  const subcats = useMemo(() => (subcategories || []).filter((s) => s.is_active !== false), [subcategories]);

  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(subFromUrl);
  useEffect(() => {
    setSelectedSubcategoryId(subFromUrl);
  }, [subFromUrl]);
  const cityId = getStoredCityId();
  const { data: cities } = useCities();
  const selectedCityName = useMemo(
    () => (cities || []).find((c) => c.id === cityId)?.name || null,
    [cities, cityId]
  );

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!categoryId) return;

    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const escOrValue = (v: string) => {
          const escaped = String(v || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          return `"${escaped}"`;
        };

        const categoryValues: string[] = [];
        if (selectedSubcategoryId) {
          const sub = subcats.find((s) => s.id === selectedSubcategoryId);
          if (sub) {
            const n = normalizeCategory(sub.name || "");
            if (n) categoryValues.push(n);
            const ar = sub.name_ar ? normalizeCategory(sub.name_ar) : "";
            if (ar && ar !== n) categoryValues.push(ar);
          }
        } else {
          for (const sub of subcats) {
            const n = normalizeCategory(sub.name || "");
            if (n && !categoryValues.includes(n)) categoryValues.push(n);
            const ar = sub.name_ar ? normalizeCategory(sub.name_ar) : "";
            if (ar && !categoryValues.includes(ar)) categoryValues.push(ar);
          }
        }

        const categoryOr =
          categoryValues.length > 0
            ? categoryValues.map((v) => `category.eq.${escOrValue(v)}`).join(",")
            : "";

        let cityOr = "";
        const cityVal = (selectedCityName || "").trim();
        if (cityVal) {
          const cityNames = new Set<string>([cityVal]);
          try {
            const { data: cityRow } = await supabase
              .from("cities")
              .select("name,name_ar")
              .or(`name.eq.${escOrValue(cityVal)},name_ar.eq.${escOrValue(cityVal)}`)
              .maybeSingle();
            if (cityRow?.name) cityNames.add(String(cityRow.name));
            if (cityRow?.name_ar) cityNames.add(String(cityRow.name_ar));
          } catch {
            // ignore
          }
          const arr = Array.from(cityNames).filter(Boolean);
          if (arr.length > 0) {
            cityOr = arr.map((n) => `city.eq.${escOrValue(n)}`).join(",");
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

        const runQuery = async (allowCityFilter: boolean) => {
          let q: any = allowCityFilter ? baseWithCity : baseNoCity;
          q = q
            .eq("is_visible", true)
            .eq("is_active", true)
            .eq("is_paused", false)
            .eq("approval_status", "approved")
            .is("deleted_at", null);
          if (categoryOr) q = q.or(categoryOr);
          if (allowCityFilter && cityOr) q = q.or(cityOr);
          return await q;
        };

        let allowCityFilter = true;
        let { data, error: err } = await runQuery(allowCityFilter);
        if (err) {
          const msg = String((err as any)?.message || err).toLowerCase();
          if (msg.includes("column") && (msg.includes("city") || msg.includes("sub_city")) && msg.includes("does not exist")) {
            allowCityFilter = false;
            const res = await runQuery(false);
            data = res.data;
            err = res.error;
          }
        }
        if (err) throw err;

        const rows = ((data || []) as any[]).map((r) => ({
          id: String(r.id),
          title: r.title ?? null,
          category: r.category ?? null,
          provider_name: r.provider_name ?? null,
          provider_phone: r.provider_phone ?? null,
          allow_whatsapp: r.allow_whatsapp ?? true,
          city: r.city ?? null,
          sub_city: r.sub_city ?? null,
          image_url: r.image_url ?? null,
          is_featured: r.is_featured ?? null,
          is_verified: r.is_verified ?? null,
          price: r.price,
        }));

        if (alive) setServices(rows);
      } catch (e) {
        console.error("ServiceCategoryDetail load error:", e);
        if (alive) {
          setError(e);
          setServices([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [categoryId, selectedSubcategoryId, subcats, selectedCityName, refreshTrigger]);

  const subcatByName = useMemo(() => {
    const m = new Map<string, (typeof subcats)[0]>();
    for (const sc of subcats) {
      if (sc.name) m.set(normalizeCategory(sc.name).toLowerCase(), sc);
      if (sc.name_ar) m.set(normalizeCategory(sc.name_ar).toLowerCase(), sc);
    }
    return m;
  }, [subcats]);

  const serviceIds = useMemo(() => services.map((s) => s.id), [services]);
  const { ratings } = useServiceRatings(serviceIds);
  const getRating = (id: string) => {
    const row = ratings.get(id);
    if (!row) return null;
    return {
      value: Number(row.averageRating || 0),
      count: Number(row.totalReviews || 0),
    };
  };

  const lastOpenAtRef = useRef(0);

  const handleOpenService = (service: ServiceRow) => {
    const now = Date.now();
    if (now - lastOpenAtRef.current < 250) return;
    lastOpenAtRef.current = now;
    if (service?.id) navigate(`/services/service/${service.id}`);
  };

  const handleCall = (service: ServiceRow) => {
    if (!service?.provider_phone) return;
    window.location.href = getTelLink(String(service.provider_phone));
  };

  const handleWhatsApp = (service: ServiceRow) => {
    if (!service?.provider_phone) return;
    window.location.href = getWhatsAppLink(String(service.provider_phone));
  };

  const labels = {
    call: t("اتصال", "Call"),
    whatsapp: t("واتساب", "WhatsApp"),
    providerFallback: t("مزود خدمة", "Service Provider"),
    noPhoto: t("لا توجد صورة", "No Photo"),
    ratingFallback: t("جديد", "New"),
  };

  if (!category && categoriesData && categoriesData.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">{t("فئة غير موجودة", "Category not found")}</h2>
          <Button onClick={() => navigate("/")} variant="outline">
            {t("العودة للصفحة الرئيسية", "Back to Home")}
          </Button>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const Icon = getCategoryIcon(category.icon);
  const hex = (category.color || "#888").startsWith("#") ? category.color : "#888";

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sticky header – mimic CategoryDetail */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="px-4 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/")}>
              {isRTL ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: hex + "1f" }}
              >
                <Icon className="h-6 w-6" style={{ color: hex }} />
              </div>
              <div>
                <h1 className="text-lg font-bold">{language === "ar" ? category.name_ar || category.name : category.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {services.length} {t("مزود خدمة", "providers")}
                </p>
              </div>
            </div>
          </div>

          {subcats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant={selectedSubcategoryId === null ? "default" : "outline"}
                size="sm"
                className="rounded-full h-9 text-xs"
                onClick={() => setSelectedSubcategoryId(null)}
              >
                {t("الكل", "All")}
              </Button>
              {subcats.map((sub) => (
                <Button
                  key={sub.id}
                  type="button"
                  variant={selectedSubcategoryId === sub.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full h-9 text-xs"
                  onClick={() => setSelectedSubcategoryId(sub.id)}
                >
                  {language === "ar" ? sub.name_ar || sub.name : sub.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`loading-${i}`} className={cn(HUB_CARD_BASE, "bg-card overflow-hidden")}>
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44 mt-2" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
            <p className="text-sm font-medium">{t("حدث خطأ ما", "Something went wrong")}</p>
            <p className="text-xs text-muted-foreground">{t("تعذر تحميل الخدمات", "Could not load services")}</p>
            <Button variant="outline" size="sm" onClick={() => { setError(null); setRefreshTrigger((n) => n + 1); }}>
              {t("إعادة المحاولة", "Retry")}
            </Button>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
            <p className="text-lg font-medium">{t("لا توجد خدمات", "No services found")}</p>
            <p className="text-sm text-muted-foreground">
              {t("لا توجد خدمات في هذا القسم حالياً", "No services in this category right now.")}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              {t("العودة للصفحة الرئيسية", "Back to Home")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => {
              const canCall = !!service.provider_phone;
              const canWhatsApp = canCall && (service.allow_whatsapp !== false);
              return (
                <ServiceCardCompact
                  key={service.id}
                  service={service as any}
                  rating={getRating(service.id)}
                  isRTL={isRTL}
                  canCall={canCall}
                  canWhatsApp={canWhatsApp}
                  onOpen={() => handleOpenService(service)}
                  onCall={() => handleCall(service)}
                  onWhatsApp={() => handleWhatsApp(service)}
                  labels={labels}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
