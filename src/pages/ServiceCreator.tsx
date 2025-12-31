import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useServices } from "@/hooks/useServices";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LIBYAN_CITIES } from "@/components/search/SearchFilters";
import { 
  Wrench, 
  Car, 
  Zap, 
  Scale, 
  Building, 
  BookOpen, 
  Heart, 
  PartyPopper,
  Lightbulb,
  Droplets,
  Snowflake,
  Fuel,
  ClipboardCheck,
  Sun,
  BatteryCharging,
  Gavel,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  UserCheck,
  MapPin
} from "lucide-react";

// Subcategories for each main category
const categoryStructure = {
  homeMaintenance: {
    icon: Wrench,
    subcategories: [
      { id: "electrician", icon: Lightbulb },
      { id: "plumbing", icon: Droplets },
      { id: "acRepair", icon: Snowflake },
    ]
  },
  carCare: {
    icon: Car,
    subcategories: [
      { id: "oilFilter", icon: Fuel },
      { id: "inspection", icon: ClipboardCheck },
    ]
  },
  powerUtilities: {
    icon: Zap,
    subcategories: [
      { id: "solar", icon: Sun },
      { id: "generator", icon: BatteryCharging },
    ]
  },
  professionalLegal: {
    icon: Scale,
    subcategories: [
      { id: "legal", icon: Gavel },
      { id: "translation", icon: Languages },
    ]
  },
  propertyLogistics: {
    icon: Building,
    subcategories: []
  },
  learningEducation: {
    icon: BookOpen,
    subcategories: []
  },
  healingWellness: {
    icon: Heart,
    subcategories: [
      { id: "homeDoctor", icon: Stethoscope },
      { id: "nursing", icon: UserCheck },
    ]
  },
  eventsCatering: {
    icon: PartyPopper,
    subcategories: [
      { id: "photography", icon: Camera },
      { id: "catering", icon: UtensilsCrossed },
    ]
  },
};

export default function ServiceCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const { createService } = useServices();
  const { profile, updateProfile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    subcategory: "",
    bio: "",
    city: "",
  });

  const mainCategories = Object.entries(categoryStructure).map(([id, data]) => ({
    id,
    label: t.categories[id as keyof typeof t.categories] || id,
    icon: data.icon,
    subcategories: data.subcategories.map(sub => ({
      id: sub.id,
      label: t.featuredList[sub.id as keyof typeof t.featuredList] || sub.id,
      icon: sub.icon,
    })),
  }));

  const selectedCategory = mainCategories.find(c => c.id === formData.category);

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

    setIsSubmitting(true);
    try {
      // Update profile with city if provided
      if (formData.city && formData.city !== profile?.city) {
        await updateProfile({ city: formData.city });
      }

      const { error } = await createService({
        title: formData.serviceName,
        description: formData.bio || undefined,
        category: formData.category,
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
                {mainCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Selection (if available) */}
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div className="space-y-2">
              <Label className={cn(isRTL ? "text-right block" : "text-left block")}>
                {isRTL ? "نوع الخدمة" : "Service Type"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {selectedCategory.subcategories.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSelected = formData.subcategory === sub.id;
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
                      <span className="text-sm font-medium">{sub.label}</span>
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

          {/* City Selection */}
          <div className="space-y-2">
            <Label className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse justify-end" : "")}>
              <MapPin className="h-4 w-4" />
              {isRTL ? "المدينة" : "City"}
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
                {LIBYAN_CITIES.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {language === "ar" ? city.ar : city.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "يساعد العملاء على إيجادك" : "Helps customers find you"}
            </p>
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
