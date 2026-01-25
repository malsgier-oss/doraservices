import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";

import { cleanPhoneForStorage, isValidLibyanPhone } from "@/lib/phoneUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { toast, useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2,
  Camera,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  User2,
  X,
  LayoutDashboard,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
} from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { usePushAndSync } from "@/hooks/usePushAndSync";

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
  return r === "provider" || r === "business";
}

function NotificationsCard({ isRTL }: { isRTL: boolean }) {
  const {
    supported,
    pushPermission,
    isSubscribed,
    requestPushSubscription,
    turnOffPush,
  } = usePushAndSync();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  if (!supported) return null;

  const handleToggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) {
        const ok = await requestPushSubscription();
        toast({
          title: ok
            ? isRTL ? "تم تفعيل الإشعارات" : "Notifications enabled"
            : isRTL ? "تعذر التفعيل" : "Could not enable",
          variant: ok ? "default" : "destructive",
        });
      } else {
        const ok = await turnOffPush();
        toast({
          title: ok
            ? isRTL ? "تم إيقاف الإشعارات" : "Notifications disabled"
            : isRTL ? "تعذر الإيقاف" : "Could not disable",
          variant: ok ? "default" : "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {isRTL ? "الإشعارات" : "Notifications"}
        </CardTitle>
        <CardDescription>
          {isRTL
            ? "استقبل تذكيرات وعروضاً عندما تكون التطبيق مغلقاً."
            : "Get reminders and updates when the app is closed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {pushPermission === "denied"
              ? isRTL ? "الإشعارات معطّلة من المتصفح" : "Notifications blocked by browser"
              : isSubscribed
                ? isRTL ? "الإشعارات مفعّلة" : "Notifications on"
                : isRTL ? "فعّل الإشعارات" : "Enable notifications"}
          </span>
          <Switch
            checked={isSubscribed}
            disabled={busy || pushPermission === "denied"}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { isEnabled: buySellEnabled } = useBuySellEnabled();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); // only editable if empty in DB
  const [bio, setBio] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [subCity, setSubCity] = useState<string>("");

  const { data: subCities } = useSubCities(cityId || null);

  const [avatarBusy, setAvatarBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [becomingProvider, setBecomingProvider] = useState(false);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(false);
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Route guard
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

  // Fill form fields
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setBio(profile.bio || "");
    setCityId(profile.city_id || "");
    setSubCity(profile.sub_city || "");
    setPhone((profile.phone || (typeof (user as any)?.user_metadata?.phone === "string" ? (user as any).user_metadata.phone : "")) as string); // fallback to auth metadata
    setMarketplaceEnabled(Boolean((profile as any).marketplace_enabled));
  }, [profile, user]);

  // If buy/sell is disabled platform-wide, disable marketplace locally (user can't enable listings).
  useEffect(() => {
    if (!buySellEnabled) {
      setMarketplaceEnabled(false);
    }
  }, [buySellEnabled]);

  // Auto-save marketplace_enabled only when the user toggles it (not on initial load from profile)
  const profileMarketplace = Boolean((profile as any)?.marketplace_enabled);
  useEffect(() => {
    if (!user || !profile) return;
    // Skip save when value matches profile — avoids "Saved, listing preference updated" on every visit
    if (marketplaceEnabled === profileMarketplace) return;

    const saveMarketplace = async () => {
      setSavingMarketplace(true);
      const { error } = await supabase
        .from("profiles")
        .update({ marketplace_enabled: marketplaceEnabled })
        .eq("user_id", user.id);
      setSavingMarketplace(false);

      if (error) {
        toast({
          title: isRTL ? "فشل الحفظ" : "Failed to save",
          description: error.message,
          variant: "destructive",
        });
        setMarketplaceEnabled(profileMarketplace); // Revert on error
      } else {
        toast({
          title: isRTL ? "تم الحفظ" : "Saved",
          description: isRTL ? "تم تحديث تفضيلات الإعلانات" : "Listing preference updated",
        });
      }
    };

    const timer = setTimeout(saveMarketplace, 500);
    return () => clearTimeout(timer);
  }, [marketplaceEnabled, profileMarketplace, user, profile, isRTL]);

  // If city changes and the selected sub-city doesn't belong to the city, clear it.
  useEffect(() => {
    if (!subCity) return;
    if (!cityId) return;
    if (!subCities) return;

    const exists = subCities.some((sc) => sc.name === subCity || sc.name_ar === subCity);
    if (!exists) setSubCity("");
  }, [cityId, subCities, subCity]);

  const cityLabel = useMemo(() => {
    if (!cities || !cityId) return "";
    const c = cities.find((x) => x.id === cityId);
    if (!c) return "";
    return language === "ar" ? c.name_ar || c.name : c.name || c.name_ar;
  }, [cities, cityId, language]);

  const providerStatus = profile?.provider_status || null;

  const currentRole = (profile?.role || "user").toString().toLowerCase();
  const isProvider = isProviderLike(currentRole);
  const isAdmin = currentRole === "admin";

  // Dora principle: Profile pages stay focused on account/security/personal data.
  // "Become provider" is available only for non-remixed users.
  const showProviderTab = !isAdmin && !isProvider;

  const accountLocked = useMemo(() => {
    const st = (profile?.status || "").toLowerCase();
    return st === "suspended" || st === "deleted" || st === "inactive";
  }, [profile?.status]);

  const showWelcome = useMemo(() => {
    const q = new URLSearchParams(location.search);
    return q.get("welcome") === "1";
  }, [location.search]);

  const defaultTab = useMemo(() => {
    if (showWelcome) return "role";
    return "account";
  }, [showWelcome]);

  const canEditPhone = useMemo(() => {
    // Editing phone can break login (phone->internal email mapping).
    // P0 rule: phone is never editable after account creation.
    return false;
  }, []);

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

    let cleanedPhone: string | null = null;
    // Phone is never editable, so we don't need to validate or update it

    const selected = cities?.find((c) => c.id === cityId);
    const cityName = selected
      ? language === "ar"
        ? selected.name_ar || selected.name
        : selected.name || selected.name_ar
      : null;

    setSaving(true);

    const payload: any = {
      full_name: trimmed,
      bio: bio?.trim() || null,
      city_id: cityId || null,
      city: cityName,
      sub_city: subCity?.trim() || null,
      marketplace_enabled: marketplaceEnabled,
    };

    const { error } = await supabase.from("profiles").update(payload).eq("user_id", user.id);

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

    // If we were redirected here from a protected route, go back after completing the profile.
    const from = (location.state as any)?.from as
      | { pathname?: string; search?: string; hash?: string }
      | undefined;
    if (from?.pathname) {
      navigate(`${from.pathname}${from.search || ""}${from.hash || ""}`, { replace: true });
      return;
    }

    // Post-signup welcome flow: after profile completion, send the user to Hub.
    if (showWelcome) {
      navigate("/", { replace: true });
    }
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

  const handleRequestProvider = () => {
    setTermsAgreed(false);
    setTermsDialogOpen(true);
  };

  const handleBecomeProvider = async () => {
    if (!user) return;
    if (!termsAgreed) {
      toast({
        title: isRTL ? "يجب الموافقة على الشروط" : "Terms agreement required",
        description: isRTL ? "يرجى الموافقة على الشروط والأحكام أولاً" : "Please agree to the terms and conditions first",
        variant: "destructive",
      });
      return;
    }

    setBecomingProvider(true);
    setTermsDialogOpen(false);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          // Dora P0: admin-controlled trust.
          // User can request to become a provider, but approval is required.
          role: "provider",
          provider_status: "pending",
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
        title: isRTL ? "تم إرسال طلب المزود" : "Provider request sent",
        description: isRTL
          ? "حسابك تحت المراجعة. يمكنك إضافة خدمات لكنها لن تظهر للناس حتى الموافقة."
          : "You're under review. You can add services, but they won't be visible until approved.",
      });
    } finally {
      setBecomingProvider(false);
      setTermsAgreed(false);
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

    // P0: hide any services owned by this user so they no longer appear in Hub/search.
    // (There is no FK between services.user_id and profiles.user_id, and guests may not be able
    // to read profiles due to RLS, so we enforce visibility at the services row too.)
    const { error: hideServicesError } = await supabase
      .from("services")
      .update({
        is_active: false,
        is_visible: false,
        is_paused: true,
      })
      .eq("user_id", user.id);

    if (hideServicesError) {
      console.warn("Failed to hide services for deleted user:", hideServicesError);
    }

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
        {/* welcome banner removed (Tripoli-only onboarding is communicated in signup) */}

        {/* Modern Header Card */}
        <Card className="overflow-hidden">
          <div className="bg-primary/10">
            <div className="p-4 sm:p-6 flex items-center gap-4">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden border bg-muted flex items-center justify-center shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-2xl font-semibold truncate">
                  {profile.full_name || (isRTL ? "بدون اسم" : "No name")}
                </div>

                <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span dir="ltr" className="truncate">
                    {profile.phone || phone || "—"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(profile.status)} className="gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    {(profile.status || "active").toLowerCase() === "active"
                      ? isRTL
                        ? "نشط"
                        : "Active"
                      : (profile.status || "").toString()}
                  </Badge>

                  <Badge variant="outline">
                    {isAdmin ? "Admin" : isProvider ? (isRTL ? "مزود" : "Provider") : isRTL ? "مستخدم" : "User"}
                  </Badge>

                  {cityLabel && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-4 w-4" />
                      {cityLabel}
                      {subCity ? ` • ${subCity}` : ""}
                    </Badge>
                  )}

                  {providerStatus && (
                    <Badge variant={statusBadgeVariant(providerStatus)}>
                      {isRTL ? "المزود:" : "Provider:"} {providerStatus}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Avatar actions */}
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

                <Button variant="outline" onClick={openFilePicker} disabled={avatarBusy} className="h-11 rounded-xl">
                  {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span className="ms-2">
                    {profile.avatar_url ? (isRTL ? "تغيير" : "Change") : isRTL ? "إضافة" : "Add"}
                  </span>
                </Button>

                {profile.avatar_url && (
                  <Button
                    variant="outline"
                    onClick={handleAvatarRemove}
                    disabled={avatarBusy}
                    className="h-11 rounded-xl"
                  >
                    <X className="h-4 w-4" />
                    <span className="ms-2">{isRTL ? "حذف" : "Remove"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

        </Card>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList
            className={cn(
              "grid w-full rounded-2xl h-12",
              buySellEnabled && showProviderTab && "grid-cols-5",
              buySellEnabled && !showProviderTab && "grid-cols-4",
              !buySellEnabled && showProviderTab && "grid-cols-4",
              !buySellEnabled && !showProviderTab && "grid-cols-3",
            )}
          >
            <TabsTrigger value="account" className="rounded-xl">
              {isRTL ? "الحساب" : "Account"}
            </TabsTrigger>
            <TabsTrigger value="role" className="rounded-xl">
              {isRTL ? "الدور" : "Role"}
            </TabsTrigger>
            {buySellEnabled && (
              <TabsTrigger value="listings" className="rounded-xl">
                {isRTL ? "الإعلانات" : "Listings"}
              </TabsTrigger>
            )}
            {showProviderTab && (
              <TabsTrigger value="provider" className="rounded-xl">
                {isRTL ? "المزود" : "Provider"}
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="rounded-xl">
              {isRTL ? "الأمان" : "Security"}
            </TabsTrigger>
          </TabsList>

          {/* Account */}
          <TabsContent value="account" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  {isRTL ? "بيانات الحساب" : "Account details"}
                </CardTitle>
                <CardDescription>{isRTL ? "حدث بياناتك الأساسية." : "Update your basic info."}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>{isRTL ? "الاسم الكامل" : "Full name"}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" />
                </div>

                <div className="grid gap-2">
                  <Label>{isRTL ? "رقم الهاتف" : "Phone number"}</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 rounded-xl"
                    placeholder={isRTL ? "09XXXXXXXX" : "09XXXXXXXX"}
                    disabled={!canEditPhone}
                    readOnly={!canEditPhone}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "لأسباب أمنية، رقم الهاتف لا يمكن تعديله بعد إنشاء الحساب."
                      : "For security, phone number cannot be edited after account creation."}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {isRTL ? "الموقع" : "Location"}
                  </div>

                  <div className="grid gap-2">
                    <Label>{isRTL ? "المدينة" : "City"}</Label>
                    <Select value={cityId} onValueChange={setCityId}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={isRTL ? "اختر المدينة" : "Select city"} />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-popover border border-border shadow-lg">
                        {(cities || []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {language === "ar" ? c.name_ar || c.name : c.name || c.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>{isRTL ? "المنطقة" : "Sub-city"}</Label>

                    {cityId && subCities && subCities.length > 0 ? (
                      <Select value={subCity || "none"} onValueChange={(v) => setSubCity(v === "none" ? "" : v)}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select sub-city"} />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-popover border border-border shadow-lg">
                          <SelectItem value="none">{isRTL ? "بدون" : "None"}</SelectItem>
                          {subCities.map((sc) => {
                            const label = language === "ar" && sc.name_ar ? sc.name_ar : sc.name;
                            return (
                              <SelectItem key={sc.id} value={label}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={subCity}
                        onChange={(e) => setSubCity(e.target.value)}
                        placeholder={isRTL ? "اكتب منطقتك (اختياري)" : "Type your area (optional)"}
                        className="h-12 rounded-xl"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>{isRTL ? "نبذة" : "Bio"}</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={isRTL ? "اكتب نبذة قصيرة..." : "Write a short bio..."}
                    className="min-h-[100px] rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSave} disabled={saving} className="h-12 rounded-xl">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    <span className={cn(saving ? "ms-2" : "")}>{isRTL ? "حفظ" : "Save changes"}</span>
                  </Button>

                  <Button variant="outline" asChild className="h-12 rounded-xl sm:ms-auto">
                    <Link to="/">{isRTL ? "العودة" : "Back"}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings - enable selling and my listings (when buy/sell is enabled) */}
          {buySellEnabled && (
            <TabsContent value="listings" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    {isRTL ? "الإعلانات" : "Listings"}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? "تفعيل البيع وإدارة إعلاناتك." : "Enable selling and manage your listings."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{isRTL ? "تفعيل البيع (إعلانات)" : "Enable selling (Listings)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {!buySellEnabled
                          ? (isRTL ? "ميزة الشراء والبيع غير مفعلة حالياً." : "Buy & Sell is currently disabled.")
                          : (isRTL ? "يفتح أدوات الإعلانات." : "Unlocks listing tools.")}
                      </div>
                    </div>
                    <Switch
                      checked={marketplaceEnabled}
                      onCheckedChange={(v) => setMarketplaceEnabled(Boolean(v))}
                      disabled={!buySellEnabled || (isProvider ? false : !marketplaceEnabled) || savingMarketplace}
                      aria-label="marketplace"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-xl justify-start gap-2"
                      onClick={() => navigate("/buy-sell/my-listings")}
                      disabled={!buySellEnabled || (!marketplaceEnabled && !isProvider)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {isRTL ? "إعلاناتي" : "My Listings"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Role */}
          <TabsContent value="role" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {isRTL ? "اختيار الدور" : "Choose your role"}
                </CardTitle>
                <CardDescription>
                  {isRTL ? "التحول إلى مزود خدمة أو إدارة حالة مزودك." : "Become a provider or manage your provider status."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider */}
                <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{isRTL ? "مزود خدمة" : "Provider"}</div>
                      <div className="text-xs text-muted-foreground">
                        {isRTL ? "يتطلب موافقة الإدارة." : "Requires admin approval."}
                      </div>
                    </div>
                    {providerStatus ? (
                      <Badge
                        variant={
                          providerStatus === "approved"
                            ? "default"
                            : providerStatus === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="whitespace-nowrap"
                      >
                        {providerStatus === "approved" && (
                          <>
                            <CheckCircle className="h-3 w-3 me-1" />
                            {isRTL ? "موافق عليه" : "Approved"}
                          </>
                        )}
                        {providerStatus === "pending" && (
                          <>
                            <Clock className="h-3 w-3 me-1" />
                            {isRTL ? "قيد المراجعة" : "Pending"}
                          </>
                        )}
                        {providerStatus === "rejected" && (
                          <>
                            <XCircle className="h-3 w-3 me-1" />
                            {isRTL ? "مرفوض" : "Rejected"}
                          </>
                        )}
                      </Badge>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRequestProvider}
                        disabled={becomingProvider || isProvider}
                      >
                        {becomingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                        <span className="ms-2">{isRTL ? "تفعيل" : "Enable"}</span>
                      </Button>
                    )}
                  </div>
                  {providerStatus && (
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                      {providerStatus === "pending" && (
                        <>
                          {isRTL
                            ? "طلبك قيد المراجعة من قبل الإدارة. الخدمات التي تضيفها ستكون مخفية حتى الموافقة."
                            : "Your request is under review by admin. Services you add will be hidden until approval."}
                        </>
                      )}
                      {providerStatus === "approved" && (
                        <>
                          {isRTL
                            ? "حسابك معتمد كمزود. يمكنك الآن إنشاء وإدارة الخدمات."
                            : "Your account is approved as a provider. You can now create and manage services."}
                        </>
                      )}
                      {providerStatus === "rejected" && (
                        <>
                          {isRTL
                            ? "للأسف، تم رفض طلبك. يرجى التواصل مع الدعم للمزيد من المعلومات."
                            : "Your provider request was rejected. Please contact support for more information."}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Provider (upgrade only) */}
          {showProviderTab && (
            <TabsContent value="provider" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {isRTL ? "أصبح مزود خدمة" : "Become a provider"}
                  </CardTitle>
                  <CardDescription>
                    {isRTL
                      ? "ستتم مراجعة طلبك من الإدارة قبل ظهور خدماتك للناس."
                      : "Your request will be reviewed by admin before your services become visible."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Button
                    onClick={handleRequestProvider}
                    disabled={becomingProvider}
                    className="h-12 rounded-xl w-full gap-2"
                  >
                    {becomingProvider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    {isRTL ? "أريد أن أكون مزود" : "I want to be a provider"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "بعد الموافقة، ستجد لوحة المزود في الشريط السفلي."
                      : "After approval, you'll find Dashboard in the bottom navigation."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Security */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  {isRTL ? "الأمان" : "Security"}
                </CardTitle>
                <CardDescription>
                  {isRTL ? "تغيير كلمة المرور وتسجيل الخروج." : "Change password and sign out."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild variant="outline" className="h-12 rounded-xl justify-start gap-2">
                    <Link to="/change-password">
                      <KeyRound className="h-4 w-4" />
                      {isRTL ? "تغيير كلمة المرور" : "Change password"}
                    </Link>
                  </Button>

                  <Button variant="destructive" className="h-12 rounded-xl sm:ms-auto" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span className="ms-2">{isRTL ? "تسجيل الخروج" : "Logout"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <NotificationsCard isRTL={!!isRTL} />

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
                <Button
                  variant="destructive"
                  className="h-12 rounded-xl"
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Terms of Use Dialog for Provider Request */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRTL ? "الشروط والأحكام" : "Terms of Use"}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? "يرجى قراءة الشروط والأحكام والموافقة عليها قبل أن تصبح مزود خدمة."
                : "Please read and agree to the terms and conditions before becoming a provider."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className={`prose max-w-none text-sm ${isRTL ? "text-right" : "text-left"}`}>
              <p className="whitespace-pre-wrap">
                {isRTL
                  ? `الشروط والأحكام لمزودي الخدمة

1. الموافقة على الشروط
   باستخدامك لمنصة دورا كمزود خدمة، فإنك توافق على الالتزام بهذه الشروط والأحكام.

2. المسؤولية
   أنت مسؤول عن جميع الخدمات التي تقدمها والتفاعلات مع العملاء.

3. السلوك المهني
   يجب أن تتصرف بشكل مهني واحترافي في جميع التفاعلات مع العملاء.

4. الموافقة الإدارية
   طلبك كمزود خدمة سيتم مراجعته من قبل الإدارة. الخدمات التي تضيفها ستكون مخفية حتى الموافقة.

5. دقة المعلومات
   يجب أن تكون جميع المعلومات التي تقدمها دقيقة وصحيحة.

6. انتهاك الشروط
   قد يؤدي انتهاك هذه الشروط إلى تعليق أو إلغاء حسابك.

بالموافقة على هذه الشروط، فإنك تقر بأنك قرأت وفهمت جميع البنود أعلاه.`
                  : `Terms of Use for Service Providers

1. Agreement to Terms
   By using Dora platform as a service provider, you agree to comply with these terms and conditions.

2. Responsibility
   You are responsible for all services you provide and interactions with customers.

3. Professional Conduct
   You must act professionally and respectfully in all interactions with customers.

4. Admin Approval
   Your provider request will be reviewed by administration. Services you add will be hidden until approval.

5. Information Accuracy
   All information you provide must be accurate and truthful.

6. Violation of Terms
   Violation of these terms may result in suspension or cancellation of your account.

By agreeing to these terms, you acknowledge that you have read and understood all the above provisions.`}
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <Checkbox
                id="terms-agree"
                checked={termsAgreed}
                onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="terms-agree"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {isRTL
                  ? "أوافق على الشروط والأحكام وأريد أن أصبح مزود خدمة"
                  : "I agree to the terms and conditions and want to become a provider"}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTermsDialogOpen(false)} disabled={becomingProvider}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleBecomeProvider} disabled={!termsAgreed || becomingProvider}>
              {becomingProvider ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className={cn("ms-2")}>{isRTL ? "جاري المعالجة..." : "Processing..."}</span>
                </>
              ) : (
                <>{isRTL ? "موافق ومتابعة" : "Agree & Continue"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keep bottom navigation visible on Profile (mobile-first). */}
      <MobileNav />
    </div>
  );
}
