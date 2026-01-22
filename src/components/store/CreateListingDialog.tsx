import { useState, useEffect, useRef } from "react";
import { Upload, X, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import type { StoreListing } from "@/types/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["electronics", "vehicles", "home", "fashion", "sports", "games", "books", "other"] as const;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 5;

interface CreateListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing?: StoreListing | null;
  businessId: string;
  onSave: (data: {
    title: string;
    description?: string | null;
    category: string;
    price?: number | null;
    currency?: string;
    image_urls: string[];
    status: 'draft' | 'active';
  }) => Promise<void>;
}

export function CreateListingDialog({
  open,
  onOpenChange,
  listing,
  businessId,
  onSave,
}: CreateListingDialogProps) {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("LYD");
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [images, setImages] = useState<{ file: File; previewUrl: string; uploadedUrl?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description || "");
      setCategory((listing.category as any) || "other");
      setPrice(listing.price?.toString() || "");
      setCurrency(listing.currency || "LYD");
      setStatus(listing.status === 'active' ? 'active' : 'draft');
      setImages(
        listing.image_urls.map((url) => ({
          file: {} as File,
          previewUrl: url,
          uploadedUrl: url,
        }))
      );
    } else {
      resetForm();
    }
  }, [listing, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("other");
    setPrice("");
    setCurrency("LYD");
    setStatus('draft');
    setImages([]);
  };

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const remaining = MAX_IMAGES - images.length;

    if (fileArray.length > remaining) {
      toast.error(t(`الحد الأقصى ${MAX_IMAGES} صور`, `Maximum ${MAX_IMAGES} images`));
      return;
    }

    const newImages = fileArray
      .slice(0, remaining)
      .map((file) => {
        // Validate file size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_FILE_SIZE_MB) {
          toast.error(t(`حجم الملف يجب أن يكون أقل من ${MAX_FILE_SIZE_MB}MB`, `File size must be less than ${MAX_FILE_SIZE_MB}MB`));
          return null;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(t("يجب أن يكون الملف صورة", "File must be an image"));
          return null;
        }

        return {
          file,
          previewUrl: URL.createObjectURL(file),
        };
      })
      .filter(Boolean) as { file: File; previewUrl: string }[];

    setImages([...images, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const image = images[index];
    if (image.previewUrl && !image.uploadedUrl) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setImages(newImages);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadedUrls: string[] = [];
    const listingId = listing?.id || crypto.randomUUID(); // Temporary ID for new listings

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // If already uploaded, use existing URL
      if (image.uploadedUrl) {
        uploadedUrls.push(image.uploadedUrl);
        continue;
      }

      // Upload new image
      const fileExt = image.file.name.split(".").pop();
      const fileName = `${listingId}/${i}.${fileExt}`;
      const filePath = `store-listings/${businessId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("store-listings")
        .upload(filePath, image.file, { upsert: true });

      if (uploadError) {
        throw new Error(t(`فشل رفع الصورة ${i + 1}`, `Failed to upload image ${i + 1}`) + ": " + uploadError.message);
      }

      const { data } = supabase.storage.from("store-listings").getPublicUrl(filePath);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error(t("العنوان مطلوب (3 أحرف على الأقل)", "Title is required (minimum 3 characters)"));
      return;
    }

    setSaving(true);
    try {
      // Upload images first
      setUploading(true);
      const imageUrls = await uploadImages();
      setUploading(false);

      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category,
        price: price.trim() ? parseFloat(price.trim()) : null,
        currency,
        image_urls: imageUrls,
        status,
      });

      resetForm();
      onOpenChange(false);
      toast.success(listing ? t("تم التحديث", "Updated") : t("تم الإنشاء", "Created"));
    } catch (error) {
      setUploading(false);
      toast.error(error instanceof Error ? error.message : t("حدث خطأ", "An error occurred"));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dir={isRTL ? "rtl" : "ltr"}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing ? t("تعديل الإعلان", "Edit Listing") : t("إعلان جديد", "New Listing")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("العنوان", "Title")} *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("مثال: هاتف ذكي", "e.g. Smartphone")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("الوصف", "Description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("وصف المنتج...", "Describe the product...")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("التصنيف", "Category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("الحالة", "Status")}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("مسودة", "Draft")}</SelectItem>
                  <SelectItem value="active">{t("نشط", "Active")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("السعر", "Price")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("العملة", "Currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LYD">LYD</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("الصور", "Images")} ({images.length}/{MAX_IMAGES})</Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4",
                images.length >= MAX_IMAGES ? "border-muted-foreground/30" : "border-muted-foreground/50 hover:border-primary/50 cursor-pointer"
              )}
              onClick={() => images.length < MAX_IMAGES && fileInputRef.current?.click()}
            >
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    {t("انقر أو اسحب الصور هنا", "Click or drag images here")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.previewUrl}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveImage(index, 'up');
                            }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        )}
                        {index < images.length - 1 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveImage(index, 'down');
                            }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div
                      className="border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50"
                      style={{ aspectRatio: "1" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageSelect(e.target.files)}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              {t(`الحد الأقصى ${MAX_IMAGES} صور، ${MAX_FILE_SIZE_MB}MB لكل صورة`, `Maximum ${MAX_IMAGES} images, ${MAX_FILE_SIZE_MB}MB per image`)}
            </p>
          </div>
        </div>

        <DialogFooter className={isRTL ? "sm:justify-start" : "sm:justify-end"}>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>
            {t("إلغاء", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading || !title.trim() || title.trim().length < 3}>
            {(saving || uploading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? t("جاري الرفع...", "Uploading...") : t("جاري الحفظ...", "Saving...")}
              </>
            ) : (
              listing ? t("حفظ", "Save") : t("إنشاء", "Create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
