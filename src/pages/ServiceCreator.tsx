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
import { ar } from "@/lib/i18n";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  { id: "homeMaintenance", label: ar.categories.homeMaintenance },
  { id: "personalCare", label: ar.categories.personalCare },
  { id: "techSupport", label: ar.categories.techSupport },
  { id: "petServices", label: ar.categories.petServices },
  { id: "cleaning", label: ar.categories.cleaning },
  { id: "automotive", label: ar.categories.automotive },
  { id: "education", label: ar.categories.education },
  { id: "health", label: ar.categories.health },
];

export default function ServiceCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: "",
    category: "",
    hourlyRate: "",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceName.trim()) {
      toast.error("يرجى إدخال اسم الخدمة");
      return;
    }
    if (!formData.category) {
      toast.error("يرجى اختيار الفئة");
      return;
    }
    if (!formData.hourlyRate || isNaN(Number(formData.hourlyRate))) {
      toast.error("يرجى إدخال سعر صحيح");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Save to database
      console.log("Creating service:", formData);
      
      toast.success(ar.creator.serviceCreated, {
        description: ar.creator.serviceCreatedDesc,
      });
      
      navigate("/my-services");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الخدمة");
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
          <h1 className="text-2xl font-bold text-foreground">{ar.creator.title}</h1>
          <p className="text-muted-foreground mt-1">{ar.creator.subtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Name */}
          <div className="space-y-2">
            <Label className="text-right block">{ar.creator.serviceName}</Label>
            <Input
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              placeholder={ar.creator.serviceNamePlaceholder}
              className="rounded-xl h-12 text-right"
              dir="rtl"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-right block">{ar.creator.category}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder={ar.creator.selectCategory} />
              </SelectTrigger>
              <SelectContent>
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
            <Label className="text-right block">{ar.creator.hourlyRate}</Label>
            <Input
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              placeholder={ar.creator.ratePlaceholder}
              className="rounded-xl h-12 text-right"
              dir="rtl"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className="text-right block">{ar.creator.bio}</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder={ar.creator.bioPlaceholder}
              className="min-h-[120px] rounded-xl resize-none text-right"
              dir="rtl"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full h-12 text-base"
          >
            {isSubmitting ? ar.common.loading : ar.creator.createService}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
