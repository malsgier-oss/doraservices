import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn, normalizeCategory } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Hammer,
  Paintbrush,
  Battery,
  Calculator,
  Sparkles,
  MapPin,
  LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDigitsOnly } from "@/lib/phoneUtils";

// Icon mapping for dynamic icons from database
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Hammer,
  Paintbrush,
  Battery,
  Calculator,
  Sparkles,
};

// Dora P0: store phone in services row so anonymous users can call/WhatsApp
function normalizeLibyaPhoneForStorage(raw: string | null | undefined) {
  const d = getDigitsOnly(raw || "");
  if (!d) return "";

  // already has country code
  if (d.startsWith("218")) return d;

  // common local format: 0XXXXXXXXX
  if (d.length === 10 && d.startsWith("0")) return `218${d.slice(1)}`;

  // 9 digits (sometimes without leading 0)
  if (d.length === 9) return `218${d}`;

  // fallback
  return d;
}

export default function ServiceCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    subcategory: "",
    bio: "",
    cityId: "",
    subCity: "",
  });

  // Preview URLs (cleanup on change/unmount)
  useEffect(() => {
    const next = imageFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imageFiles]);

  // Get subcategories for selected category
  const selectedCategory = categories?.find((c) => c.id === formData.category);
  const { data: subcategories } = useSubcategories(formData.category || undefined);
  const { data: subCities } = useSubCities(formData.cityId || profile?.city_id || null);

  // Guard (Dora P0): providers (or admins) can add services immediately.
  useEffect(() => {
    if (profileLoading) return;
    if (!profile) return;

    const role = (profile.role || "").toLowerCase();
    const isAdmin = role === "admin";
    // DB enum uses "business"; we also accept legacy "provider" reads.
    const isProvider = role === "business" || role === "provider";

    if (!isAdmin && !isProvider) {
      toast.error(isRTL ? "هذه الصفحة لمقدمي الخدمة فقط" : "This page is for providers only");
      navigate("/profile", { replace: true });
      return;
    }
  }, [profile, profileLoading, navigate, isRTL, user]);

  if (profileLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(isRTL ? "يرجى تسجيل الدخول" : "Please log in");
      navigate("/auth");
      return;
    }

    if (!profile) {
      toast.error(isRTL ? "يرجى إكمال ملفك الشخصي" : "Please complete your profile");
      navigate("/profile");
      return;
    }

    if (!formData.serviceName.trim()) {
      toast.error(isRTL ? "يرجى إدخال اسم الخدمة" : "Please enter service name");
      return;
    }
    if (!formData.category) {
      toast.error(isRTL ? "يرجى اختيار الفئة" : "Please select a category");
      return;
    }

    const selectedCity = cities?.find((c) => c.id === formData.cityId) || null;
    const cityValue =
      (selectedCity
        ? language === "ar"
          ? selectedCity.name_ar || selectedCity.name
          : selectedCity.name || selectedCity.name_ar
        : null) || profile?.city;

    if (!cityValue) {
      toast.error(isRTL ? "يرجى اختيار المدينة" : "Please select your city");
      return;
    }

    // IMPORTANT for P0: phone must exist to allow call/WhatsApp for guests
    const storedPhone = normalizeLibyaPhoneForStorage(profile.phone);
    if (!storedPhone) {
      toast.error(isRTL ? "أضف رقم هاتفك في الملف الشخصي أولاً" : "Add your phone number in Profile first");
      navigate("/profile");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update profile with city if user selected a city (P0.2: keep city_id + city text)
      if (formData.cityId && formData.cityId !== profile?.city_id) {
        await updateProfile({
          city_id: formData.cityId,
          city: cityValue,
        });
      }

      // Update profile with subCity if selected (optional)
      if (formData.subCity && formData.subCity !== profile?.sub_city) {
        await updateProfile({ sub_city: formData.subCity });
      }

      // Use subcategory name if selected, otherwise use category name
      const categoryToUse = formData.subcategory
        ? subcategories?.find((s) => s.id === formData.subcategory)?.name
        : selectedCategory?.name;
      const normalizedCategory = categoryToUse ? normalizeCategory(categoryToUse) : "";

      const providerName = (profile.full_name || "").trim() || (isRTL ? "مقدم الخدمة" : "Provider");

      // ✅ Insert directly to ensure provider_phone/provider_name/city/sub_city are stored for anonymous browsing
      const { data: created, error } = await supabase
        .from("services")
        .insert({
        user_id: user.id,
        title: formData.serviceName.trim(),
        description: formData.bio?.trim() || null,
        category: normalizedCategory,
        price: 0,
        city: cityValue,
        sub_city: formData.subCity || profile.sub_city || null,
        provider_name: providerName,
        provider_phone: storedPhone,
        is_active: true,
        is_visible: true,
        is_paused: false,
      })
        .select("id")
        .single();

      if (error) throw error;

      // Upload up to 5 images (free tier)
      const maxImages = 5;
      const files = imageFiles.slice(0, maxImages);
      let coverUrl: string | null = null;

      if (created?.id && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const imageId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${i}`;
          const path = `${user.id}/${created.id}/${imageId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("service-images")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });
          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("service-images")
            .getPublicUrl(path);

          const publicUrl = publicData?.publicUrl || null;
          if (!publicUrl) {
            throw new Error("Missing public URL for uploaded image");
          }

          // Insert row into service_images (types are not generated yet in this repo)
          const { error: imgRowError } = await supabase
            .from("service_images" as any)
            .insert({
              service_id: created.id,
              url: publicUrl,
              storage_path: path,
              position: i + 1,
            });
          if (imgRowError) throw imgRowError;

          if (i === 0) coverUrl = publicUrl;
        }

        // Backward-compat: keep services.image_url as cover image
        if (coverUrl) {
          await supabase.from("services").update({ image_url: coverUrl }).eq("id", created.id);
        }
      }

      toast.success(t.creator.serviceCreated, {
        description: t.creator.serviceCreatedDesc,
      });

      navigate("/profile");
    } catch (error) {
      console.error(error);
      toast.error(isRTL ? "حدث خطأ أثناء إنشاء الخدمة" : "Error creating service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingSlots = Math.max(0, 5 - imageFiles.length);
  const onPickImages = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).filter(Boolean);

    if (picked.length === 0) return;

    const next = [...imageFiles];
    for (const f of picked) {
      if (next.length >= 5) break;
      next.push(f);
    }

    if (imageFiles.length + picked.length > 5) {
      toast.error(isRTL ? "الخطة المجانية: حتى 5 صور" : "Free plan: up to 5 photos");
    }

    setImageFiles(next);
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const makeCover = (idx: number) => {
    setImageFiles((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.unshift(picked);
      return next;
    });
  };

  return (
    <Layout>
      <div className="container py-6 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.creator.title}</h1>
          <p className="text-muted-foreground mt-1">{t.creator.subtitle}</p>
        </div>

        {/* Photos (free tier: up to 5) */}
        <div className="mb-6">
          <Label className="block mb-2">{isRTL ? "صور الخدمة" : "Service Photos"}</Label>

          <div className={cn("rounded-xl border bg-card p-3", imageFiles.length ? "" : "border-dashed")}> 
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {isRTL ? "الخطة المجانية: حتى 5 صور" : "Free plan: up to 5 photos"}
              </div>

              <div>
                <Button type="button" variant="outline" size="sm" disabled={remainingSlots <= 0 || isSubmitting} asChild>
                  <label className={cn("cursor-pointer", remainingSlots <= 0 && "cursor-not-allowed")}> 
                    <span className="inline-flex items-center gap-2">
                      <ImagePlus className="h-4 w-4" />
                      {isRTL ? "إضافة صور" : "Add photos"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => onPickImages(e.target.files)}
                      disabled={remainingSlots <= 0 || isSubmitting}
                    />
                  </label>
                </Button>
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {imagePreviews.map((src, idx) => (
                  <div key={src} className="relative rounded-lg overflow-hidden border bg-muted">
                    {/* Cover badge */}
                    {idx === 0 && (
                      <div className="absolute top-1 left-1 z-10 text-[10px] px-2 py-0.5 rounded-full bg-black/70 text-white">
                        {isRTL ? "الغلاف" : "Cover"}
                      </div>
                    )}

                    <img src={src} alt="" className="h-24 w-full object-cover" />

                    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => makeCover(idx)}
                        disabled={idx === 0 || isSubmitting}
                      >
                        {isRTL ? "تعيين كغلاف" : "Make cover"}
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeImage(idx)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.creator.category}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
            >
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder={t.creator.selectCategory} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {categories?.map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Home;
                  const displayName = language === "ar" && cat.name_ar ? cat.name_ar : cat.name;
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{displayName}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse justify-end" : "")}>
              <MapPin className="h-4 w-4" />
              {isRTL ? "المدينة" : "City"} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.cityId || profile?.city_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, cityId: value === "none" ? "" : value, subCity: "" })
              }
            >
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder={isRTL ? "اختر مدينتك" : "Select your city"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="none">{isRTL ? "-- اختر مدينة --" : "-- Select city --"}</SelectItem>
                {cities?.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {language === "ar" && city.name_ar ? city.name_ar : city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "يساعد العملاء على إيجادك" : "Helps customers find you"}
            </p>
          </div>

          {(formData.cityId || profile?.city_id) && subCities && subCities.length > 0 && (
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse justify-end" : "")}>
                <MapPin className="h-4 w-4" />
                {isRTL ? "المنطقة" : "Area"}
              </Label>
              <Select
                value={formData.subCity || "none"}
                onValueChange={(value) => setFormData({ ...formData, subCity: value === "none" ? "" : value })}
              >
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder={isRTL ? "اختر منطقتك" : "Select your area"} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="none">{isRTL ? "-- اختر منطقة --" : "-- Select area --"}</SelectItem>
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
            </div>
          )}

          {selectedCategory && subcategories && subcategories.length > 0 && (
            <div className="space-y-2">
              <Label className={cn(isRTL ? "text-right block" : "text-left block")}>
                {isRTL ? "نوع الخدمة" : "Service Type"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {subcategories.map((sub) => {
                  const SubIcon = ICON_MAP[sub.icon] || Wrench;
                  const isSelected = formData.subcategory === sub.id;
                  const displayName = language === "ar" && sub.name_ar ? sub.name_ar : sub.name;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, subcategory: sub.id })}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <SubIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.creator.serviceName}</Label>
            <Input
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              placeholder={t.creator.serviceNamePlaceholder}
              className={cn("rounded-xl h-12", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.creator.bio}</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={t.creator.bioPlaceholder}
              className={cn("min-h-[120px] rounded-xl resize-none", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full rounded-full h-12 text-base">
            {isSubmitting ? t.common.loading : t.creator.createService}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
