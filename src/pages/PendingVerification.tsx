import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, Phone } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import doraLogo from "@/assets/dora-logo.png";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import { useEffect } from "react";

export default function PendingVerification() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const role = (profile?.role || "").toLowerCase();
    const providerStatus = (profile?.provider_status || "").toLowerCase();

    // This page is for business/providers awaiting approval.
    // If the user is not a provider, or already approved, just go home.
    const isProviderLike = role === "business" || role === "provider"; // accept legacy "provider"
    if (profile && (!isProviderLike || providerStatus === "approved")) {
      navigate("/");
      return;
    }
    // If no user, redirect to auth
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, profile, loading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Clock className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language Toggle */}
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img src={doraLogo} alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-2xl font-bold text-foreground">{t.appName}</span>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">{isRTL ? "في انتظار اعتماد الحساب" : "Pending Approval"}</CardTitle>
          <CardDescription className="mt-2">
            {isRTL
              ? "حساب النشاط التجاري الخاص بك قيد المراجعة. بمجرد الاعتماد ستتمكن من إضافة خدماتك وإدارة صفحتك."
              : "Your business account is under review. Once approved, you can add services and manage your provider dashboard."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Display user phone */}
          {profile?.phone && (
            <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{isRTL ? "رقم الهاتف المسجل" : "Registered phone"}</p>
                <p className="font-medium" dir="ltr">
                  {formatPhoneDisplay(profile.phone)}
                </p>
              </div>
            </div>
          )}

          {/* What you can do */}
          <div className="bg-muted/50 rounded-xl p-4">
            <h3 className="font-medium mb-2">{isRTL ? "بإمكانك الآن:" : "You can still:"}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {isRTL ? "تصفح الخدمات ومقدميها" : "Browse services and providers"}</li>
              <li>• {isRTL ? "البحث والتصفية" : "Search and filter"}</li>
              <li>• {isRTL ? "قراءة التقييمات" : "Read reviews"}</li>
              <li>• {isRTL ? "الاتصال بمقدمي الخدمات" : "Call / WhatsApp providers"}</li>
            </ul>
          </div>

          {/* What you can't do */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <h3 className="font-medium mb-2 text-destructive">{isRTL ? "يتطلب الاعتماد:" : "Requires approval:"}</h3>
            <ul className="text-sm text-destructive/80 space-y-1">
              <li>• {isRTL ? "إضافة خدمات" : "Add services"}</li>
              <li>• {isRTL ? "لوحة مقدم الخدمة" : "Provider dashboard"}</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => navigate("/")}>
              {isRTL ? "تصفح الخدمات" : "Browse Services"}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t.profile.logout}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
