import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ArrowLeft, Loader2 } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useMyBusiness";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user, profile, refreshProfile } = useAuth();
  const { data: myBusiness, isLoading } = useMyBusiness();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const canCreate = useMemo(() => {
    return !!user && name.trim().length >= 2 && category.trim().length >= 2 && !saving;
  }, [user, name, category, saving]);

  const createBusiness = async () => {
    if (!user) {
      navigate("/auth?tab=login");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("businesses").insert({
        user_id: user.id,
        name: name.trim(),
        category: category.trim(),
        location: location.trim() ? location.trim() : null,
        description: description.trim() ? description.trim() : null,
      } as any);
      if (error) throw error;

      // Best-effort: store a business role marker in profiles if schema allows it.
      await supabase.from("profiles").update({ role: "business" } as any).eq("user_id", user.id).catch(() => {});
      await refreshProfile();

      toast.success(t("تم إنشاء المتجر", "Business created"));
      window.location.reload();
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">{t("لوحة المتجر", "Business Dashboard")}</h1>
            </div>
          </div>
        </div>

        {myBusiness ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{myBusiness.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>{t("الحالة:", "Status:")} {myBusiness.authorization_status}</div>
              <div>{t("التصنيف:", "Category:")} {myBusiness.category}</div>
              {myBusiness.location ? <div>{t("الموقع:", "Location:")} {myBusiness.location}</div> : null}
              {myBusiness.description ? <div className="whitespace-pre-line">{myBusiness.description}</div> : null}
              <div className="pt-2 text-xs">
                {t("إدارة العروض ستضاف في المرحلة القادمة.", "Deal management will be added in the next phase.")}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("إنشاء ملف متجر", "Create business profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("اسم المتجر", "Business name")}</Label>
                <Input className="text-base" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("التصنيف", "Category")}</Label>
                <Input className="text-base" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("مثال: إلكترونيات", "e.g. Electronics")} />
              </div>
              <div className="space-y-2">
                <Label>{t("الموقع (اختياري)", "Location (optional)")}</Label>
                <Input className="text-base" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("الوصف (اختياري)", "Description (optional)")}</Label>
                <Textarea className="text-base" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <Button className="w-full h-12" onClick={createBusiness} disabled={!canCreate}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("إنشاء", "Create")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

