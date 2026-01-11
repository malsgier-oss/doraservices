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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  Camera,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  PlusCircle,
  ShieldCheck,
  Trash2,
  User2,
  X,
} from "lucide-react";

function statusBadgeVariant(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return "default";
  if (s === "pending") return "secondary";
  if (s === "rejected") return "destructive";
  if (s === "deleted" || s === "inactive" || s === "suspended") return "destructive";
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

function isProviderLike(role: string | null | undefined) {
  const r = (role || "").toLowerCase();
  // DB enum uses "business". Accept legacy "provider" reads.
  return r === "business" || r === "provider";
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [cityId, setCityId] = useState<string>("");

  const [avatarBusy, setAvatarBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [becomingProvider, setBecomingProvider] = useState(false);

  // Route guard
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

  const providerStatus = profile?.provider_status || null;
  const providerStatusLower = (providerStatus || "").toLowerCase();

  const currentRole = (profile?.role || "user").toString().toLowerCase();
  const isProvider = isProviderLike(currentRole);
  const isAdmin = currentRole === "admin";

  const isProviderApproved =
    isProvider &&
    (providerStatusLower === "approved" ||
      providerStatusLower === "" ||
      providerStatusLower === "active" ||
      providerStatusLower === "verified");

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

  const handleBecomeProvider = async () => {
    if (!user) return;

    setBecomingProvider(true);
    try {
      // IMPORTANT: profiles.role is constrained by DB to: user | business | admin
      const { error } = await supabase
        .from("profiles")
        .update({
          role: "business",
          provider_status: "approved",
        })
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: isRTL ? "فشل التفعيل" : "Activation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile?.();

      toast({
        title: isRTL ? "تم تفعيل حساب المزود" : "Provider enabled",
        description: isRTL ? "يمكنك الآن إضافة خدمات" : "You can now create services",
      });
    } finally {
      setBecomingProvider(false);
    }
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

  return (
    <div className="min-h-screen p-4 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <User2 className="h-5 w-5" />
              {isRTL ? "الملف الشخصي" : "Profile"}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {isRTL ? "صفحة بسيطة لإدارة حسابك." : "A simple page to manage your account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Avatar row */}
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
                  <span className="ms-2">
                    {profile.avatar_url ? (isRTL ? "تغيير" : "Change") : isRTL ? "إضافة" : "Add"}
                  </span>
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
                {(profile.status || "active").toLowerCase() === "active"
                  ? isRTL
                    ? "نشط"
                    : "Active"
                  : (profile.status || "").toString()}
              </Badge>

              <Badge variant="outline" className="gap-1">
                {isAdmin ? "Admin" : isProvider ? (isRTL ? "مزود" : "Provider") : isRTL ? "مستخدم" : "User"}
              </Badge>

              {providerStatus && (
                <Badge variant={statusBadgeVariant(providerStatus)}>
                  {isRTL ? "حالة المزود:" : "Provider:"} {providerStatus}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {isRTL ? "الحساب" : "Account"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "تحديث اسمك والنبذة والمدينة." : "Update your name, bio, and city."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Provider */}
        {!isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {isRTL ? "حساب المزود" : "Provider"}
              </CardTitle>
              <CardDescription>
                {isProvider
                  ? isRTL
                    ? "أدوات المزود وإدارة خدماتك."
                    : "Provider tools and your services."
                  : isRTL
                    ? "اضغط زر واحد لتفعيل حساب مزود الخدمة."
                    : "One click to enable a provider account."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {!isProvider ? (
                <Button onClick={handleBecomeProvider} disabled={becomingProvider} className="gap-2">
                  {becomingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                  {isRTL ? "أريد أن أكون مزود" : "I want to be a provider"}
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "الحالة" : "Status"}</span>
                    <Badge variant={statusBadgeVariant(providerStatus)}>{providerStatus || "approved"}</Badge>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button asChild disabled={!isProviderApproved}>
                      <Link to="/provider-dashboard" className="inline-flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {isRTL ? "لوحة المزود" : "Provider Dashboard"}
                      </Link>
                    </Button>

                    <Button variant="outline" asChild disabled={!isProviderApproved}>
                      <Link to="/create-service" className="inline-flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        {isRTL ? "إضافة خدمة" : "Create service"}
                      </Link>
                    </Button>
                  </div>

                  {!isProviderApproved && (
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "حسابك غير مفعل بالكامل بعد." : "Your provider account is not fully active yet."}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security */}
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

          <CardContent className="space-y-3">
            {profile.must_change_password && (
              <div className="rounded-xl border border-destructive/40 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-destructive">
                    {isRTL ? "مطلوب تغيير كلمة المرور" : "Password change required"}
                  </div>
                  <div className="text-muted-foreground">
                    {isRTL ? "يرجى تغيير كلمة المرور للمتابعة." : "Please change your password to continue."}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
          </CardContent>
        </Card>

        {/* Danger */}
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              {isRTL ? "منطقة الخطر" : "Danger"}
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
                ? "هذا حذف Soft delete. لن يتم حذف البيانات التاريخية مثل الخدمات/المراجعات، لكن سيتم إخفاء اسمك وبياناتك."
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
