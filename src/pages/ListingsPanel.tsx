import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
  Eye,
  FileText,
  Heart,
  Loader2,
  MapPin,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  PlusCircle,
  ShoppingBag,
  Trash2,
  TrendingUp,
  User,
  Image as ImageIcon,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { StatsChart } from "@/components/dashboard/StatsChart";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useListings, type ListingStatus } from "@/hooks/useListings";
import { useServices } from "@/hooks/useServices";
import { useProviderStats, useServiceStats } from "@/hooks/useProviderStats";
import { ListingCard } from "@/components/hub/ListingCard";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function statusBadgeVariant(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "rejected") return "destructive" as const;
  return "outline" as const;
}

function calculateProfileCompleteness(
  profile: {
    full_name?: string | null;
    phone?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    city?: string | null;
  } | null,
  hasServices: boolean,
): { percentage: number; missing: string[] } {
  if (!profile) return { percentage: 0, missing: [] };

  const checks = [
    { key: "full_name", label: "Full Name", weight: 20 },
    { key: "phone", label: "Phone Number", weight: 25 },
    { key: "bio", label: "Bio", weight: 15 },
    { key: "avatar_url", label: "Profile Photo", weight: 15 },
    { key: "city", label: "City", weight: 15 },
  ];

  let percentage = 0;
  const missing: string[] = [];

  checks.forEach((check) => {
    const value = profile[check.key as keyof typeof profile];
    if (value && String(value).trim()) {
      percentage += check.weight;
    } else {
      missing.push(check.label);
    }
  });

  if (hasServices) {
    percentage += 10;
  } else {
    missing.push("At least 1 service");
  }

  return { percentage: Math.min(100, percentage), missing };
}

const completenessIcons: Record<string, typeof User> = {
  "Full Name": User,
  "Phone Number": Phone,
  Bio: FileText,
  "Profile Photo": ImageIcon,
  City: MapPin,
  "At least 1 service": Briefcase,
};

export default function ListingsPanel() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const providerMode = !!(profile as any)?.provider_mode;
  const listingsActive = !!(profile as any)?.marketplace_enabled;
  const { isEnabled: buySellEnabled } = useBuySellEnabled();

  // Redirect if both toggles are off
  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!providerMode && !listingsActive) {
      navigate("/profile", { replace: true });
    }
  }, [loading, profileLoading, user, providerMode, listingsActive, navigate]);

  // Determine which tabs to show
  const showProviderTab = providerMode;
  const showListingsTab = listingsActive && buySellEnabled;
  const showBothTabs = showProviderTab && showListingsTab;
  
  // Default tab: Provider if available, otherwise Listings
  const defaultTab = showProviderTab ? "provider" : "listings";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update active tab if the current one becomes unavailable
  useEffect(() => {
    if (activeTab === "provider" && !showProviderTab && showListingsTab) {
      setActiveTab("listings");
    } else if (activeTab === "listings" && !showListingsTab && showProviderTab) {
      setActiveTab("provider");
    }
  }, [showProviderTab, showListingsTab, activeTab]);

  // Provider stats
  const { data: stats, isLoading: statsLoading } = useProviderStats();
  const { data: serviceStats, isLoading: serviceStatsLoading } = useServiceStats();

  // Provider services
  const { myServices, updateService, deleteService, isLoading: servicesLoading } = useServices();

  // Listings state
  const [listingsTab, setListingsTab] = useState<ListingStatus>("active");
  const { data: listings, isLoading: listingsLoading } = useListings({
    userId: user?.id || null,
    status: listingsTab,
    limit: 200,
    enabled: !!user && showListingsTab,
  });

  // Fetch all listings for stats
  const { data: activeListings } = useListings({ userId: user?.id || null, status: "active", limit: 1000, enabled: !!user && showListingsTab });
  const { data: soldListings } = useListings({ userId: user?.id || null, status: "sold", limit: 1000, enabled: !!user && showListingsTab });

  const emptyListingsText = useMemo(() => {
    if (listingsTab === "active") return t("لا توجد إعلانات نشطة", "No active listings");
    if (listingsTab === "sold") return t("لا توجد إعلانات مباعة", "No sold listings");
    if (listingsTab === "draft") return t("لا توجد مسودات", "No drafts");
    return t("لا توجد إعلانات مؤرشفة", "No archived listings");
  }, [listingsTab, language]);

  const accountStatus = (profile?.status || "").toLowerCase();
  const accountLocked =
    accountStatus === "suspended" ||
    accountStatus === "deleted" ||
    accountStatus === "inactive";

  // Profile completeness
  const hasServices = (myServices?.length || 0) > 0;
  const { percentage: completeness, missing } = calculateProfileCompleteness(profile, hasServices);

  // Listings stats
  const activeCount = activeListings?.length || 0;
  const soldCount = soldListings?.length || 0;
  // Calculate total calls from listings (if tracked)
  const totalListingCalls = useMemo(() => {
    if (!activeListings) return 0;
    return activeListings.reduce((sum, l) => sum + ((l as any).call_count || 0), 0);
  }, [activeListings]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) return null;

  // If neither tab is available, the redirect effect will handle it
  if (!showProviderTab && !showListingsTab) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Provider Content Component
  const ProviderContent = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <Phone className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{stats?.total_calls || 0}</p>
            <p className="text-xs text-muted-foreground">{t("المكالمات", "Calls")}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
              <Heart className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{stats?.total_favorites || 0}</p>
            <p className="text-xs text-muted-foreground">{t("المفضلة", "Favorites")}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{stats?.profile_views || 0}</p>
            <p className="text-xs text-muted-foreground">{t("المشاهدات", "Views")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completeness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{t("اكتمال الملف الشخصي", "Profile Completeness")}</span>
            <span
              className={cn(
                "text-sm font-bold",
                completeness === 100 ? "text-green-600" : "text-orange-500",
              )}
            >
              {completeness}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} className="h-2 mb-3" />

          {missing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t("أضف لتحسين ظهورك:", "Add to improve your visibility:")}
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.map((item) => {
                  const Icon = completenessIcons[item] || User;
                  return (
                    <Button
                      key={item}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => navigate("/profile")}
                    >
                      <Icon className="h-3 w-3" />
                      {item}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {completeness === 100 && (
            <p className="text-sm text-green-600 font-medium">
              {t("🎉 ملفك الشخصي مكتمل!", "🎉 Your profile is complete!")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Services Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {t("إدارة خدماتي", "Manage my services")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl"
            onClick={() => navigate("/create-service")}
            disabled={accountLocked}
          >
            <PlusCircle className="h-4 w-4" />
            <span className={cn(isRTL ? "me-2" : "ms-2")}>
              {t("إضافة", "Add")}
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : !myServices || myServices.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("لم تضف أي خدمات بعد", "No services added yet")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => navigate("/create-service")}
                disabled={accountLocked}
              >
                <PlusCircle className="h-4 w-4" />
                {t("أضف خدمتك الأولى", "Add your first service")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myServices.map((s) => {
                const approval = (s.approval_status || "pending").toLowerCase();
                const paused = !!s.is_paused;
                const visible = !!s.is_visible;
                const secondaryLine = [s.city, s.sub_city].filter(Boolean).join(" • ");

                return (
                  <div key={s.id} className="rounded-2xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.title}</div>
                        {secondaryLine && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {secondaryLine}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant={statusBadgeVariant(approval)}>
                            {approval}
                          </Badge>
                          <Badge variant={paused ? "secondary" : "outline"}>
                            {paused ? t("موقفة", "Paused") : t("مفعلة", "Active")}
                          </Badge>
                          <Badge variant={visible ? "outline" : "secondary"}>
                            {visible ? t("ظاهرة", "Visible") : t("مخفية", "Hidden")}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl gap-2"
                          onClick={() => navigate(`/edit-service/${s.id}`)}
                          disabled={accountLocked}
                        >
                          <Pencil className="h-4 w-4" />
                          {t("تعديل", "Edit")}
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9 rounded-xl gap-2"
                          onClick={async () => {
                            const { error } = await updateService(s.id, { is_paused: !paused });
                            if (error) toast.error(t("فشل تحديث الحالة", "Failed to update"));
                          }}
                          disabled={accountLocked}
                        >
                          {paused ? (
                            <PlayCircle className="h-4 w-4" />
                          ) : (
                            <PauseCircle className="h-4 w-4" />
                          )}
                          {paused ? t("تشغيل", "Resume") : t("إيقاف", "Pause")}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-9 rounded-xl gap-2"
                          onClick={async () => {
                            const ok = window.confirm(
                              t(
                                "حذف هذه الخدمة؟ سيتم إخفاؤها ولن تظهر للناس.",
                                "Delete this service? It will be hidden from the public."
                              )
                            );
                            if (!ok) return;
                            const { error } = await deleteService(s.id);
                            if (error) toast.error(error.message || t("فشل الحذف", "Delete failed"));
                          }}
                          disabled={accountLocked}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("حذف", "Delete")}
                        </Button>
                      </div>
                    </div>

                    {approval !== "approved" && (
                      <p className="text-xs text-muted-foreground mt-3">
                        {t(
                          "هذه الخدمة بانتظار المراجعة ولن تظهر في الصفحة الرئيسية حتى الموافقة.",
                          "This service is pending review and won't appear publicly until approved."
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Chart */}
      {serviceStats && serviceStats.length > 0 && (
        <StatsChart serviceStats={serviceStats} />
      )}

      {/* Service Details Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {t("تفاصيل الخدمات", "Service Details")}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {!serviceStats || serviceStats.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("لم تضف أي خدمات بعد", "No services added yet")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-2 border-b">
                <span>{t("الخدمة", "Service")}</span>
                <span className="text-center">{t("مكالمات", "Calls")}</span>
                <span className="text-center">{t("مفضلة", "Favorites")}</span>
              </div>

              {serviceStats.map((service: any) => (
                <div
                  key={service.id}
                  className="grid grid-cols-3 items-center py-2 border-b border-dashed last:border-0"
                >
                  <span className="text-sm font-medium truncate pr-2">{service.title}</span>
                  <span className="text-center text-sm font-medium">{service.calls}</span>
                  <span className="text-center text-sm font-medium">{service.favorites}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Listings Content Component
  const ListingsContent = () => (
    <div className="space-y-4">
      {/* Listings Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">{t("نشطة", "Active")}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <Phone className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{totalListingCalls}</p>
            <p className="text-xs text-muted-foreground">{t("المكالمات", "Calls")}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4 px-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{soldCount}</p>
            <p className="text-xs text-muted-foreground">{t("مباع", "Sold")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Listings Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{t("إعلاناتي", "My Listings")}</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/buy-sell/create-listing")}
          disabled={!buySellEnabled}
        >
          <PlusCircle className="h-4 w-4" />
          <span className="ms-2">{t("إعلان جديد", "New listing")}</span>
        </Button>
      </div>

      {/* Listings Tabs */}
      <Tabs value={listingsTab} onValueChange={(v) => setListingsTab(v as ListingStatus)}>
        <TabsList className="w-full flex flex-wrap h-auto">
          <TabsTrigger className="flex-1 min-w-0" value="active">
            {t("نشطة", "Active")}
          </TabsTrigger>
          <TabsTrigger className="flex-1 min-w-0" value="draft">
            {t("مسودة", "Draft")}
          </TabsTrigger>
          <TabsTrigger className="flex-1 min-w-0" value="sold">
            {t("مباع", "Sold")}
          </TabsTrigger>
          <TabsTrigger className="flex-1 min-w-0" value="archived">
            {t("مؤرشف", "Archived")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={listingsTab} className="mt-4">
          {listingsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`listings-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className={`${HUB_CARD_BASE} bg-card p-8 flex flex-col items-center justify-center gap-4 text-center`}>
              <ShoppingBag className="h-12 w-12 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">{emptyListingsText}</p>
              {(listingsTab === "active" || listingsTab === "draft") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/buy-sell/create-listing")}
                  className="gap-1.5"
                >
                  <PlusCircle className="h-4 w-4" />
                  {listingsTab === "draft"
                    ? t("إنشاء مسودة", "Create draft")
                    : t("نشر إعلانك الأول", "Post your first listing")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  isRTL={isRTL}
                  onClick={() => navigate(`/listings/${l.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <Layout>
      <div className="container py-4 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <h1 className="text-lg font-semibold">
            {showBothTabs 
              ? t("لوحة الإعلانات", "Listings Panel")
              : showProviderTab 
                ? t("لوحة المزود", "Provider Dashboard")
                : t("إعلاناتي", "My Listings")}
          </h1>
        </div>

        {/* Show tabs only when both features are enabled */}
        {showBothTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto p-1 rounded-xl">
              <TabsTrigger value="provider" className="flex-1 min-w-0 rounded-lg gap-2">
                <Briefcase className="h-4 w-4" />
                {t("المزود", "Provider")}
              </TabsTrigger>
              <TabsTrigger value="listings" className="flex-1 min-w-0 rounded-lg gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t("الإعلانات", "Listings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="provider" className="mt-4">
              <ProviderContent />
            </TabsContent>

            <TabsContent value="listings" className="mt-4">
              <ListingsContent />
            </TabsContent>
          </Tabs>
        ) : showProviderTab ? (
          // Show Provider content directly (no tabs)
          <ProviderContent />
        ) : showListingsTab ? (
          // Show Listings content directly (no tabs)
          <ListingsContent />
        ) : null}
      </div>
    </Layout>
  );
}
