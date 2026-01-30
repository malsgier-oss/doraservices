import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, PlusCircle, ShoppingBag, Heart } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { profile } = useAuth();

  const providerStatus = (profile?.provider_status || "").toLowerCase();
  const isProvider = (profile?.role || "").toLowerCase() === "provider";
  const isProviderPending = isProvider && providerStatus === "pending";
  const isProviderApproved = isProvider && providerStatus === "approved";
  const marketplaceEnabled = !!(profile as any)?.marketplace_enabled;

  return (
    <Layout>
      <div className="container py-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div>
          <h1 className="text-xl font-semibold">{t("لوحتك", "Your Dashboard")}</h1>
          <div className="text-sm text-muted-foreground">{t("إدارة حسابك وإعلاناتك", "Manage your account and listings")}</div>
        </div>

        {/* If user chose provider, guide them to the right dashboard */}
        {isProviderApproved ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                {t("لوحة المزود", "Provider Dashboard")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full h-12" onClick={() => navigate("/provider-dashboard")}>
                {t("فتح", "Open")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                {t("لوحة المستخدم", "User Dashboard")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!marketplaceEnabled ? (
                <div className="text-sm text-muted-foreground">
                  {t("فعّل البيع من صفحة الملف الشخصي لتظهر أدوات الإعلانات هنا.", "Enable selling from your Profile to unlock listings tools here.")}
                </div>
              ) : (
                <>
                  <Button className="w-full h-12 gap-2" onClick={() => navigate("/buy-sell/create-listing")}>
                    <PlusCircle className="h-4 w-4" />
                    {t("نشر إعلان", "Post a listing")}
                  </Button>
                  <Button className="w-full h-12 gap-2" variant="outline" onClick={() => navigate("/buy-sell/my-listings")}>
                    <ShoppingBag className="h-4 w-4" />
                    {t("إعلاناتي", "My Listings")}
                  </Button>
                  <Button className="w-full h-12 gap-2" variant="outline" onClick={() => navigate("/favorites")}>
                    <Heart className="h-4 w-4" />
                    {t("المفضلة", "Favorites")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

