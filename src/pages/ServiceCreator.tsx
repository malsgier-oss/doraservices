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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function ServiceCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    hourlyRate: "",
    bio: "",
  });

  const categories = [
    { id: "homeMaintenance", label: t.categories.homeMaintenance },
    { id: "personalCare", label: t.categories.personalCare },
    { id: "techSupport", label: t.categories.techSupport },
    { id: "petServices", label: t.categories.petServices },
    { id: "cleaning", label: t.categories.cleaning },
    { id: "automotive", label: t.categories.automotive },
    { id: "education", label: t.categories.education },
    { id: "health", label: t.categories.health },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceName.trim()) {
      toast.error(isRTL ? "يرجى إدخال اسم الخدمة" : "Please enter service name");
      return;
    }
    if (!formData.category) {
      toast.error(isRTL ? "يرجى اختيار الفئة" : "Please select a category");
      return;
    }
    if (!formData.hourlyRate || isNaN(Number(formData.hourlyRate))) {
      toast.error(isRTL ? "يرجى إدخال سعر صحيح" : "Please enter a valid rate");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Save to database
      console.log("Creating service:", formData);
      
      toast.success(t.creator.serviceCreated, {
        description: t.creator.serviceCreatedDesc,
      });
      
      navigate("/my-services");
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
          {/* Service Name */}
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

          {/* Category */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.creator.category}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder={t.creator.selectCategory} />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.creator.hourlyRate}</Label>
            <Input
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              placeholder={t.creator.ratePlaceholder}
              className={cn("rounded-xl h-12", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          {/* Bio */}
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
