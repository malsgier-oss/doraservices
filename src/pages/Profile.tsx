import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertTriangle,
  LayoutDashboard,
  PlusCircle,
  Trash2,
  Camera,
  X,
  Building2,
  ClipboardList,
} from "lucide-react";

function statusBadgeVariant(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "default";
  if (s === "pending") return "secondary";
  if (s === "rejected") return "destructive";
  if (s === "deleted" || s === "inactive") return "destructive";
  return "outline";
}

function extractStoragePathFromPublicUrl(publicUrl: string) {
  const marker = "/storage/v1/object/public/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rest = publicUrl.slice(idx + marker.length);
  const slash = rest.indexOf("/");
  if (slash === -1) return null;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  return { bucket, path: decodeURIComponent(path) };
}

function digitsOnly(v: string) {
  return (v || "").replace(/\D/g, "");
}

function normalizeLibyaPhoneForStorage(raw: string | null | undefined) {
  const d = digitsOnly(raw || "");
  if (!d) return "";

  if (d.startsWith("218")) return d;
  if (d.length === 10 && d.startsWith("0")) return `218${d.slice(1)}`;
  if (d.length === 9) return `218${d}`;
  return d;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<"account" | "provider" | "security" | "danger">("account");

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const [avatarBusy, setAvatarBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Provider application form
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

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

    const st = (profile.status || "").toLowerCase();
    if (st === "deleted" || st === "inactive") {
      navigate("/auth", { replace: true });
    }
  }, [loading, profileLoading, user, profile, navigate]);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
    setCityId(profile.city_id || "");
    setPhone(profile.phone || "");
  }, [profile]);

  const cityLabel = useMemo(() => {
    if (!cities || !cityId) return "";
    const c = cities.find((x) => x.id === cityId);
    if (!c) return "";
    return language === "ar" ? c.name_ar || c.name : c.name || c.name_ar;
  }, [cities, cityId, language]);

  const providerStatus = profile?.provider_status || null;
  const providerStatusLower = (providerStatus || "").toLowerCase();

  const roleLower = ((profile?.role as string) || "").toLowerCase();
  const canUseProviderTools = roleLower === "provider" || roleLower === "admin"; // ✅ P0

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

    const normalizedPhone = normalizeLibyaPhoneForStorage(phone);
    // allow empty phone, but if they type something invalid -> show error
    if (phone.trim() && !normalizedPhone) {
      toast({
        title: isRTL ? "رقم غير صالح" : "Invalid phone",
        description: isRTL ? "أدخل رقم هاتف صحيح" : "Please enter a valid phone number",
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
        phone: normalizedPhone || null,
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

  const openFilePicker = () => fileRef.current?.click();

  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: isRTL ? "ملف غير صالح" : "Invalid file",
        description: isRTL ? "يرجى اختيار صورة فقط" : "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: isRTL ? "حجم كبير" : "File too large",
        description: isRTL ? "الحد الأقصى 5MB" : "Maximum size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setAvatarBusy(true);

    try {
      if (profile.avatar_url) {
        const parsed = extractStoragePathFromPublicUrl(profile.avatar_url);
        if (parsed) {
          await supabase.storage.from(parsed.bucket).remove([parsed.path]);
        }
      }

      const bucket = "avatars";
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

      if (uploadError) {
        toast({
          title: isRTL ? "فشل رفع الصورة" : "Upload failed",
          description:
            uploadError.message +
            (uploadError.message.toLowerCase().includes("bucket")
              ? isRTL
                ? " (تأكد من إنشاء bucket باسم avatars في Supabase Storage)"
                : " (Make sure you created a Storage bucket named 'avatars')"
              : ""),
          variant: "destructive",
        });
        return;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        toast({
          title: isRTL ? "فشل الحصول على رابط الصورة" : "Could not get image URL",
          description: isRTL ? "حاول مرة أخرى" : "Please try again",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) {
        toast({
          title: isRTL ? "فشل تحديث الصورة" : "Update failed",
          description: updateError.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile?.();

      toast({
        title: isRTL ? "تم تحديث الصورة" : "Photo updated",
        description: isRTL ? "تم حفظ صورة الملف الشخصي" : "Your profile photo was saved",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user || !profile) return;

    setAvatarBusy(true);
    try {
      if (profile.avatar_url) {
        const parsed = extractStoragePathFromPublicUrl(profile.avatar_url);
        if (parsed) {
          await supabase.storage.from(parsed.bucket).remove([parsed.path]);
        }
      }

      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      if (error) {
        toast({
          title: isRTL ? "فشل حذف الصورة" : "Remove failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile?.();

      toast({
        title: isRTL ? "تم حذف الصورة" : "Photo removed",
        description: isRTL ? "تمت إزالة صورة الملف الشخصي" : "Your profile photo was removed",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const openProviderApply = () => {
    setBusinessName("");
    setBusinessCategory("");
    setBusinessAddress("");
    setApplyOpen(true);
  };

  const handleProviderApplySubmit = async () => {
    if (!user || !profile) return;

    const name = businessName.trim();
    const cat = businessCategory.trim();
    const addr = businessAddress.trim();

    if (name.length < 2 || cat.length < 2 || addr.length < 3) {
      toast({
        title: isRTL ? "بيانات غير كاملة" : "Incomplete data",
        description: isRTL
          ? "يرجى إدخال اسم النشاط، التصنيف، والعنوان"
          : "Please enter business name, category, and address",
        variant: "destructive",
      });
      return;
    }

    setApplyBusy(true);
    try {
      // P0: immediate provider enable (no waiting)
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          role: "provider",
          provider_status: "approved",
        })
        .eq("user_id", user.id);

      if (updErr) {
        toast({
          title: isRTL ? "فشل الإرسال" : "Submit failed",
          description: updErr.message,
          variant: "destructive",
        });
        return;
      }

      const { error: logErr } = await supabase.from("analytics_events").insert({
        event_type: "provider_application_submitted",
        user_id: user.id,
        target_type: "provider_application",
        target_id: user.id,
        metadata: {
          business_name: name,
          category: cat,
          address: addr,
          submitted_at: new Date().toISOString(),
        },
      });

      if (logErr) console.warn("[provider_application_submitted] log error:", logErr);

      await refreshProfile?.();
      setApplyOpen(false);

      toast({
        title: isRTL ? "تم تفعيل حساب المزود" : "Provider enabled",
        description: isRTL ? "يمكنك الآن إضافة خدمات مباشرة" : "You can now add services immediately",
      });
    } finally {
      setApplyBusy(false);
    }
  };

  if (loading || profileLoading || citiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

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

  const providerStatusText = providerStatus || (isRTL ? "غير محدد" : "—");

  return (
    <div className="min-h-screen p-4 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <User2 className="h-5 w-5" />
              {isRTL ? "الملف الشخصي" : "Profile"}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {isRTL ? "إدارة معلومات حسابك وإعدادات الأمان." : "Manage your account information and security settings."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="text-base font-semibold">{profile.full_name || (isRTL ? "بدون اسم" : "No name")}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{profile.phone || "—"}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                    e.currentTarget.value = "";
                  }}
                />

                <Button variant="outline" onClick={openFilePicker} disabled={avatarBusy}>
                  {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span className="ms-2">{profile.avatar_url ? (isRTL ? "تغيير" : "Change") : isRTL ? "إضافة" : "Add"}</span>
                </Button>

                {profile.avatar_url && (
                  <Button variant="outline" onClick={handleAvatarRemove} disabled={avatarBusy}>
                    <X className="h-4 w-4" />
                    <span className="ms-2">{isRTL ? "حذف" : "Remove"}</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(profile.status)} className="gap-1">
                <ShieldCheck className="h-4 w-4" />
                {(profile.status || "active").toLowerCase() === "active" ? (isRTL ? "نشط" : "Active") : (profile.status || "").toString()}
              </Badge>

              {providerStatus && (
                <Badge variant={statusBadgeVariant(providerStatus)}>
                  {isRTL ? "حالة المزود:" : "Provider:"} {providerStatusText}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className={cn("grid w-full", canUseProviderTools ? "grid-cols-4" : "grid-cols-3")}>
                <TabsTrigger value="account">{isRTL ? "الحساب" : "Account"}</TabsTrigger>
                {canUseProviderTools && <TabsTrigger value="provider">{isRTL ? "المزود" : "Provider"}</TabsTrigger>}
                <TabsTrigger value="security">{isRTL ? "الأمان" : "Security"}</TabsTrigger>
                <TabsTrigger value="danger" className="text-destructive">
                  {isRTL ? "خطر" : "Danger"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="mt-4 space-y-4">
                {!canUseProviderTools && (
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {isRTL ? "كن مزود خدمة" : "Become a Provider"}
                      </CardTitle>
                      <CardDescription>
                        {providerStatusLower === "pending"
                          ? isRTL
                            ? "طلبك قيد المراجعة."
                            : "Your application is under review."
                          : providerStatusLower === "rejected"
                            ? isRTL
                              ? "تم رفض الطلب. يمكنك إعادة التقديم."
                              : "Application rejected. You can re-apply."
                            : isRTL
                              ? "قدّم طلبك لتفعيل حساب المزود وإضافة خدمات مباشرة."
                              : "Apply to enable provider tools and create services immediately."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={openProviderApply} className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        {isRTL ? "تفعيل كمزود" : "Enable as provider"}
                      </Button>

                      {providerStatus && (
                        <Badge variant={statusBadgeVariant(providerStatus)} className="sm:ms-auto w-fit">
                          {isRTL ? "الحالة:" : "Status:"} {providerStatusText}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>{isRTL ? "الاسم الكامل" : "Full name"}</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>

                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {isRTL ? "رقم الهاتف" : "Phone"}
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={isRTL ? "مثال: 092xxxxxxx" : "e.g. 092xxxxxxx"}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? "مهم: بدون رقم هاتف لن يستطيع العملاء الاتصال بك."
                        : "Important: without a phone number, customers can’t call you."}
                    </p>
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

                <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isRTL ? "طلب مزود خدمة" : "Provider Application"}</DialogTitle>
                      <DialogDescription>
                        {isRTL
                          ? "أدخل بيانات نشاطك. سيتم تفعيل حسابك كمزود مباشرة (P0)."
                          : "Enter your business details. Your provider role will be enabled immediately (P0)."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{isRTL ? "اسم النشاط" : "Business name"}</Label>
                        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <Label>{isRTL ? "التصنيف" : "Category"}</Label>
                        <Input
                          value={businessCategory}
                          onChange={(e) => setBusinessCategory(e.target.value)}
                          placeholder={isRTL ? "مثال: صيانة، مطاعم..." : "e.g. Maintenance, Restaurants..."}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{isRTL ? "العنوان" : "Address"}</Label>
                        <Textarea
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          className="min-h-[80px]"
                          placeholder={isRTL ? "المدينة، الشارع، علامة مميزة..." : "City, street, landmark..."}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {isRTL
                          ? "ملاحظة: سيتم تسجيل البيانات للمراجعة لاحقاً، لكنك ستبدأ فوراً."
                          : "Note: details are logged for later review, but you can start immediately."}
                      </p>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={applyBusy}>
                        {isRTL ? "إلغاء" : "Cancel"}
                      </Button>
                      <Button onClick={handleProviderApplySubmit} disabled={applyBusy}>
                        {applyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        <span className={cn(applyBusy ? "ms-2" : "")}>{isRTL ? "تفعيل" : "Enable"}</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {canUseProviderTools && (
                <TabsContent value="provider" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {isRTL ? "إدارة المزود" : "Provider tools"}
                      </CardTitle>
                      <CardDescription>
                        {isRTL ? "لوحة المزود وإدارة خدماتك." : "Provider dashboard and service management."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{isRTL ? "الحالة" : "Status"}</span>
                        <Badge variant={statusBadgeVariant(providerStatus)}>{providerStatusText}</Badge>
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
                </TabsContent>
              )}

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
                    <CardDescription>{isRTL ? "تحديث كلمة المرور وتسجيل الخروج." : "Update password and sign out."}</CardDescription>
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

              <TabsContent value="danger" className="mt-4 space-y-4">
                <Card className="border-destructive/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      {isRTL ? "منطقة الخطر" : "Danger zone"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL ? "حذف الحساب سيقوم بتعطيل حسابك وإخفاء معلوماتك الشخصية." : "Deleting your account will deactivate it and remove your personal details."}
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
                      <DialogTitle className="text-destructive">{isRTL ? "تأكيد حذف الحساب" : "Confirm account deletion"}</DialogTitle>
                      <DialogDescription>
                        {isRTL ? "اكتب DELETE للتأكيد. لا يمكن التراجع بعد التنفيذ." : "Type DELETE to confirm. This cannot be undone."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                      <Label>DELETE</Label>
                      <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? "سيتم تعطيل حسابك وإخفاء اسمك/نبذتك/صورتك." : "Your account will be deactivated and your name/bio/avatar will be removed."}
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
