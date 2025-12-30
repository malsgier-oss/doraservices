import { useState, useEffect } from "react";
import { Plus, Save, Loader2, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Deal, DealFormData } from "@/hooks/useDeals";

const CATEGORIES = [
  { value: "food", label: "Food & Dining" },
  { value: "shopping", label: "Shopping" },
  { value: "services", label: "Services" },
  { value: "banking", label: "Banking" },
  { value: "health", label: "Health & Beauty" },
  { value: "entertainment", label: "Entertainment" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "free_item", label: "Free Item" },
];

interface DealFormProps {
  deal?: Deal | null;
  businessId: string;
  onSubmit: (data: DealFormData, isDraft: boolean) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DealForm({ deal, businessId, onSubmit, onCancel, isSubmitting }: DealFormProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount: "",
    category: "food",
    discount_type: "percentage",
    start_date: "",
    expires_at: "",
    promo_code: "",
    terms_conditions: "",
    image_url: "",
    status: "draft",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (deal) {
      setForm({
        title: deal.title || "",
        description: deal.description || "",
        discount: deal.discount || "",
        category: deal.category || "food",
        discount_type: deal.discount_type || "percentage",
        start_date: deal.start_date ? new Date(deal.start_date).toISOString().slice(0, 16) : "",
        expires_at: deal.expires_at ? new Date(deal.expires_at).toISOString().slice(0, 16) : "",
        promo_code: deal.promo_code || "",
        terms_conditions: deal.terms_conditions || "",
        image_url: deal.image_url || "",
        status: deal.status || "draft",
      });
      if (deal.image_url) {
        setImagePreview(deal.image_url);
      }
    }
  }, [deal]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!form.discount.trim()) {
      newErrors.discount = "Discount is required";
    }
    if (!form.start_date) {
      newErrors.start_date = "Start date is required";
    }
    if (!form.expires_at) {
      newErrors.expires_at = "End date is required";
    }
    if (form.start_date && form.expires_at && new Date(form.start_date) >= new Date(form.expires_at)) {
      newErrors.expires_at = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !validate()) return;

    const data: DealFormData = {
      ...form,
      business_id: businessId,
      status: isDraft ? "draft" : form.start_date && new Date(form.start_date) > new Date() ? "scheduled" : "active",
    };

    await onSubmit(data, isDraft);
  };

  const handleImageUrlChange = (url: string) => {
    setForm({ ...form, image_url: url });
    setImagePreview(url);
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">
          {deal ? "Edit Deal" : "Create New Deal"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Title & Discount */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Summer Sale"
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-2">
          <Label>Discount Value *</Label>
          <Input
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            placeholder="20% or $10"
            className={errors.discount ? "border-destructive" : ""}
          />
          {errors.discount && <p className="text-xs text-destructive">{errors.discount}</p>}
        </div>
      </div>

      {/* Category & Discount Type */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Discount Type</Label>
          <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DISCOUNT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description *</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe your deal..."
          rows={3}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className={errors.start_date ? "border-destructive" : ""}
          />
          {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className={errors.expires_at ? "border-destructive" : ""}
          />
          {errors.expires_at && <p className="text-xs text-destructive">{errors.expires_at}</p>}
        </div>
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <Label>Promo Code (optional)</Label>
        <Input
          value={form.promo_code}
          onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })}
          placeholder="SUMMER2024"
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label>Image URL (optional)</Label>
        <Input
          value={form.image_url}
          onChange={(e) => handleImageUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
        {imagePreview && (
          <div className="relative mt-2 w-full max-w-xs">
            <img
              src={imagePreview}
              alt="Preview"
              className="rounded-lg w-full h-32 object-cover"
              onError={() => setImagePreview(null)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 bg-background/80"
              onClick={() => {
                setForm({ ...form, image_url: "" });
                setImagePreview(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {!imagePreview && (
          <div className="flex items-center justify-center w-full max-w-xs h-32 bg-muted rounded-lg border-2 border-dashed border-border">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Paste image URL above</p>
            </div>
          </div>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-2">
        <Label>Terms & Conditions (optional)</Label>
        <Textarea
          value={form.terms_conditions}
          onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
          placeholder="Enter any terms and conditions..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>
        <Button
          variant="default"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Publish Deal
        </Button>
      </div>
    </div>
  );
}
