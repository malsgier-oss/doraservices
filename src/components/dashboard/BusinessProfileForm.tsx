import { useState, useEffect } from "react";
import { Save, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Business {
  id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
}

interface BusinessProfileFormProps {
  business: Business | null;
  onSubmit: (data: {
    name: string;
    category: string;
    location: string;
    description: string;
    image_url: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "banking", label: "Banking" },
  { value: "health", label: "Health & Beauty" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

export function BusinessProfileForm({ business, onSubmit, isSubmitting }: BusinessProfileFormProps) {
  const [form, setForm] = useState({
    name: "",
    category: "restaurant",
    location: "",
    description: "",
    image_url: "",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        category: business.category,
        location: business.location || "",
        description: business.description || "",
        image_url: business.image_url || "",
      });
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="h-12 w-12 rounded-xl bg-warm flex items-center justify-center">
          <Store className="h-6 w-6 text-warm-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">
            {business ? "Edit Business" : "Create Your Business"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {business ? "Update your business information" : "Set up your business profile"}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Business Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="My Business"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Category *</Label>
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
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="123 Main Street, City"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Tell customers about your business..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo / Image URL</Label>
        <Input
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          placeholder="https://example.com/logo.jpg"
        />
        {form.image_url && (
          <div className="mt-2">
            <img
              src={form.image_url}
              alt="Business preview"
              className="w-20 h-20 object-cover rounded-lg"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !form.name}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {business ? "Update Business" : "Create Business"}
      </Button>
    </form>
  );
}
