import { useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, PlusCircle, Trash2 } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCities } from "@/hooks/useCities";
import { useProfile } from "@/hooks/useProfile";
import { cleanPhoneForStorage } from "@/lib/phoneUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

const CATEGORIES = ["electronics", "vehicles", "home", "fashion", "sports", "games", "books", "other"] as const;
const MAX_PHOTOS = 5;

export default function CreateListing() {
  return (
    <ErrorBoundary>
      <CreateListingContent />
    </ErrorBoundary>
  );
}

function CreateListingContent() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: cities } = useCities();
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const defaultCityId = getStoredCityId();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [price, setPrice] = useState<string>("");
  const [cityId, setCityId] = useState<string>(defaultCityId || "");
  const [location, setLocation] = useState<string>("");
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [allowWhatsApp, setAllowWhatsApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && !!category && !!cityId && !submitting;
  }, [title, category, cityId, submitting]);

  const canSaveDraft = useMemo(() => {
    return title.trim().length >= 1 && !submitting;
  }, [title, submitting]);

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

    const remaining = Math.max(0, MAX_PHOTOS - photos.length);
    if (remaining <= 0) {
      toast.error(t("الحد الأقصى 5 صور", "Max 5 photos"));
      return;
    }

    const picked = validFiles.slice(0, remaining).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...picked]);
    // reset input so user can re-pick same file if needed
    if (fileRef.current) fileRef.current.value = "";
  }, [photos.length, t]);

  const removePhotoAt = useCallback((idx: number) => {
    setPhotos((prev) => {
      const next = prev.slice();
      const removed = next.splice(idx, 1)[0];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (!buySellEnabled) {
      toast.error(t("ميزة الإعلانات غير مفعلة حالياً.", "Listings are currently disabled."));
      return;
    }
    if (!user) {
      const returnTo = encodeURIComponent("/buy-sell/create-listing");
      navigate(`/auth?tab=login&returnTo=${returnTo}`);
      return;
    }

    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const numericPrice = price.trim() ? Number(price) : null;
      if (price.trim() && Number.isNaN(numericPrice)) {
        toast.error(t("السعر غير صالح", "Invalid price"));
        setSubmitting(false);
        return;
      }

      // Validate title length
      if (title.trim().length > 100) {
        toast.error(t("العنوان: حد أقصى 100 حرف", "Title: max 100 characters"));
        setSubmitting(false);
        return;
      }

      // Validate description length
      if (description && description.trim().length > 1000) {
        toast.error(t("الوصف: حد أقصى 1000 حرف", "Description: max 1000 characters"));
        setSubmitting(false);
        return;
      }

      // Validate price range
      if (numericPrice !== null && (numericPrice < 0 || numericPrice > 10000000)) {
        toast.error(t("السعر: بين 0 و 10,000,000", "Price: between 0 and 10,000,000"));
        setSubmitting(false);
        return;
      }

      const rawPhone = profile?.phone ?? (typeof (user as any)?.user_metadata?.phone === "string" ? (user as any).user_metadata.phone : null);
      const contactPhone = rawPhone ? cleanPhoneForStorage(String(rawPhone)) || null : null;

      const listingId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      const { error: insertError } = await supabase.from("listings").insert({
        id: listingId,
        user_id: user.id,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        price: numericPrice,
        currency: "LYD",
        city_id: cityId || null,
        location: location.trim() ? location.trim() : null,
        image_urls: null,
        status: "active",
        contact_phone: contactPhone || null,
        allow_whatsapp: allowWhatsApp,
      });

      if (insertError) {
        const msg = typeof insertError === "object" && insertError && "message" in insertError ? String((insertError as any).message) : "";
        if (msg.includes("Could not find the table") || msg.toLowerCase().includes("schema cache")) {
          toast.error(t("ميزة الإعلانات غير مفعلة بعد (قاعدة البيانات لم تُحدّث). جرّب لاحقاً.", "Listings isn't enabled yet (database not updated). Please try again later."));
          return;
        }
        throw insertError;
      }

      // Upload photos (optional) and update listing.image_urls
      if (photos.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i].file;
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const imageId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${i}`;
          const path = `listings/${user.id}/${listingId}/${imageId}.${ext}`;

          const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage.from("listing-images").getPublicUrl(path);
          const publicUrl = publicData?.publicUrl || null;
          if (publicUrl) urls.push(publicUrl);
        }

        if (urls.length > 0) {
          const { error: updateError } = await supabase.from("listings").update({ image_urls: urls }).eq("id", listingId);
          if (updateError) {
            // best-effort
            console.error(updateError);
          }
        }
      }

      toast.success(t("تم نشر الإعلان", "Listing published"));
      navigate("/buy-sell/my-listings", { replace: true });
    } catch (err) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      const returnTo = encodeURIComponent("/buy-sell/create-listing");
      navigate(`/auth?tab=login&returnTo=${returnTo}`);
      return;
    }
    if (!canSaveDraft) return;
    setSubmitting(true);
    try {
      if (title.trim().length > 100) {
        toast.error(t("العنوان: حد أقصى 100 حرف", "Title: max 100 characters"));
        setSubmitting(false);
        return;
      }
      const numericPrice = price.trim() ? Number(price) : null;
      if (price.trim() && Number.isNaN(numericPrice)) {
        toast.error(t("السعر غير صالح", "Invalid price"));
        setSubmitting(false);
        return;
      }
      const rawPhone = profile?.phone ?? (typeof (user as any)?.user_metadata?.phone === "string" ? (user as any).user_metadata.phone : null);
      const contactPhone = rawPhone ? cleanPhoneForStorage(String(rawPhone)) || null : null;

      const listingId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      const { error: insertError } = await supabase.from("listings").insert({
        id: listingId,
        user_id: user.id,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category: category || "other",
        price: numericPrice,
        currency: "LYD",
        city_id: cityId || null,
        location: location.trim() ? location.trim() : null,
        image_urls: null,
        status: "draft",
        contact_phone: contactPhone || null,
        allow_whatsapp: allowWhatsApp,
      });

      if (insertError) throw insertError;

      toast.success(t("تم حفظ المسودة", "Draft saved"));
      navigate("/buy-sell/my-listings", { replace: true });
    } catch (err) {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-4 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">{t("نشر إعلان للبيع", "Post a listing")}</h1>
            </div>
          </div>
        </div>

        {buySellLoading ? (
          <div className="text-sm text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
        ) : !buySellEnabled ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground text-center">
            {t("ميزة الشراء والبيع غير مفعلة حالياً.", "Buy & Sell is currently disabled.")}
          </div>
        ) : (
          <div className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="title-input">{t("العنوان", "Title")}</Label>
            <Input id="title-input" className="text-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("مثال: آيفون 13", "e.g. iPhone 13")} aria-label={t("العنوان", "Title")} maxLength={100} />
            <p className="text-xs text-muted-foreground">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-select">{t("التصنيف", "Category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger id="category-select" className="text-base" aria-label={t("التصنيف", "Category")}>
                <SelectValue placeholder={t("اختر تصنيف", "Select category")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="photos-input">{t("الصور (حتى 5)", "Photos (up to 5)")}</Label>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => fileRef.current?.click()} aria-label={t("إضافة صور", "Add photos")}>
                <ImagePlus className="h-4 w-4 mr-1" />
                {t("إضافة صور", "Add photos")}
              </Button>
              <input
                id="photos-input"
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPickPhotos(e.target.files)}
                aria-label={t("اختر الصور", "Select photos")}
              />
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p, idx) => (
                  <div key={`${p.previewUrl}-${idx}`} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                      onClick={() => removePhotoAt(idx)}
                      aria-label={t("حذف الصورة", "Remove photo")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {t("أضف حتى 5 صور لزيادة فرص البيع.", "Add up to 5 photos to sell faster.")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-input">{t("السعر (اختياري)", "Price (optional)")}</Label>
            <Input id="price-input" className="text-base" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("مثال: 1200", "e.g. 1200")} inputMode="decimal" aria-label={t("السعر", "Price")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city-select">{t("المدينة", "City")}</Label>
            <Select value={cityId} onValueChange={(v) => setCityId(v)}>
              <SelectTrigger id="city-select" className="text-base" aria-label={t("المدينة", "City")}>
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
            <Label htmlFor="location-input">{t("الموقع (اختياري)", "Location (optional)")}</Label>
            <Input id="location-input" className="text-base" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("مثال: سوق الجمعة", "e.g. Souq Al-Jumaa")} aria-label={t("الموقع", "Location")} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-whatsapp">{t("إظهار زر واتساب", "Show WhatsApp button")}</Label>
              <p className="text-xs text-muted-foreground">{t("عند إغلاقها لن يرى المشترون زر واتساب", "When off, buyers will not see the WhatsApp button")}</p>
            </div>
            <Switch id="allow-whatsapp" checked={allowWhatsApp} onCheckedChange={setAllowWhatsApp} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description-input">{t("الوصف (اختياري)", "Description (optional)")}</Label>
            <Textarea
              id="description-input"
              className="text-base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("اكتب تفاصيل أكثر عن المنتج...", "Add more details about the item...")}
              aria-label={t("الوصف", "Description")}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{description.length}/1000</p>
          </div>

          {!user ? (
            <div className="text-sm text-muted-foreground">
              {t("ستحتاج لتسجيل الدخول قبل النشر.", "You’ll need to sign in before publishing.")}
            </div>
          ) : null}

          {/* Publish / Save draft (end of form) */}
          <div className="pt-2 flex flex-col gap-2">
            <Button type="button" size="lg" className="w-full h-12" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? t("جارٍ النشر...", "Publishing...") : t("نشر", "Publish")}
            </Button>
            <Button type="button" variant="outline" size="lg" className="w-full h-11" onClick={handleSaveDraft} disabled={!canSaveDraft}>
              {submitting ? t("جاري الحفظ...", "Saving...") : t("حفظ كمسودة", "Save as draft")}
            </Button>
          </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

