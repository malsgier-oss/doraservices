import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  PauseCircle,
  Pencil,
  PlayCircle,
  PlusCircle,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useListings, type ListingStatus } from "@/hooks/useListings";
import { useServices } from "@/hooks/useServices";
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
            {t("لوحة الإعلانات", "Listings Panel")}
          </h1>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto p-1 rounded-xl">
            {showProviderTab && (
              <TabsTrigger value="provider" className="flex-1 min-w-0 rounded-lg gap-2">
                <Briefcase className="h-4 w-4" />
                {t("المزود", "Provider")}
              </TabsTrigger>
            )}
            {showListingsTab && (
              <TabsTrigger value="listings" className="flex-1 min-w-0 rounded-lg gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t("الإعلانات", "Listings")}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Provider Tab Content */}
          {showProviderTab && (
            <TabsContent value="provider" className="mt-4 space-y-4">
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
            </TabsContent>
          )}

          {/* Listings Tab Content */}
          {showListingsTab && (
            <TabsContent value="listings" className="mt-4 space-y-4">
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
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
