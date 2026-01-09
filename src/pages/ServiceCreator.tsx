import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServices } from "@/hooks/useServices";
import { useProfile } from "@/hooks/useProfile";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper,
  Wrench, Droplets, Wind, Fuel, ClipboardCheck, Sun, Cog, Scale,
  Languages, Camera, UtensilsCrossed, Stethoscope, Activity,
  Hammer, Paintbrush, Battery, Calculator, Sparkles,
  MapPin,
  LucideIcon
} from "lucide-react";

// Icon mapping for dynamic icons from database
const ICON_MAP: Record<string, LucideIcon> = {
  Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper,
  Wrench, Droplets, Wind, Fuel, ClipboardCheck, Sun, Cog, Scale,
  Languages, Camera, UtensilsCrossed, Stethoscope, Activity,
  Hammer, Paintbrush, Battery, Calculator, Sparkles
};

export default function ServiceCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { createService } = useServices();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    subcategory: "",
    bio: "",
    city: "",
    subCity: "",
  });

  // Get subcategories for selected category
  const selectedCategory = categories?.find(c => c.id === formData.category);
  const { data: subcategories } = useSubcategories(formData.category || undefined);
  const { data: subCities } = useSubCities(formData.city || profile?.city || null);

  // Guard: only approved providers (or admins) can add services.
  useEffect(() => {
    if (profileLoading) return;
    if (!profile) return;

    const role = (profile.role || "").toLowerCase();
    const providerStatus = (profile.provider_status || "").toLowerCase();
    const isAdmin = role === "admin";
    const isProvider = role === "provider";

    if (!isAdmin && !isProvider) {
      toast.error(isRTL ? "هذه الصفحة لمقدمي الخدمة فقط" : "This page is for providers only");
      navigate("/profile", { replace: true });
      return;
    }

    if (!isAdmin && providerStatus !== "approved") {
      toast.info(isRTL ? "حسابك كمزود خدمة قيد المراجعة" : "Your provider account is pending approval");
      navigate("/pending-verification", { replace: true });
    }
  }, [profile, profileLoading, navigate, isRTL]);

  // Show loading while checking verification
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

    if (!formData.serviceName.trim()) {
      toast.error(isRTL ? "يرجى إدخال اسم الخدمة" : "Please enter service name");
      return;
    }
    if (!formData.category) {
      toast.error(isRTL ? "يرجى اختيار الفئة" : "Please select a category");
      return;
    }
    const cityValue = formData.city || profile?.city;
    if (!cityValue) {
      toast.error(isRTL ? "يرجى اختيار المدينة" : "Please select your city");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update profile with city if provided
      if (formData.city && formData.city !== profile?.city) {
        await updateProfile({ city: formData.city });
      }

      // Use subcategory name if selected, otherwise use category name
      const categoryToUse = formData.subcategory 
        ? subcategories?.find(s => s.id === formData.subcategory)?.name 
        : selectedCategory?.name;

      const { error } = await createService({
        title: formData.serviceName,
        description: formData.bio || undefined,
        category: categoryToUse || "",
        price: 0, // Price no longer used but required by DB
      });

      if (error) throw error;
      
      toast.success(t.creator.serviceCreated, {
        description: t.creator.serviceCreatedDesc,
      });
      
      navigate("/profile");
    } catch (error) {
      toast.error(isRTL ? "حدث خطأ أثناء إنشاء الخدمة" : "Error creating service");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.creator.title}</h1>
          <p className="text-muted-foreground mt-1">{t.creator.subtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>
              {t.creator.category}
            </Label>
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

          {/* City Selection */}
          <div className="space-y-2">
            <Label className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse justify-end" : "")}>
              <MapPin className="h-4 w-4" />
              {isRTL ? "المدينة" : "City"} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.city || profile?.city || "none"}
              onValueChange={(value) => setFormData({ ...formData, city: value === "none" ? "" : value })}
            >
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder={isRTL ? "اختر مدينتك" : "Select your city"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="none">
                  {isRTL ? "-- اختر مدينة --" : "-- Select city --"}
                </SelectItem>
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

          {/* Sub-city Selection */}
          {(formData.city || profile?.city) && subCities && subCities.length > 0 && (
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
                  <SelectItem value="none">
                    {isRTL ? "-- اختر منطقة --" : "-- Select area --"}
                  </SelectItem>
                  {subCities.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {language === "ar" && sc.name_ar ? sc.name_ar : sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subcategory Selection (if available) */}
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
                          : "border-border hover:border-primary/50"
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

          {/* Service Name */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>
              {t.creator.serviceName}
            </Label>
            <Input
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              placeholder={t.creator.serviceNamePlaceholder}
              className={cn("rounded-xl h-12", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>
              {t.creator.bio}
            </Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={t.creator.bioPlaceholder}
              className={cn("min-h-[120px] rounded-xl resize-none", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full h-12 text-base"
          >
            {isSubmitting ? t.common.loading : t.creator.createService}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
