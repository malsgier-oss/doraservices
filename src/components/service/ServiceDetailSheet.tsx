import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Phone, Star, Clock, ChevronRight, Heart, MessageSquare, MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useServiceRatings } from "@/hooks/useReviews";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { useCallLogs } from "@/hooks/useCallLogs";
import { logServiceEvent } from "@/hooks/useServiceEvents";
import { ReportDialog } from "@/components/report/ReportDialog";
import { toast } from "sonner";
import { SearchFiltersState } from "@/components/search/SearchFilters";

// Option A (locked): after Call/WhatsApp, ask for rating on next app open.
const PENDING_RATINGS_KEY = "dora_pending_ratings_v1";

type PendingRating = {
  service_id: string;
  provider_id: string;
  provider_name: string;
  created_at: number; // ms
  source: "call" | "whatsapp";
};

function enqueuePendingRating(item: PendingRating) {
  try {
    const raw = localStorage.getItem(PENDING_RATINGS_KEY);
    const list = (raw ? (JSON.parse(raw) as PendingRating[]) : []).filter(Boolean);

    // De-dupe: keep only latest per (service_id, provider_id)
    const filtered = list.filter(
      (x) => !(x.service_id === item.service_id && x.provider_id === item.provider_id),
    );
    const next = [item, ...filtered].slice(0, 10);
    localStorage.setItem(PENDING_RATINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

const digitsOnly = (v: string) => (v || "").replace(/\D/g, "");

/**
 * Normalize Libya phone for:
 * - tel: +218xxxxxxxxx
 * - wa: 218xxxxxxxxx (digits only)
 */
function normalizeLibyaPhone(raw: string) {
  const d = digitsOnly((raw || "").trim());
  if (!d) return { tel: "", wa: "" };

  if (d.startsWith("218")) return { tel: `+${d}`, wa: d };
  if (d.length === 10 && d.startsWith("0")) {
    const cc = `218${d.slice(1)}`;
    return { tel: `+${cc}`, wa: cc };
  }
  if (d.length === 9) {
    const cc = `218${d}`;
    return { tel: `+${cc}`, wa: cc };
  }
  return { tel: d.startsWith("+") ? d : `+${d}`, wa: d };
}

interface ServiceProvider {
  id: string; // service id
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;

  // user_id can be null for unclaimed / imported services.
  // In that case we still allow calling/WhatsApp, but disable provider-linked features (reviews, call logs).
  user_id: string | null;
  provider_name: string;
  provider_avatar: string;
  provider_phone: string;
  provider_city: string | null;
  provider_sub_city: string | null;
}

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    titleKey: string;
    descKey: string;
    category: string; // this must match services.category in DB
    categoryName?: string;
    categoryNameAr?: string;
    // Either a Tailwind class (e.g. "bg-primary") OR a hex color (e.g. "#14b8a6").
    color: string;
    icon: LucideIcon;
  } | null;
  filters?: SearchFiltersState;

  // ✅ if Hub passes a service id, open that provider directly
  initialProviderServiceId?: string | null;
}

export function ServiceDetailSheet({
  open,
  onOpenChange,
  service,
  filters,
  initialProviderServiceId,
}: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: cities } = useCities();
  const { data: subCities } = useSubCities(filters?.city);
  const { logCall } = useCallLogs();

  // Dora P0: calling / WhatsApp must work even when the user is anonymous.
  // Logged-in features (favorites, reviews, call logs) still require auth.

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  // Local sub-city chip selection for the provider list drawer.
  // We don't mutate global filters; we keep this view self-contained.
  const [subCityChip, setSubCityChip] = useState<string | null>(filters?.subCity || null);

  const [pendingOpenProviderId, setPendingOpenProviderId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const { ratings: providerRatings } = useServiceRatings(providers.map((p) => p.id));

  const getCityLabel = (cityId: string | null) => {
    if (!cityId) return null;
    const city = cities?.find(
      (c: any) => c.id === cityId || String(c.name || "").toLowerCase() === String(cityId).toLowerCase(),
    );
    return city ? (language === "ar" && city.name_ar ? city.name_ar : city.name) : cityId;
  };

  const getSubCityLabel = (subCityId: string | null) => {
    if (!subCityId) return null;
    const sc = subCities?.find(
      (x: any) => x.id === subCityId || String(x.name || "").toLowerCase() === String(subCityId).toLowerCase(),
    );
    return sc ? (language === "ar" && sc.name_ar ? sc.name_ar : sc.name) : subCityId;
  };

  // ---- City alias matching (to support filters.city = "tripoli" etc.) ----
  const norm = (s: string | null | undefined) =>
    String(s || "")
      .toLowerCase()
      .trim();

  const cityAliasMap: Record<string, string[]> = {
    tripoli: ["tripoli", "طرابلس", "طرابلس المركز"],
    benghazi: ["benghazi", "بنغازي"],
    misrata: ["misrata", "مصراتة"],
  };

  const matchesSelectedCity = (providerCity: string | null, selectedCity: string | null) => {
    if (!selectedCity) return true;
    if (!providerCity) return false;

    const selected = norm(selectedCity);
    const providerRaw = norm(providerCity);

    if (providerRaw === selected) return true;

    const providerLabel = getCityLabel(providerCity);
    if (providerLabel && norm(providerLabel) === selected) return true;

    const selectedLabel = getCityLabel(selectedCity);
    if (selectedLabel) {
      const sl = norm(selectedLabel);
      if (providerRaw === sl) return true;
      if (providerLabel && norm(providerLabel) === sl) return true;
    }

    const labels = cityAliasMap[selected];
    if (labels) {
      const pl = providerLabel ? norm(providerLabel) : "";
      return labels.some((l) => providerRaw.includes(norm(l)) || pl.includes(norm(l)));
    }

    return false;
  };

  // ✅ Recently viewed write (store service_id whenever provider profile is opened)
  useEffect(() => {
    if (!selectedProvider) return;

    const key = `dora_recent_service_ids_${user?.id || "guest"}`;
    try {
      const current = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const next = [selectedProvider.id, ...current.filter((x) => x !== selectedProvider.id)].slice(0, 12);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [selectedProvider, user?.id]);

  useEffect(() => {
    if (open && service) {
      setSelectedProvider(null);
      setPendingOpenProviderId(initialProviderServiceId || null);
      setSubCityChip(filters?.subCity || null);
      fetchProviders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service, initialProviderServiceId]);

  const fetchProviders = async () => {
    if (!service) return;
    setLoading(true);

    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("category", service.category)
        .eq("is_active", true)
        .or("is_paused.is.null,is_paused.eq.false")
        .order("created_at", { ascending: false });

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setProviders([]);
        return;
      }

      if (!servicesData || servicesData.length === 0) {
        setProviders([]);
        return;
      }

      const userIds = Array.from(new Set((servicesData as any[]).map((s) => s.user_id).filter(Boolean))) as string[];

      // Profiles are restricted to authenticated users in many setups.
      // If profile lookup fails (e.g., guest browsing), we still show providers using service-level fields.
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, phone, city, sub_city, provider_status")
          .in("user_id", userIds)
          .eq("provider_status", "approved");

        if (profilesError) {
          console.warn("Profiles lookup failed; falling back to service fields:", profilesError);
        } else {
          profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        }
      }

      const enriched: ServiceProvider[] = (servicesData as any[]).map((svc) => {
        const p = svc.user_id ? profileMap.get(svc.user_id) : null;
        return {
          id: svc.id,
          title: svc.title,
          description: svc.description,
          category: svc.category,
          image_url: svc.image_url,

          user_id: svc.user_id ?? null,
          provider_name: p?.full_name || svc.provider_name || (isRTL ? "مقدم الخدمة" : "Provider"),
          provider_avatar: p?.avatar_url || "",
          // Some datasets store phone as numeric; normalize to string early.
          provider_phone: String(p?.phone || svc.provider_phone || "").trim(),
          provider_city: p?.city || svc.city || null,
          provider_sub_city: p?.sub_city || svc.sub_city || null,
        };
      });

      setProviders(enriched);
    } catch (e) {
      console.error("Error:", e);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!pendingOpenProviderId) return;
    if (!providers.length) return;

    const match = providers.find((p) => p.id === pendingOpenProviderId);
    if (match) setSelectedProvider(match);

    setPendingOpenProviderId(null);
  }, [open, pendingOpenProviderId, providers]);

  const filteredProviders = useMemo(() => {
    let result = providers;

    if (filters?.city) {
      result = result.filter((p) => matchesSelectedCity(p.provider_city, filters.city));
    }

    if (subCityChip) {
      result = result.filter((p) => p.provider_sub_city === subCityChip);
    }

    if (filters?.minRating) {
      result = result.filter((p) => {
        const r = providerRatings.get(p.id);
        return r && r.averageRating >= 4;
      });
    }

    return result;
  }, [providers, filters?.city, subCityChip, filters?.minRating, providerRatings]);

  const availableSubCityIds = useMemo(() => {
    // Chip list should be based on available providers (after city filter, before sub-city filter)
    let result = providers;
    if (filters?.city) {
      result = result.filter((p) => matchesSelectedCity(p.provider_city, filters.city));
    }

    const ids = Array.from(
      new Set(result.map((p) => p.provider_sub_city).filter((x): x is string => Boolean(x))),
    );

    // Sort by label (Arabic/English)
    ids.sort((a, b) => {
      const la = (getSubCityLabel(a) || a).toString();
      const lb = (getSubCityLabel(b) || b).toString();
      return la.localeCompare(lb);
    });

    return ids;
  }, [providers, filters?.city, subCities, language]);

  if (!service) return null;

  const isHexColor = typeof service.color === "string" && service.color.trim().startsWith("#");
  const iconWrapperClass = cn(
    "h-16 w-16 rounded-full flex items-center justify-center mb-3",
    isHexColor ? "bg-muted" : service.color,
  );
  const iconWrapperStyle = isHexColor ? ({ backgroundColor: service.color } as React.CSSProperties) : undefined;

  const IconComponent = service.icon;
  const title = t.featuredList[service.titleKey as keyof typeof t.featuredList] || service.titleKey;

  const categoryLabel =
    language === "ar" && service.categoryNameAr
      ? service.categoryNameAr
      : service.categoryName || t.categories[service.category as keyof typeof t.categories] || service.category;

  const handleProviderClick = (provider: ServiceProvider) => setSelectedProvider(provider);

  // Record a provider view when the user opens a provider detail.
  useEffect(() => {
    if (!open) return;
    if (!selectedProvider) return;

    logServiceEvent({
      event_type: "view",
      service_id: selectedProvider.id,
      provider_id: selectedProvider.user_id,
      user_id: user?.id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedProvider?.id]);

  const handleCall = async (provider: ServiceProvider) => {
    const normalized = normalizeLibyaPhone(provider.provider_phone || "");
    if (!normalized.wa) {
      toast.error(isRTL ? "رقم الهاتف غير متوفر" : "Phone number not available");
      return;
    }

    setIsLoggingCall(true);
    try {
      // Anonymous-safe telemetry for Hub + health signals.
      await logServiceEvent({
        event_type: "call",
        service_id: provider.id,
        provider_id: provider.user_id,
        user_id: user?.id ?? null,
      });

      // Only log calls when the caller is logged in AND the provider is claimed.
      if (user && provider.user_id) {
        await logCall.mutateAsync({
          service_id: provider.id,
          provider_id: provider.user_id,
        });
      }
    } catch (err) {
      console.error("Error logging call:", err);
    } finally {
      setIsLoggingCall(false);
    }

    // Queue rating prompt (Option A) for claimed providers.
    if (provider.user_id) {
      enqueuePendingRating({
        service_id: provider.id,
        provider_id: provider.user_id,
        provider_name: provider.provider_name,
        created_at: Date.now(),
        source: "call",
      });
    }

    window.location.href = `tel:${normalized.tel}`;
  };

  const handleWhatsApp = (provider: ServiceProvider) => {
    const normalized = normalizeLibyaPhone(provider.provider_phone || "");
    if (!normalized.wa) {
      toast.error(isRTL ? "رقم الهاتف غير متوفر" : "Phone number not available");
      return;
    }

    // Anonymous-safe telemetry for Hub + health signals.
    logServiceEvent({
      event_type: "whatsapp",
      service_id: provider.id,
      provider_id: provider.user_id,
      user_id: user?.id ?? null,
    });

    // Queue rating prompt (Option A) for claimed providers.
    if (provider.user_id) {
      enqueuePendingRating({
        service_id: provider.id,
        provider_id: provider.user_id,
        provider_name: provider.provider_name,
        created_at: Date.now(),
        source: "whatsapp",
      });
    }

    window.open(`https://wa.me/${normalized.wa}`, "_blank", "noopener,noreferrer");
  };

  const handleToggleFavorite = async (serviceId: string) => {
    if (!user) {
      toast.info(isRTL ? "يرجى تسجيل الدخول" : "Please sign in first");
      onOpenChange(false);
      navigate("/auth");
      return;
    }

    const result = await toggleFavorite(serviceId);
    if (!result.error) {
      toast.success(
        result.added
          ? isRTL
            ? "تمت الإضافة للمفضلة"
            : "Added to favorites"
          : isRTL
            ? "تمت الإزالة من المفضلة"
            : "Removed from favorites",
      );
    }
  };

  const handleBack = () => setSelectedProvider(null);

  const getRatingDisplay = (serviceId: string) => {
    const r = providerRatings.get(serviceId);
    if (!r || r.totalReviews === 0) return { text: isRTL ? "جديد" : "New", hasRating: false };
    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true };
  };

  // Drawer open height locked to 90%
  const drawerPageClass = "h-[90dvh] max-h-[90dvh] flex flex-col overflow-hidden mt-0 bg-background text-foreground";

  // ---------------- Provider detail view ----------------
  if (selectedProvider) {
    const isProviderFavorite = isFavorite(selectedProvider.id);
    const ratingInfo = getRatingDisplay(selectedProvider.id);

    return (
      <>
        <Drawer
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedProvider(null);
              setPendingOpenProviderId(null);
            }
            onOpenChange(isOpen);
          }}
        >
          <DrawerContent className={drawerPageClass}>
            <DrawerHeader className="relative pb-0">
              <button
                onClick={handleBack}
                className={cn(
                  "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                  isRTL ? "right-4" : "left-4",
                )}
              >
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground", !isRTL && "rotate-180")} />
              </button>

              <DrawerClose
                className={cn(
                  "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                  isRTL ? "left-4" : "right-4",
                )}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </DrawerClose>

              <div className="flex flex-col items-center pt-2">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={selectedProvider.provider_avatar || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                    {selectedProvider.provider_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <DrawerTitle className="text-xl font-bold text-foreground">
                  {selectedProvider.provider_name}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedProvider.title}</p>
              </div>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className={cn("h-4 w-4", ratingInfo.hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                    <span className={cn("font-medium", ratingInfo.hasRating ? "text-foreground" : "text-muted-foreground")}>
                      {ratingInfo.text}
                    </span>
                  </div>

                  {selectedProvider.provider_city && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{getCityLabel(selectedProvider.provider_city)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{isRTL ? "متاح" : "Available"}</span>
                  </div>
                </div>

                {selectedProvider.description && (
                  <div className="bg-muted/50 rounded-2xl p-4">
                    <h3 className="font-semibold text-foreground mb-2">{isRTL ? "عن الخدمة" : "About this service"}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedProvider.description}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => handleCall(selectedProvider)}
                    disabled={!selectedProvider.provider_phone || isLoggingCall}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {isLoggingCall ? (isRTL ? "جاري..." : "Calling...") : isRTL ? "اتصل" : "Call"}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => handleWhatsApp(selectedProvider)}
                    disabled={!selectedProvider.provider_phone}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    {isRTL ? "واتساب" : "WhatsApp"}
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant={isProviderFavorite ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "flex-1 h-14 rounded-2xl",
                      isProviderFavorite && "bg-red-500 hover:bg-red-600 text-white",
                    )}
                    onClick={() => handleToggleFavorite(selectedProvider.id)}
                  >
                    <Heart className={cn("h-5 w-5 mr-2", isProviderFavorite && "fill-current")} />
                    {isProviderFavorite
                      ? isRTL
                        ? "في المفضلة"
                        : "Favorited"
                      : isRTL
                        ? "أضف للمفضلة"
                        : "Add to Favorites"}
                  </Button>
                </div>

                <div className="flex items-center justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {isRTL ? "إبلاغ" : "Report"}
                  </Button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          serviceId={selectedProvider.id}
          userId={selectedProvider.user_id ?? undefined}
          providerName={selectedProvider.provider_name}
        />
      </>
    );
  }

  // ---------------- Providers list view ----------------
  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedProvider(null);
          setPendingOpenProviderId(null);
        }
        onOpenChange(isOpen);
      }}
    >
      <DrawerContent className={drawerPageClass}>
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </DrawerClose>

          <div className="flex flex-col items-center pt-2">
            <div className={iconWrapperClass} style={iconWrapperStyle}>
              <IconComponent className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </div>
            <DrawerTitle className="text-xl font-bold text-foreground">{title}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{categoryLabel}</p>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4" dir={isRTL ? "rtl" : "ltr"}>
            {/* Sub-city chips (scrollable) */}
            {availableSubCityIds.length > 0 && (
              <div className="mb-4">
                <div className={cn("overflow-x-auto pb-2", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex gap-2 w-max px-2", isRTL && "flex-row-reverse")}>
{availableSubCityIds.map((id) => {
                    const label = getSubCityLabel(id) || id;
                    const selected = subCityChip === id;
                    return (
                      <Button
                        key={id}
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className="rounded-full flex-shrink-0"
                        onClick={() => setSubCityChip((prev) => (prev === id ? null : id))}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
              {isRTL ? "مقدمي الخدمة المتاحين" : "Available Service Providers"}
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-muted rounded-2xl h-20 animate-pulse" />
                ))}
              </div>
            ) : filteredProviders.length > 0 ? (
              <div className="space-y-2">
                {filteredProviders.map((provider) => {
                  const ratingInfo = (() => {
                    const r = providerRatings.get(provider.id);
                    if (!r || r.totalReviews === 0) return { text: isRTL ? "جديد" : "New", hasRating: false };
                    return { text: `${r.averageRating} (${r.totalReviews})`, hasRating: true };
                  })();

                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderClick(provider)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border transition-colors hover:bg-muted/50 active:bg-muted",
                        isRTL && "flex-row-reverse text-right",
                      )}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={provider.provider_avatar || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                          {provider.provider_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{provider.provider_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{provider.title}</span>

                          {provider.provider_city && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                <MapPin className="h-3 w-3" />
                                {getCityLabel(provider.provider_city)}
                              </span>
                            </>
                          )}
                        </div>

                        {provider.provider_sub_city && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {getSubCityLabel(provider.provider_sub_city)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star
                          className={cn(
                            "h-4 w-4",
                            ratingInfo.hasRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            ratingInfo.hasRating ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {ratingInfo.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-muted-foreground font-medium">
                  {isRTL ? "لا يوجد مقدمي خدمة" : "No providers available"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRTL ? "جرب تصفية مختلفة" : "Try different filters"}
                </p>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
