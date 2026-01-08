import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, MapPin, User2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cityId, setCityId] = useState<string>("");

  // Route guard
  useEffect(() => {
    if (loading || profileLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!profile) {
      // If profile is null due to RLS, you’d see it here.
      // Don’t redirect to "/" silently.
      return;
    }

    if (profile.must_change_password) {
      navigate("/change-password", { replace: true });
      return;
    }

    if (!profile.is_verified) {
      navigate("/pending-verification", { replace: true });
      return;
    }
  }, [user, profile, loading, profileLoading, navigate]);

  // Fill form from profile
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setCityId(profile.city_id || "");
  }, [profile]);

  const cityLabel = useMemo(() => {
    if (!cities || !cityId) return "";
    const c = cities.find((x) => x.id === cityId);
    if (!c) return "";
    return language === "ar" ? c.name_ar || c.name : c.name || c.name_ar;
  }, [cities, cityId, language]);

  const handleSave = async () => {
    if (!user) return;

    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      toast({
        title: isRTL ? "اسم غير صالح" : "Invalid name",
        description: isRTL ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

    const selected = cities?.find((c) => c.id === cityId);
    const cityName = selected
      ? language === "ar"
        ? selected.name_ar || selected.name
        : selected.name || selected.name_ar
      : null;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: trimmed,
        city_id: cityId || null,
        city: cityName,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: isRTL ? "فشل الحفظ" : "Save failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // refreshProfile might exist in your context; optional chaining keeps it safe
    await refreshProfile?.();

    toast({
      title: isRTL ? "تم الحفظ" : "Saved",
      description: isRTL ? "تم تحديث ملفك الشخصي" : "Your profile was updated",
    });
  };

  const handleLogout = async () => {
    await signOut?.();
    navigate("/", { replace: true });
  };

  if (loading || profileLoading || citiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // If profile is null, show a helpful message instead of redirecting
  if (!profile) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isRTL ? "تعذر تحميل الملف" : "Profile can’t load"}</CardTitle>
            <CardDescription>
              {isRTL
                ? "غالباً بسبب سياسات RLS (صلاحيات القراءة). تأكد أن المستخدم يستطيع قراءة صفه في profiles."
                : "Usually caused by RLS (read permissions). Ensure users can SELECT their own row in profiles."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/">{isRTL ? "العودة للرئيسية" : "Back to home"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User2 className="h-5 w-5" />
              {isRTL ? "الملف الشخصي" : "Profile"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "قم بتحديث بياناتك الأساسية." : "Update your basic information."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم" : "Full name"}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {isRTL ? "المدينة" : "City"}
              </Label>

              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder={isRTL ? "اختر المدينة" : "Select city"} />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-white border border-border shadow-lg">
                  {(cities || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === "ar" ? c.name_ar || c.name : c.name || c.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!!cityLabel && (
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "الحالية:" : "Current:"} {cityLabel}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isRTL ? "حفظ" : "Save"}
              </Button>

              <Button variant="outline" asChild>
                <Link to="/change-password">{isRTL ? "تغيير كلمة المرور" : "Change password"}</Link>
              </Button>

              <Button variant="destructive" className="sm:ms-auto" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="ms-2">{isRTL ? "خروج" : "Logout"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
