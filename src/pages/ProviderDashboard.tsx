import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProviderStats, useServiceStats } from "@/hooks/useProviderStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";
import { StatsChart } from "@/components/dashboard/StatsChart";

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

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading } = useAuth();
  const { isRTL } = useLanguage();

  const { data: stats, isLoading: statsLoading } = useProviderStats();
  const { data: serviceStats, isLoading: serviceStatsLoading } = useServiceStats();

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

  const providerStatus = (profile?.provider_status || "").toLowerCase();
  const isApproved = providerStatus === "approved";

  const isLoading = loading || profileLoading || statsLoading || serviceStatsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) return null;

  if (!isApproved) {
    const msg =
      providerStatus === "pending"
        ? isRTL
          ? "طلبك قيد المراجعة."
          : "Your application is under review."
        : providerStatus === "rejected"
          ? isRTL
            ? "تم رفض طلبك. يمكنك إعادة التقديم من صفحة الملف الشخصي."
            : "Your application was rejected. You can re-apply from your profile."
          : isRTL
            ? "هذه الصفحة متاحة فقط للمزودين المعتمدين."
            : "This page is only available for approved providers.";

    return (
      <div className="min-h-screen bg-background p-4 pb-20" dir={isRTL ? "rtl" : "ltr"}>
        <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 -mx-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
            </Button>
            <h1 className="text-lg font-semibold">{isRTL ? "لوحة المزود" : "Provider Dashboard"}</h1>
          </div>
        </header>

        <div className="max-w-xl mx-auto mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                {isRTL ? "غير متاح حالياً" : "Not available"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{msg}</p>
              <Button onClick={() => navigate("/profile")} className="w-full">
                {isRTL ? "الذهاب للملف الشخصي" : "Go to Profile"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <MobileNav />
      </div>
    );
  }

  const hasServices = (serviceStats?.length || 0) > 0;
  const { percentage: completeness, missing } = calculateProfileCompleteness(profile, hasServices);

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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <h1 className="text-lg font-semibold">{isRTL ? "لوحة الإحصائيات" : "Provider Dashboard"}</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{isRTL ? "اكتمال الملف الشخصي" : "Profile Completeness"}</span>
              <span className={cn("text-sm font-bold", completeness === 100 ? "text-green-600" : "text-orange-500")}>
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

        <div className="grid grid-cols-3 gap-3">
          {statCards.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="py-4 px-2">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {serviceStats && serviceStats.length > 0 && <StatsChart serviceStats={serviceStats} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{isRTL ? "تفاصيل الخدمات" : "Service Details"}</CardTitle>
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
