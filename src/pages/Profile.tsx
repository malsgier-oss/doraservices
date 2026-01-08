import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  User2,
  MapPin,
  ShieldCheck,
  LogOut,
  KeyRound,
  Phone,
  BadgeCheck,
  AlertTriangle,
  LayoutDashboard,
  PlusCircle,
  Trash2,
} from "lucide-react";

function statusBadgeVariant(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "default";
  if (s === "pending") return "secondary";
  if (s === "rejected") return "destructive";
  if (s === "deleted" || s === "inactive") return "destructive";
  return "outline";
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();

  const [tab, setTab] = useState<"account" | "provider" | "security" | "danger">("account");

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [cityId, setCityId] = useState<string>("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Route guard: no silent redirect to "/"
  useEffect(() => {
    if (loading || profileLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!profile) return;

    if (profile.must_change_password) {
      navigate("/change-password", { replace: true });
      return;
    }

    if (!profile.is_verified) {
      navigate("/pending-verification", { replace: true });
      return;
    }

    const st = (profile.status || "").toLowerCase();
    if (st === "deleted" || st === "inactive") {
      navigate("/auth", { replace: true });
    }
  }, [loading, profileLoading, user, profile, navigate]);

  // Fill form fields
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
    setCityId(profile.city_id || "");
  }, [profile]);

  const cityLabel = useMemo(() => {
    if (!cities || !cityId) return "";
    const c = cities.find((x) => x.id === cityId);
    if (!c) return "";
    return language === "ar" ? c.name_ar || c.name : c.name || c.name_ar;
  }, [cities, cityId, language]);

  const isProviderOnly = useMemo(() => {
    if (!profile) return false;
    const role = (profile.role || "").toLowerCase();
    const providerStatus = (profile.provider_status || "").toLowerCase();
    const looksProvider =
      role === "business" ||
      providerStatus === "approved" ||
      providerStatus === "pending" ||
      providerStatus === "rejected";

    // show Provider tab only for providers (not admins)
    return looksProvider && role !== "admin";
  }, [profile]);

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
        bio: bio?.trim() || null,
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

  const handleSoftDelete = async () => {
    if (!user || !profile) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;

    setDeleting(true);

    // ✅ Soft delete Option A: keep phone, wipe personal fields
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "deleted",
        suspended_at: new Date().toISOString(),
        suspended_reason: "user_deleted",
        full_name: null,
        bio: null,
        avatar_url: null,
      })
      .eq("user_id", user.id);

    setDeleting(false);

    if (error) {
      toast({
        title: isRTL ? "فشل حذف الحساب" : "Delete failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isRTL ? "تم حذف الحساب" : "Account deleted",
      description: isRTL ? "تم تعطيل حسابك وتسجيل الخروج." : "Your account was deactivated and you were signed out.",
    });

    setDeleteOpen(false);

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

  // RLS / profile not readable
  if (!profile) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{isRTL ? "تعذر تحميل الملف الشخصي" : "Profile can’t load"}</CardTitle>
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
            <Button variant="outline" asChild className="w-full">
              <Link to="/auth">{isRTL ? "تسجيل الدخول" : "Sign in"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const role = (profile.role || "user").toLowerCase();
  const providerStatus = profile.provider_status || null;

  return (
    <div className="min-h-screen p-4 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <User2 className="h-5 w-5" />
              {isRTL ? "الملف الشخصي" : "Profile"}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {isRTL
                ? "إدارة معلومات حسابك وإعدادات الأمان."
                : "Manage your account information and security settings."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={profile.is_verified ? "default" : "destructive"} className="gap-1">
                <BadgeCheck className="h-4 w-4" />
                {profile.is_verified ? (isRTL ? "موثّق" : "Verified") : isRTL ? "غير موثّق" : "Not verified"}
              </Badge>

              <Badge variant="outline">
                {isRTL ? "الدور:" : "Role:"} {role}
              </Badge>

              {providerStatus && (
                <Badge variant={statusBadgeVariant(providerStatus)}>
                  {isRTL ? "حالة المزود:" : "Provider:"} {providerStatus}
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span dir="ltr">{profile.phone || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className={cn("grid w-full", isProviderOnly ? "grid-cols-4" : "grid-cols-3")}>
                <TabsTrigger value="account">{isRTL ? "الحساب" : "Account"}</TabsTrigger>
                {isProviderOnly && <TabsTrigger value="provider">{isRTL ? "المزود" : "Provider"}</TabsTrigger>}
                <TabsTrigger value="security">{isRTL ? "الأمان" : "Security"}</TabsTrigger>
                <TabsTrigger value="danger" className="text-destructive">
                  {isRTL ? "خطر" : "Danger"}
                </TabsTrigger>
              </TabsList>

              {/* Account */}
              <TabsContent value="account" className="mt-4 space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{isRTL ? "الاسم الكامل" : "Full name"}</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  <div className="grid gap-2">
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

                  <div className="grid gap-2">
                    <Label>{isRTL ? "نبذة" : "Bio"}</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={isRTL ? "اكتب نبذة قصيرة..." : "Write a short bio..."}
                      className="min-h-[90px]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isRTL ? "حفظ" : "Save"}
                    </Button>

                    <Button variant="outline" asChild className="sm:ms-auto">
                      <Link to="/">{isRTL ? "العودة" : "Back"}</Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Provider (providers only, not admin) */}
              {isProviderOnly && (
                <TabsContent value="provider" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {isRTL ? "حالة حساب المزود" : "Provider status"}
                      </CardTitle>
                      <CardDescription>
                        {isRTL ? "اختصارات وإعدادات للمزود." : "Shortcuts and settings for providers."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isRTL ? "الحالة" : "Status"}</span>
                        <Badge variant={statusBadgeVariant(providerStatus)}>
                          {providerStatus || (isRTL ? "غير محدد" : "—")}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button asChild>
                          <Link to="/provider-dashboard" className="inline-flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            {isRTL ? "لوحة المزود" : "Provider Dashboard"}
                          </Link>
                        </Button>

                        <Button variant="outline" asChild>
                          <Link to="/create-service" className="inline-flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            {isRTL ? "إضافة خدمة" : "Create service"}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "ملاحظة: تفاصيل الخدمات وإدارة البيانات تتم من لوحة المزود."
                      : "Note: Manage services and provider details from the Provider Dashboard."}
                  </p>
                </TabsContent>
              )}

              {/* Security */}
              <TabsContent value="security" className="mt-4 space-y-4">
                {profile.must_change_password && (
                  <Card className="border-destructive/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        {isRTL ? "مطلوب تغيير كلمة المرور" : "Password change required"}
                      </CardTitle>
                      <CardDescription>
                        {isRTL ? "يرجى تغيير كلمة المرور للمتابعة." : "Please change your password to continue."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild>
                        <Link to="/change-password" className="inline-flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          {isRTL ? "تغيير كلمة المرور" : "Change password"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      {isRTL ? "الأمان" : "Security"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? "تحديث كلمة المرور وتسجيل الخروج." : "Update password and sign out."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-col sm:flex-row gap-2">
                    <Button asChild variant="outline">
                      <Link to="/change-password" className="inline-flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        {isRTL ? "تغيير كلمة المرور" : "Change password"}
                      </Link>
                    </Button>

                    <Button variant="destructive" className="sm:ms-auto" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      <span className="ms-2">{isRTL ? "تسجيل الخروج" : "Logout"}</span>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Danger */}
              <TabsContent value="danger" className="mt-4 space-y-4">
                <Card className="border-destructive/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      {isRTL ? "منطقة الخطر" : "Danger zone"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? "حذف الحساب سيقوم بتعطيل حسابك وإخفاء معلوماتك الشخصية."
                        : "Deleting your account will deactivate it and remove your personal details."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {isRTL
                        ? "سيتم تعطيل الحساب (Soft delete). لن يتم حذف البيانات التاريخية مثل الخدمات/المراجعات، لكن سيتم إخفاء اسمك وبياناتك."
                        : "This is a soft delete. Historical data (services/reviews) stays, but your name and personal info are removed."}
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteConfirmText("");
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ms-2">{isRTL ? "حذف الحساب" : "Delete account"}</span>
                    </Button>
                  </CardContent>
                </Card>

                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">
                        {isRTL ? "تأكيد حذف الحساب" : "Confirm account deletion"}
                      </DialogTitle>
                      <DialogDescription>
                        {isRTL
                          ? "اكتب DELETE للتأكيد. لا يمكن التراجع بعد التنفيذ."
                          : "Type DELETE to confirm. This cannot be undone."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                      <Label>DELETE</Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                      />
                      <p className="text-xs text-muted-foreground">
                        {isRTL
                          ? "سيتم تعطيل حسابك وإخفاء اسمك/نبذتك/صورتك."
                          : "Your account will be deactivated and your name/bio/avatar will be removed."}
                      </p>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                        {isRTL ? "إلغاء" : "Cancel"}
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={handleSoftDelete}
                        disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                      >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span className={cn(deleting ? "ms-2" : "")}>{isRTL ? "تأكيد الحذف" : "Confirm delete"}</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
