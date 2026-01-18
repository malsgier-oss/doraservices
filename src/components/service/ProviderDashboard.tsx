import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProviderStats, useServiceStats } from "@/hooks/useProviderStats";
import { useServices } from "@/hooks/useServices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Phone,
  Heart,
  Eye,
  ArrowLeft,
  User,
  Image as ImageIcon,
  MapPin,
  FileText,
  Briefcase,
  Loader2,
  TrendingUp,
  ShieldAlert,
  PauseCircle,
  PlayCircle,
  Pencil,
  Trash2,
  PlusCircle,
} from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";
import { StatsChart } from "@/components/dashboard/StatsChart";
import { toast } from "sonner";

function statusBadgeVariant(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "default" as const;
  if (s === "pending") return "secondary" as const;
  if (s === "rejected") return "destructive" as const;
  return "outline" as const;
}

function serviceVisibilityText(service: any, isRTL: boolean) {
  const approval = (service?.approval_status || "").toLowerCase();
  const paused = !!service?.is_paused;
  const active = !!service?.is_active;
  const visible = !!service?.is_visible;

  if (!active) return isRTL ? "متوقفة" : "Inactive";
  if (paused) return isRTL ? "موقوفة مؤقتاً" : "Paused";
  if (approval !== "approved" || !visible)
    return isRTL ? "بانتظار المراجعة" : "Under review";
  return isRTL ? "ظاهرة" : "Visible";
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

// ✅ FIX: removed the duplicate statusBadgeVariant() that was here.

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading } = useAuth();
  const { isRTL } = useLanguage();

  const { data: stats, isLoading: statsLoading } = useProviderStats();
  const { data: serviceStats, isLoading: serviceStatsLoading } =
    useServiceStats();
  const { myServices, updateService, deleteService } = useServices();

  useEffect(() => {
    if (loading || profileLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!profile) return;

    const st = (profile.status || "").toLowerCase();
    if (st === "deleted" || st === "inactive") {
      navigate("/auth", { replace: true });
    }
  }, [loading, profileLoading, user, profile, navigate]);

  // Dora P0 (Libya UX): providers can use the dashboard immediately.
  // Keep provider_status only as an informational field.
  const providerStatus = (profile?.provider_status || "").toLowerCase();

  const isLoading = loading || profileLoading || statsLoading || serviceStatsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const accountStatus = (profile.status || "").toLowerCase();
  const accountLocked =
    accountStatus === "suspended" ||
    accountStatus === "deleted" ||
    accountStatus === "inactive";
  const suspendedReason = profile.suspended_reason || null;

  const hasServices = (serviceStats?.length || 0) > 0;
  const { percentage: completeness, missing } =
    calculateProfileCompleteness(profile, hasServices);

  const statCards = [
    {
      icon: Phone,
      label: isRTL ? "المكالمات" : "Calls",
      value: stats?.total_calls || 0,
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Heart,
      label: isRTL ? "المفضلة" : "Favorites",
      value: stats?.total_favorites || 0,
      color: "bg-red-100 text-red-600",
    },
    {
      icon: Eye,
      label: isRTL ? "المشاهدات" : "Views",
      value: stats?.profile_views || 0,
      color: "bg-green-100 text-green-600",
    },
  ];

  const completenessIcons: Record<string, typeof User> = {
    "Full Name": User,
    "Phone Number": Phone,
    Bio: FileText,
    "Profile Photo": ImageIcon,
    City: MapPin,
    "At least 1 service": Briefcase,
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={isRTL ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-3">
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
            {isRTL ? "لوحة الإحصائيات" : "Provider Dashboard"}
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        <Card className={cn(accountLocked && "border-destructive/40")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {accountLocked ? (
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
                <span>{isRTL ? "حالة الحساب" : "Account status"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusBadgeVariant(providerStatus)}>
                  {providerStatus || "pending"}
                </Badge>
                {accountStatus && (
                  <Badge variant={accountLocked ? "destructive" : "outline"}>
                    {accountStatus}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountLocked ? (
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? `حسابك موقوف حالياً. السبب: ${suspendedReason || "غير محدد"}. لا يمكنك تعديل أو إضافة خدمات.`
                  : `Your account is currently locked. Reason: ${suspendedReason || "unspecified"}. You can't create or edit services.`}
              </p>
            ) : providerStatus !== "approved" ? (
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? "طلبك كمزود تحت المراجعة. الخدمات التي تضيفها ستكون مخفية حتى الموافقة."
                  : "Your provider request is under review. Services you add will stay hidden until approval."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isRTL ? "حسابك كمزود مفعل." : "Your provider account is approved."}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="h-11 rounded-xl gap-2"
                onClick={() => navigate("/create-service")}
                disabled={accountLocked}
              >
                <PlusCircle className="h-4 w-4" />
                {isRTL ? "إضافة خدمة" : "Add service"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isRTL ? "اكتمال الملف الشخصي" : "Profile Completeness"}</span>
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
                  {isRTL ? "أضف لتحسين ظهورك:" : "Add to improve your visibility:"}
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
                {isRTL ? "🎉 ملفك الشخصي مكتمل!" : "🎉 Your profile is complete!"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {isRTL ? "إدارة خدماتي" : "Manage my services"}
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
                {isRTL ? "إضافة" : "Add"}
              </span>
            </Button>
          </CardHeader>
          <CardContent>
            {!myServices || myServices.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "لم تضف أي خدمات بعد" : "No services added yet"}
                </p>
                <Button
                  className="mt-3"
                  onClick={() => navigate("/create-service")}
                  disabled={accountLocked}
                >
                  {isRTL ? "أضف خدمة" : "Add Service"}
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
                          {secondaryLine ? (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {secondaryLine}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={statusBadgeVariant(approval)}>
                              {approval}
                            </Badge>
                            <Badge variant={paused ? "secondary" : "outline"}>
                              {paused ? (isRTL ? "موقفة" : "Paused") : (isRTL ? "مفعلة" : "Active")}
                            </Badge>
                            <Badge variant={visible ? "outline" : "secondary"}>
                              {visible ? (isRTL ? "ظاهرة" : "Visible") : (isRTL ? "مخفية" : "Hidden")}
                            </Badge>
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                            <div className="text-xs text-muted-foreground">
                              {isRTL ? "إظهار زر واتساب" : "Show WhatsApp button"}
                            </div>
                            <Switch
                              checked={s.allow_whatsapp !== false}
                              onCheckedChange={async (checked) => {
                                const { error } = await updateService(s.id, { allow_whatsapp: checked });
                                if (error) toast.error(isRTL ? "فشل تحديث واتساب" : "Failed to update WhatsApp");
                              }}
                              disabled={accountLocked}
                            />
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
                            {isRTL ? "تعديل" : "Edit"}
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 rounded-xl gap-2"
                            onClick={async () => {
                              const { error } = await updateService(s.id, { is_paused: !paused });
                              if (error) toast.error(isRTL ? "فشل تحديث الحالة" : "Failed to update");
                            }}
                            disabled={accountLocked}
                          >
                            {paused ? (
                              <PlayCircle className="h-4 w-4" />
                            ) : (
                              <PauseCircle className="h-4 w-4" />
                            )}
                            {paused ? (isRTL ? "تشغيل" : "Resume") : (isRTL ? "إيقاف" : "Pause")}
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 rounded-xl gap-2"
                            onClick={async () => {
                              const ok = window.confirm(
                                isRTL
                                  ? "حذف هذه الخدمة؟ سيتم إخفاؤها ولن تظهر للناس."
                                  : "Delete this service? It will be hidden from the public.",
                              );
                              if (!ok) return;
                              const { error } = await deleteService(s.id);
                              if (error) toast.error(isRTL ? "فشل الحذف" : "Delete failed");
                            }}
                            disabled={accountLocked}
                          >
                            <Trash2 className="h-4 w-4" />
                            {isRTL ? "حذف" : "Delete"}
                          </Button>
                        </div>
                      </div>

                      {approval !== "approved" && (
                        <p className="text-xs text-muted-foreground mt-3">
                          {isRTL
                            ? "هذه الخدمة بانتظار المراجعة ولن تظهر في الصفحة الرئيسية حتى الموافقة."
                            : "This service is pending review and won't appear publicly until approved."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          {statCards.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="py-4 px-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2",
                    stat.color,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {serviceStats && serviceStats.length > 0 && (
          <StatsChart serviceStats={serviceStats} />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {isRTL ? "تفاصيل الخدمات" : "Service Details"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!serviceStats || serviceStats.length === 0 ? (
              <div className="text-center py-6">
                <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "لم تضف أي خدمات بعد" : "No services added yet"}
                </p>
                <Button className="mt-3" onClick={() => navigate("/create-service")}>
                  {isRTL ? "أضف خدمة" : "Add Service"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-2 border-b">
                  <span>{isRTL ? "الخدمة" : "Service"}</span>
                  <span className="text-center">{isRTL ? "مكالمات" : "Calls"}</span>
                  <span className="text-center">{isRTL ? "مفضلة" : "Favorites"}</span>
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
      </main>

      <MobileNav />
    </div>
  );
}
