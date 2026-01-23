import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";



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
import { Switch } from "@/components/ui/switch";

import { toast } from "@/hooks/use-toast";
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
  Briefcase,
} from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { useMyBusiness } from "@/hooks/useMyBusiness";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";

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


export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, profileLoading, signOut, refreshProfile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: myBusiness } = useMyBusiness();
  const { isEnabled: buySellEnabled } = useBuySellEnabled();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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

  // Confirmations when switching away from regular user (buy/sell becomes unavailable).
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [roleConfirmTarget, setRoleConfirmTarget] = useState<"provider" | "business" | null>(null);


  // ---- Role & access (single source of truth) ----
  const currentRole = (profile?.role || "user").toString().toLowerCase();
  const isAdmin = currentRole === "admin";
  const isProviderRole = currentRole === "provider";
  const isBusinessRole = currentRole === "business";
  const isProviderOrBusiness = isProviderRole || isBusinessRole;
  const isRegularUser = !isProviderOrBusiness && !isAdmin;
  const hasBusinessProfile = !!myBusiness;


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

  // If user is provider/business, marketplace is not applicable.
  useEffect(() => {
    if (!isRegularUser) {
      setMarketplaceEnabled(false);
    }
  }, [isRegularUser]);

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

    const payload: any = {
      full_name: trimmed,
      bio: bio?.trim() || null,
      city_id: cityId || null,
      city: cityName,
      sub_city: subCity?.trim() || null,
      marketplace_enabled: isRegularUser && buySellEnabled ? marketplaceEnabled : false,
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

  const doBecomeProvider = async () => {
    if (!user) return;

    if (isBusinessRole || hasBusinessProfile) {
      toast({
        title: isRTL ? "غير متاح" : "Not available",
        description: isRTL ? "لا يمكن الجمع بين متجر ومزود خدمة" : "You can't be both business and provider",
        variant: "destructive",
      });
      return;
    }

    setBecomingProvider(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          // Dora P0: admin-controlled trust.
          // User can request to become a provider, but approval is required.
          role: "provider",
          provider_status: "pending",
          // Prevent conflicting states: provider/business can't use Buy & Sell.
          marketplace_enabled: false,
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
    }
  };

  const doBecomeBusiness = async () => {
    if (!user) return;

    if (isProviderRole) {
      toast({
        title: isRTL ? "غير متاح" : "Not available",
        description: isRTL ? "لا يمكن الجمع بين مزود ومتجر" : "You can't be both provider and business",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "business", marketplace_enabled: false } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: isRTL ? "فشل" : "Failed", description: error.message, variant: "destructive" });
      return;
    }

    await refreshProfile?.();
    navigate("/business-dashboard");
  };

  const handleBecomeProviderClick = () => {
    if (!isRegularUser) return;

    if (buySellEnabled && marketplaceEnabled) {
      setRoleConfirmTarget("provider");
      setRoleConfirmOpen(true);
      return;
    }

    void doBecomeProvider();
  };

  const handleBecomeBusinessClick = () => {
    if (!isRegularUser) return;

    if (buySellEnabled && marketplaceEnabled) {
      setRoleConfirmTarget("business");
      setRoleConfirmOpen(true);
      return;
    }

    void doBecomeBusiness();
  };

  const handleConfirmRoleChange = () => {
    const target = roleConfirmTarget;
    setRoleConfirmOpen(false);
    setRoleConfirmTarget(null);

    if (target === "provider") {
      void doBecomeProvider();
      return;
    }
    if (target === "business") {
      void doBecomeBusiness();
      return;
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
                    {isAdmin ? "Admin" : isBusinessRole ? (isRTL ? "متجر" : "Business") : isProviderRole ? (isRTL ? "مزود" : "Provider") : isRTL ? "مستخدم" : "User"}
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
            className={cn("grid w-full rounded-2xl h-12", "grid-cols-3")}
          >
            <TabsTrigger value="account" className="rounded-xl">
              {isRTL ? "الحساب" : "Account"}
            </TabsTrigger>
            <TabsTrigger value="role" className="rounded-xl">
              {isRTL ? "الدور" : "Role"}
            </TabsTrigger>
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
                    className="h-12 rounded-xl"
                    placeholder={isRTL ? "09XXXXXXXX" : "09XXXXXXXX"}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "رقم الهاتف للعرض فقط ولا يمكن تعديله من هنا."
                      : "Phone number is display-only and can’t be edited here."}
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

          
          {/* Role */}
          <TabsContent value="role" className="mt-4 space-y-4">
            {isAdmin ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {isRTL ? "حساب إداري" : "Admin account"}
                  </CardTitle>
                  <CardDescription>
                    {isRTL ? "هذا القسم يركز على بيانات الحساب فقط." : "This page focuses on account settings only."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {isRTL
                    ? "كإداري، لديك صلاحيات خاصة. لا يظهر هنا تفعيل الشراء والبيع أو إعدادات المزود."
                    : "As an admin, you have elevated access. Buy & Sell toggles and provider onboarding are hidden here."}
                </CardContent>
              </Card>
            ) : isRegularUser ? (
              <>
                {/* Buy & Sell (regular users only) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {isRTL ? "الشراء والبيع" : "Buy & Sell"}
                    </CardTitle>
                    <CardDescription>
                      {!buySellEnabled
                        ? isRTL
                          ? "ميزة الشراء والبيع غير مفعلة حالياً."
                          : "Buy & Sell is currently disabled."
                        : isRTL
                          ? "فعّل الإعلانات للوصول للوحة المستخدم وإعلاناتك."
                          : "Enable listings to access your dashboard and listings."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {buySellEnabled ? (
                      <>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                          <div className="min-w-0">
                            <div className="font-medium">
                              {isRTL ? "تفعيل الإعلانات" : "Enable listings"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {marketplaceEnabled
                                ? isRTL
                                  ? "مفعل"
                                  : "Enabled"
                                : isRTL
                                  ? "غير مفعل"
                                  : "Disabled"}
                            </div>
                          </div>
                          <Switch
                            checked={marketplaceEnabled}
                            onCheckedChange={(v) => setMarketplaceEnabled(Boolean(v))}
                            disabled={!buySellEnabled}
                            aria-label="marketplace"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-xl justify-start gap-2"
                            onClick={() => navigate("/dashboard")}
                            disabled={!marketplaceEnabled}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            {isRTL ? "لوحة المستخدم" : "User Dashboard"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 rounded-xl justify-start gap-2"
                            onClick={() => navigate("/buy-sell/my-listings")}
                            disabled={!marketplaceEnabled}
                          >
                            <ShoppingBag className="h-4 w-4" />
                            {isRTL ? "إعلاناتي" : "My Listings"}
                          </Button>
                        </div>

                        {!marketplaceEnabled && (
                          <p className="text-xs text-muted-foreground">
                            {isRTL
                              ? "فعّل الإعلانات أولاً للوصول إلى لوحة المستخدم وإعلاناتك."
                              : "Enable listings first to access your dashboard and listings."}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                        {isRTL
                          ? "هذه الميزة غير متاحة حالياً."
                          : "This feature is not available right now."}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Role selection (regular users only) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User2 className="h-4 w-4" />
                      {isRTL ? "اختيار نوع الحساب" : "Choose account type"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? "التحول إلى مزود/متجر سيوقف الوصول للشراء والبيع."
                        : "Switching to Provider/Business disables Buy & Sell access."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <div className="min-w-0">
                        <div className="font-medium">{isRTL ? "مزود خدمة" : "Provider"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? "يتطلب موافقة الإدارة." : "Requires admin approval."}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBecomeProviderClick}
                        disabled={becomingProvider || hasBusinessProfile}
                      >
                        {becomingProvider ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        <span className="ms-2">{isRTL ? "طلب" : "Request"}</span>
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <div className="min-w-0">
                        <div className="font-medium">{isRTL ? "متجر" : "Business"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? "أنشئ ملف متجر ثم أضف عروضك." : "Create a business profile and add deals."}
                        </div>
                      </div>
                      <Button type="button" variant="outline" onClick={handleBecomeBusinessClick}>
                        <Briefcase className="h-4 w-4" />
                        <span className="ms-2">{isRTL ? "فتح" : "Open"}</span>
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "ملاحظة: لا يمكن الجمع بين مزود خدمة ومتجر." : "Note: you cannot be both provider and business."}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Services (providers/businesses only) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {isRTL ? "الخدمات" : "Services"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? "إدارة خدماتك ولوحة التحكم."
                        : "Manage your services and dashboard."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {providerStatus && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                        <div className="min-w-0">
                          <div className="font-medium">{isRTL ? "حالة المزود" : "Provider status"}</div>
                          <div className="text-xs text-muted-foreground">{providerStatus}</div>
                        </div>
                        <Badge variant={statusBadgeVariant(providerStatus)}>{providerStatus}</Badge>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-xl justify-start gap-2"
                        onClick={() => navigate("/dashboard")}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {isBusinessRole
                          ? isRTL
                            ? "لوحة المتجر"
                            : "Business Dashboard"
                          : isRTL
                            ? "لوحة المزود"
                            : "Provider Dashboard"}
                      </Button>

                      {!isBusinessRole && (
                        <Button variant="outline" asChild className="h-12 rounded-xl justify-start gap-2">
                          <Link to="/create-service">
                            <Building2 className="h-4 w-4" />
                            {isRTL ? "إضافة خدمة" : "Add service"}
                          </Link>
                        </Button>
                      )}
                    </div>

                    {(providerStatus || "").toLowerCase() === "pending" && (
                      <p className="text-xs text-muted-foreground">
                        {isRTL
                          ? "طلبك تحت المراجعة. الخدمات قد لا تظهر للناس حتى الموافقة."
                          : "Your request is under review. Services may not be visible until approved."}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Role note */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User2 className="h-4 w-4" />
                      {isRTL ? "ملاحظة" : "Note"}
                    </CardTitle>
                    <CardDescription>
                      {isRTL
                        ? "الشراء والبيع غير متاح للمزودين/المتاجر."
                        : "Buy & Sell is hidden for providers/businesses."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {isRTL
                      ? "إذا كنت تحتاج الوصول لإعلاناتك، يجب الرجوع إلى حساب مستخدم (يتطلب قرار إداري/تغيير الدور)."
                      : "If you need access to listings, you must switch back to a regular user account (role change required)."}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Confirm dialog when switching role (regular user -> provider/business) */}
            <Dialog open={roleConfirmOpen} onOpenChange={setRoleConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isRTL ? "تأكيد تغيير نوع الحساب" : "Confirm account type change"}
                  </DialogTitle>
                  <DialogDescription>
                    {roleConfirmTarget === "provider"
                      ? isRTL
                        ? "التحول إلى مزود سيوقف الوصول للشراء والبيع ويخفي أدوات الإعلانات."
                        : "Switching to Provider will disable Buy & Sell access and hide listing tools."
                      : roleConfirmTarget === "business"
                        ? isRTL
                          ? "التحول إلى متجر سيوقف الوصول للشراء والبيع ويخفي أدوات الإعلانات."
                          : "Switching to Business will disable Buy & Sell access and hide listing tools."
                        : ""}
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setRoleConfirmOpen(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button onClick={handleConfirmRoleChange}>
                    {isRTL ? "متابعة" : "Continue"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
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

      {/* Keep bottom navigation visible on Profile (mobile-first). */}
      <MobileNav />
    </div>
  );
}
