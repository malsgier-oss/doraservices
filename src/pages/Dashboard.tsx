import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Wrench, ArrowRight, Loader2 } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMyBusiness } from "@/hooks/useMyBusiness";

export default function Dashboard() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user, profile, refreshProfile } = useAuth();
  const { data: myBusiness } = useMyBusiness();

  const [busy, setBusy] = useState<"provider" | "business" | null>(null);

  const providerStatus = (profile?.provider_status || "").toLowerCase();
  const isProvider = (profile?.role || "").toLowerCase() === "provider";
  const isProviderPending = isProvider && providerStatus === "pending";
  const isProviderApproved = isProvider && providerStatus === "approved";
  const hasBusiness = !!myBusiness;

  const providerDisabledReason = useMemo(() => {
    if (hasBusiness) return t("لديك حساب متجر بالفعل", "You already have a business profile");
    return null;
  }, [hasBusiness, language]);

  const businessDisabledReason = useMemo(() => {
    if (isProvider) return t("لديك حساب مزود خدمة بالفعل", "You already have a provider account");
    return null;
  }, [isProvider, language]);

  const becomeProvider = async () => {
    if (!user) return;
    if (hasBusiness) {
      toast.error(providerDisabledReason || t("غير متاح", "Not available"));
      return;
    }
    setBusy("provider");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "provider", provider_status: "pending" } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t("تم إرسال طلبك", "Request submitted"));
      navigate("/provider-dashboard");
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const goBusiness = () => {
    if (isProvider) {
      toast.error(businessDisabledReason || t("غير متاح", "Not available"));
      return;
    }
    navigate("/business-dashboard");
  };

  return (
    <Layout>
      <div className="container py-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div>
          <h1 className="text-xl font-semibold">{t("لوحتك", "Your Dashboard")}</h1>
          <div className="text-sm text-muted-foreground">{t("اختر المسار المناسب لك", "Choose the path that fits you")}</div>
        </div>

        {/* Provider */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t("مزود خدمة", "Provider")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t("انشر خدماتك واستقبل مكالمات مباشرة من العملاء.", "Publish services and get contacted directly by customers.")}
            </div>
            {isProviderApproved ? (
              <Button className="w-full h-12" onClick={() => navigate("/provider-dashboard")}>
                {t("اذهب للوحة المزود", "Go to Provider Dashboard")} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : isProviderPending ? (
              <div className="text-sm text-muted-foreground">{t("طلبك قيد المراجعة.", "Your request is under review.")}</div>
            ) : (
              <>
                {providerDisabledReason ? (
                  <div className="text-sm text-muted-foreground">{providerDisabledReason}</div>
                ) : null}
                <Button className="w-full h-12" onClick={becomeProvider} disabled={!!providerDisabledReason || busy === "provider"}>
                  {busy === "provider" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ابدأ كمزود", "Become a Provider")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Business */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t("متجر / نشاط تجاري", "Business")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t("أنشئ ملف متجر وانشر عروضك.", "Create a business profile and publish your deals.")}
            </div>
            {hasBusiness ? (
              <Button className="w-full h-12" onClick={() => navigate("/business-dashboard")}>
                {t("اذهب للوحة المتجر", "Go to Business Dashboard")} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                {businessDisabledReason ? (
                  <div className="text-sm text-muted-foreground">{businessDisabledReason}</div>
                ) : null}
                <Button className="w-full h-12" onClick={goBusiness} disabled={!!businessDisabledReason || busy === "business"}>
                  {t("إنشاء متجر", "Create Business")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

