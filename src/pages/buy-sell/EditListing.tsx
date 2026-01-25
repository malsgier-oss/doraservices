import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, PencilLine, Trash2 } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCities } from "@/hooks/useCities";
import { useListing } from "@/hooks/useListing";
import { useProfile } from "@/hooks/useProfile";
import { cleanPhoneForStorage } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BUY_SELL_CATEGORIES, getBuySellSubcategories } from "@/components/hub/buySellCategories";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;

function storagePathFromPublicUrl(publicUrl: string) {
  const marker = "/storage/v1/object/public/listing-images/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export default function EditListing() {
  return (
    <ErrorBoundary>
      <EditListingContent />
    </ErrorBoundary>
  );
}

function EditListingContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: cities } = useCities();
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const { data: listing, isLoading } = useListing(id || null, true);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [subcategory, setSubcategory] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [allowWhatsApp, setAllowWhatsApp] = useState(true);
  const [saving, setSaving] = useState(false);

  const subcategories = getBuySellSubcategories(category);

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title || "");
    setDescription(listing.description || "");
    setCategory((listing.category as string) || "other");
    setSubcategory(listing.subcategory ?? "");
    setPrice(listing.price != null ? String(listing.price) : "");
    setCityId(listing.city_id || "");
    setLocation(listing.location || "");
    setExistingUrls((listing.image_urls || []).filter(Boolean));
    setNewPhotos([]);
    setAllowWhatsApp(listing.allow_whatsapp !== false);
  }, [listing?.id]);

  const canEdit = useMemo(() => {
    if (!user || !listing) return false;
    return listing.user_id === user.id;
  }, [user, listing]);

  const canSave = useMemo(() => {
    return canEdit && title.trim().length >= 3 && !!category && !!cityId && !saving;
  }, [canEdit, title, category, cityId, saving]);

  const onPickPhotos = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) return;

    // Validate file sizes and types
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t(`${file.name}: الحد الأقصى للحجم 5MB`, `${file.name}: Max file size is 5MB`));
        continue;
      }

      // Check MIME type
      if (!file.type.startsWith("image/")) {
        toast.error(t(`${file.name}: يجب أن يكون ملف صورة`, `${file.name}: Must be an image file`));
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const remaining = Math.max(0, MAX_PHOTOS - (existingUrls.length + newPhotos.length));
    if (remaining <= 0) {
      toast.error(t("الحد الأقصى 5 صور", "Max 5 photos"));
      return;
    }

    const picked = validFiles.slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewPhotos((prev) => [...prev, ...picked]);
    if (fileRef.current) fileRef.current.value = "";
  }, [existingUrls.length, newPhotos.length, t]);

  const removeExistingAt = useCallback(async (idx: number) => {
    const url = existingUrls[idx];
    const next = existingUrls.filter((_, i) => i !== idx);
    setExistingUrls(next);
    // best-effort delete object (avoid blocking UX)
    const path = url ? storagePathFromPublicUrl(url) : null;
    if (path) {
      await supabase.storage.from("listing-images").remove([path]).catch(() => {});
    }
  }, [existingUrls]);

  const removeNewAt = useCallback((idx: number) => {
    setNewPhotos((prev) => {
      const next = prev.slice();
      const removed = next.splice(idx, 1)[0];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const onSave = async () => {
    if (!user) {
      navigate("/auth?tab=login");
      return;
    }
    if (!listing || !canSave) return;

    setSaving(true);
    try {
      const numericPrice = price.trim() ? Number(price) : null;
      if (price.trim() && Number.isNaN(numericPrice)) {
        toast.error(t("السعر غير صالح", "Invalid price"));
        setSaving(false);
        return;
      }

      // Validate title length
      if (title.trim().length > 100) {
        toast.error(t("العنوان: حد أقصى 100 حرف", "Title: max 100 characters"));
        setSaving(false);
        return;
      }

      // Validate description length
      if (description && description.trim().length > 1000) {
        toast.error(t("الوصف: حد أقصى 1000 حرف", "Description: max 1000 characters"));
        setSaving(false);
        return;
      }

      // Validate price range
      if (numericPrice !== null && (numericPrice < 0 || numericPrice > 10000000)) {
        toast.error(t("السعر: بين 0 و 10,000,000", "Price: between 0 and 10,000,000"));
        setSaving(false);
        return;
      }

      // Upload new photos and append to existing URLs
      const uploadedUrls: string[] = [];
      if (newPhotos.length > 0) {
        for (let i = 0; i < newPhotos.length; i++) {
          const file = newPhotos[i].file;
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const imageId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${i}`;
          const path = `listings/${user.id}/${listing.id}/${imageId}.${ext}`;

          const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage.from("listing-images").getPublicUrl(path);
          if (publicData?.publicUrl) uploadedUrls.push(publicData.publicUrl);
        }
      }

      const image_urls = [...existingUrls, ...uploadedUrls].slice(0, MAX_PHOTOS);

      const rawPhone = profile?.phone ?? (typeof (user as any)?.user_metadata?.phone === "string" ? (user as any).user_metadata.phone : null);
      const contactPhone = rawPhone ? cleanPhoneForStorage(String(rawPhone)) || null : null;

      const { error } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          category,
          subcategory: subcategory.trim() ? subcategory : null,
          price: numericPrice,
          city_id: cityId,
          location: location.trim() ? location.trim() : null,
          image_urls,
          contact_phone: contactPhone ?? listing.contact_phone ?? null,
          allow_whatsapp: allowWhatsApp,
        })
        .eq("id", listing.id);

      if (error) throw error;

      toast.success(t("تم حفظ التعديلات", "Saved"));
      navigate(-1);
    } catch (err) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-4 space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (buySellLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-sm text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
        </div>
      </Layout>
    );
  }

  if (!buySellEnabled) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="rounded-xl border p-6 text-sm text-muted-foreground text-center">
            {t("ميزة الشراء والبيع غير مفعلة حالياً.", "Buy & Sell is currently disabled.")}
          </div>
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-sm text-muted-foreground">{t("الإعلان غير موجود", "Listing not found")}</div>
        </div>
      </Layout>
    );
  }

  if (!canEdit) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-sm text-muted-foreground">{t("لا تملك صلاحية تعديل هذا الإعلان", "You can't edit this listing")}</div>
        </div>
      </Layout>
    );
  }

  const totalPhotos = existingUrls.length + newPhotos.length;

  return (
    <Layout>
      <div className="container py-4 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <PencilLine className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">{t("تعديل الإعلان", "Edit listing")}</h1>
            </div>
          </div>
          <Button type="button" onClick={onSave} disabled={!canSave}>
            {saving ? t("جارٍ الحفظ...", "Saving...") : t("حفظ", "Save")}
          </Button>
        </div>

        <div className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="title-input-edit">{t("العنوان", "Title")}</Label>
            <Input id="title-input-edit" className="text-base" value={title} onChange={(e) => setTitle(e.target.value)} aria-label={t("العنوان", "Title")} maxLength={100} />
            <p className="text-xs text-muted-foreground">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-select-edit">{t("التصنيف", "Category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setSubcategory("");
              }}
            >
              <SelectTrigger id="category-select-edit" className="text-base" aria-label={t("التصنيف", "Category")}>
                <SelectValue placeholder={t("اختر تصنيف", "Select category")} />
              </SelectTrigger>
              <SelectContent>
                {BUY_SELL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {language === "ar" ? cat.nameAr : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>{t("النوع", "Type")}</Label>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub) => {
                  const isSelected = subcategory === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategory(isSelected ? "" : sub.id)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      )}
                    >
                      {language === "ar" ? sub.nameAr : sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="photos-input-edit">{t("الصور", "Photos")} ({totalPhotos}/{MAX_PHOTOS})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => fileRef.current?.click()}
                disabled={totalPhotos >= MAX_PHOTOS}
                aria-label={t("إضافة صور", "Add photos")}
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                {t("إضافة صور", "Add photos")}
              </Button>
              <input
                id="photos-input-edit"
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPickPhotos(e.target.files)}
                aria-label={t("اختر الصور", "Select photos")}
              />
            </div>

            {(existingUrls.length > 0 || newPhotos.length > 0) ? (
              <div className="grid grid-cols-5 gap-2">
                {existingUrls.map((url, idx) => (
                  <div key={`existing-${url}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      onClick={() => void removeExistingAt(idx)}
                      aria-label={t("حذف الصورة", "Remove photo")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {newPhotos.map((p, idx) => (
                  <div key={`new-${p.previewUrl}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      onClick={() => removeNewAt(idx)}
                      aria-label={t("حذف الصورة", "Remove photo")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{t("لا توجد صور", "No photos")}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-input-edit">{t("السعر (اختياري)", "Price (optional)")}</Label>
            <Input id="price-input-edit" className="text-base" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" aria-label={t("السعر", "Price")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city-select-edit">{t("المدينة", "City")}</Label>
            <Select value={cityId} onValueChange={(v) => setCityId(v)}>
              <SelectTrigger id="city-select-edit" className="text-base" aria-label={t("المدينة", "City")}>
                <SelectValue placeholder={t("اختر مدينة", "Select city")} />
              </SelectTrigger>
              <SelectContent>
                {(cities || [])
                  .filter((c) => c.is_active)
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_ar || c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-input-edit">{t("الموقع (اختياري)", "Location (optional)")}</Label>
            <Input id="location-input-edit" className="text-base" value={location} onChange={(e) => setLocation(e.target.value)} aria-label={t("الموقع", "Location")} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-whatsapp-edit">{t("إظهار زر واتساب", "Show WhatsApp button")}</Label>
              <p className="text-xs text-muted-foreground">{t("عند إغلاقها لن يرى المشترون زر واتساب", "When off, buyers will not see the WhatsApp button")}</p>
            </div>
            <Switch id="allow-whatsapp-edit" checked={allowWhatsApp} onCheckedChange={setAllowWhatsApp} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description-input-edit">{t("الوصف (اختياري)", "Description (optional)")}</Label>
            <Textarea id="description-input-edit" className="text-base" value={description} onChange={(e) => setDescription(e.target.value)} aria-label={t("الوصف", "Description")} maxLength={1000} />
            <p className="text-xs text-muted-foreground">{description.length}/1000</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

