import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_paused?: boolean;
  is_active?: boolean;
}

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSave: (serviceId: string, updates: { 
    title: string; 
    description: string | null; 
    category: string;
    is_paused: boolean;
  }) => Promise<{ error: Error | null }>;
  isSaving?: boolean;
}

export function EditServiceDialog({ 
  open, 
  onOpenChange, 
  service, 
  onSave,
  isSaving = false
}: EditServiceDialogProps) {
  const { isRTL, language } = useLanguage();
  const { data: categories } = useCategories();
  
  const [formData, setFormData] = useState({
    title: service?.title || "",
    description: service?.description || "",
    category: service?.category || "",
    is_paused: service?.is_paused || false,
  });

  // Reset form when service changes
  useState(() => {
    if (service) {
      setFormData({
        title: service.title,
        description: service.description || "",
        category: service.category,
        is_paused: service.is_paused || false,
      });
    }
  });

  // Get subcategories for selected category
  const selectedCategory = categories?.find(c => {
    // Match by subcategory name (which is stored in service.category)
    return c.name === service?.category || c.id === formData.category;
  });
  
  const { data: subcategories } = useSubcategories(selectedCategory?.id || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    await onSave(service.id, {
      title: formData.title,
      description: formData.description || null,
      category: formData.category,
      is_paused: formData.is_paused,
    });
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>
            {isRTL ? "تعديل الخدمة" : "Edit Service"}
          </DialogTitle>
          <DialogDescription>
            {isRTL ? "قم بتحديث معلومات خدمتك" : "Update your service information"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {isRTL ? "عنوان الخدمة" : "Service Title"}
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isRTL ? "مثال: تصليح مكيفات" : "e.g., AC Repair"}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {isRTL ? "الوصف" : "Description"}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isRTL ? "وصف مختصر للخدمة..." : "Brief description of your service..."}
              rows={3}
            />
          </div>

          {/* Pause Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="space-y-0.5">
              <Label htmlFor="is_paused" className="text-sm font-medium">
                {isRTL ? "إيقاف الخدمة مؤقتاً" : "Pause Service"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isRTL 
                  ? "الخدمة لن تظهر للعملاء عند الإيقاف" 
                  : "Service won't be visible when paused"}
              </p>
            </div>
            <Switch
              id="is_paused"
              checked={formData.is_paused}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paused: checked })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isRTL ? "حفظ التغييرات" : "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
