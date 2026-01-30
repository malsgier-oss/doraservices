import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, MapPin, Tag, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type ServiceRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  city: string | null;
  sub_city: string | null;
  allow_whatsapp?: boolean | null;
  is_paused: boolean;
  approval_status: string;
  deleted_at?: string | null;
};

type ServiceImageRow = {
  id: string;
  url: string;
  storage_path: string | null;
  position: number | null;
};

export default function ServiceEditor() {
  return (
    <ErrorBoundary>
      <ServiceEditorContent />
    </ErrorBoundary>
  );
}

function ServiceEditorContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { isRTL, language } = useLanguage();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<ServiceRow | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [subCity, setSubCity] = useState<string>("");
  const [allowWhatsapp, setAllowWhatsapp] = useState<boolean>(true);

  // Photos (service_images)
  const [images, setImages] = useState<ServiceImageRow[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);

  const { data: subcategories } = useSubcategories(categoryId || undefined);
  const { data: subCities } = useSubCities(cityId || (profile as any)?.city_id || null);

  const accountLocked = useMemo(() => {
    const st = (profile?.status || "").toLowerCase();
    return st === "suspended" || st === "deleted" || st === "inactive";
  }, [profile?.status]);

  useEffect(() => {
    const run = async () => {
      if (!user || !id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("id,user_id,title,description,category,price,city,sub_city,allow_whatsapp,is_paused,approval_status,deleted_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error(isRTL ? "تعذر تحميل الخدمة" : "Failed to load service");
        navigate("/provider-dashboard", { replace: true });
        return;
      }

      const row = data as any as ServiceRow | null;
      if (!row || row.deleted_at) {
        toast.error(isRTL ? "هذه الخدمة غير موجودة" : "Service not found");
        navigate("/provider-dashboard", { replace: true });
        return;
      }

      if (row.user_id !== user.id) {
        toast.error(isRTL ? "لا تملك صلاحية تعديل هذه الخدمة" : "You can't edit this service");
        navigate("/provider-dashboard", { replace: true });
        return;
      }

      setService(row);
      setTitle(row.title || "");
      setDescription(row.description || "");
      setPrice(row.price != null ? String(row.price) : "");
      setSubCity(row.sub_city || "");
      setAllowWhatsapp(row.allow_whatsapp ?? true);

      // Load existing photos (up to 5)
      try {
        const { data: imgs, error: imgsErr } = await supabase
          .from("service_images" as any)
          .select("id,url,storage_path,position")
          .eq("service_id", row.id)
          .order("position", { ascending: true });
        if (!imgsErr && Array.isArray(imgs)) {
          setImages(imgs as ServiceImageRow[]);
        }
      } catch {
        // ignore
      }

      // Best-effort: map stored category string back to a category/subcategory selection.
      // Stored value is a name (category OR subcategory name), so we match both.
      let matched = false;
      try {
        const { data: subMatch } = await supabase
          .from("subcategories" as any)
          .select("id,category_id,name,name_ar")
          .or(`name.eq.${row.category},name_ar.eq.${row.category}`)
          .maybeSingle();
        if (subMatch?.id && subMatch?.category_id) {
          setCategoryId(String(subMatch.category_id));
          setSubcategoryId(String(subMatch.id));
          matched = true;
        }
      } catch {
        // ignore
      }

      if (!matched) {
        const matchedCategory = categories?.find((c) => c.name === row.category || c.name_ar === row.category) || null;
        if (matchedCategory) {
          setCategoryId(matchedCategory.id);
        }
      }

      // City selection: map by name.
      const matchedCity = cities?.find((c) => c.name === row.city || c.name_ar === row.city) || null;
      if (matchedCity) {
        setCityId(matchedCity.id);
      }

      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id, categories, cities]);

  const maxPhotos = 5;

  const onAddPhotos = async (fileList: FileList | null) => {
    if (!fileList) return;
    if (!user || !service) return;
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) return;

    // Validate file sizes and types
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(isRTL ? `${file.name}: الحد الأقصى للحجم 5MB` : `${file.name}: Max file size is 5MB`);
        continue;
      }

      // Check MIME type
      if (!file.type.startsWith("image/")) {
        toast.error(isRTL ? `${file.name}: يجب أن يكون ملف صورة` : `${file.name}: Must be an image file`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (images.length >= maxPhotos) {
      toast.error(isRTL ? "الحد الأقصى 5 صور" : "Max 5 photos");
      return;
    }

    setPhotosBusy(true);
    try {
      const remaining = Math.max(0, maxPhotos - images.length);
      const picked = validFiles.slice(0, remaining);
      const startPos = (images[images.length - 1]?.position || images.length || 0) + 1;

      const createdRows: ServiceImageRow[] = [];
      for (let i = 0; i < picked.length; i++) {
        const file = picked[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const imageId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${i}`;
        const path = `${user.id}/${service.id}/${imageId}.${ext}`;

        const { error: uploadError } = await supabase.storage.from("service-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("service-images").getPublicUrl(path);
        const publicUrl = publicData?.publicUrl || null;
        if (!publicUrl) throw new Error("Missing public URL");

        const position = startPos + i;
        const { data: imgRow, error: imgRowError } = await supabase
          .from("service_images" as any)
          .insert({ service_id: service.id, url: publicUrl, storage_path: path, position })
          .select("id,url,storage_path,position")
          .single();
        if (imgRowError) throw imgRowError;

        createdRows.push(imgRow as ServiceImageRow);
      }

      const next = [...images, ...createdRows].sort((a, b) => (a.position || 0) - (b.position || 0));
      setImages(next);

      // Keep services.image_url aligned with first image for backward-compat.
      if (next[0]?.url) {
        await supabase.from("services").update({ image_url: next[0].url }).eq("id", service.id);
      }
    } catch (e) {
      console.error(e);
      toast.error(isRTL ? "فشل رفع الصور" : "Failed to upload photos");
    } finally {
      setPhotosBusy(false);
    }
  };

  const onDeletePhoto = async (img: ServiceImageRow) => {
    if (!service) return;
    const ok = window.confirm(isRTL ? "حذف هذه الصورة؟" : "Delete this photo?");
    if (!ok) return;

    setPhotosBusy(true);
    try {
      if (img.storage_path) {
        await supabase.storage.from("service-images").remove([img.storage_path]);
      }
      await supabase.from("service_images" as any).delete().eq("id", img.id);

      const next = images.filter((x) => x.id !== img.id);
      setImages(next);

      // Update cover image if needed
      await supabase.from("services").update({ image_url: next[0]?.url || null }).eq("id", service.id);
    } catch (e) {
      console.error(e);
      toast.error(isRTL ? "فشل حذف الصورة" : "Failed to delete photo");
    } finally {
      setPhotosBusy(false);
    }
  };

  const onSave = async () => {
    if (!user || !service) return;
    if (accountLocked) {
      toast.error(isRTL ? "حسابك موقوف" : "Your account is suspended");
      return;
    }

    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error(isRTL ? "أدخل اسم الخدمة" : "Enter a service name");
      return;
    }

    const nextDesc = description.trim();
    if (!nextDesc) {
      toast.error(isRTL ? "أدخل وصف للخدمة" : "Enter a description");
      return;
    }

    // Determine selected category/subcategory display name
    const cat = categories?.find((c) => c.id === categoryId) || null;
    const sub = subcategories?.find((s) => s.id === subcategoryId) || null;
    const categoryName = sub?.name || cat?.name || service.category;

    if (cat && subcategories && subcategories.length > 0 && !sub) {
      toast.error(isRTL ? "اختر نوع الخدمة" : "Please select a service type");
      return;
    }

    const selectedCity = cities?.find((c) => c.id === cityId) || null;
    const nextAllowWhatsapp = !!allowWhatsapp;

    const cityValue = selectedCity
      ? language === "ar"
        ? selectedCity.name_ar || selectedCity.name
        : selectedCity.name || selectedCity.name_ar
      : service.city;

    setSaving(true);
    try {
      const updates: any = {
        title: nextTitle,
        description: nextDesc,
        price: price.trim() ? Number(price) : null,
        category: categoryName,
        city: cityValue || null,
        sub_city: subCity.trim() || null,
        allow_whatsapp: nextAllowWhatsapp,
      };

      const { error } = await supabase.from("services").update(updates).eq("id", service.id);
      if (error) throw error;

      toast.success(isRTL ? "تم حفظ التغييرات" : "Changes saved");
      navigate("/provider-dashboard", { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(isRTL ? "فشل حفظ التغييرات" : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!service) return null;

  return (
    <Layout>
      <div className="container py-6 max-w-lg mx-auto" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className={isRTL ? "rotate-180" : ""} />
          </Button>
          <h1 className="text-lg font-semibold">{isRTL ? "تعديل الخدمة" : "Edit service"}</h1>
        </div>

        {accountLocked && (
          <Card className="border-destructive/40 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive">
                {isRTL ? "حسابك موقوف" : "Account suspended"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isRTL ? "لا يمكنك تعديل الخدمات حالياً." : "You can't edit services right now."}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isRTL ? "بيانات الخدمة" : "Service info"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photos */}
            <div className="space-y-2">
              <Label>{isRTL ? "صور الخدمة" : "Service Photos"}</Label>

              <div className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "حتى 5 صور" : "Up to 5 photos"}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={photosBusy || images.length >= maxPhotos || accountLocked}
                    asChild
                  >
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" />
                        {isRTL ? "إضافة صور" : "Add photos"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onAddPhotos(e.target.files)}
                        disabled={photosBusy || images.length >= maxPhotos || accountLocked}
                      />
                    </label>
                  </Button>
                </div>

                {images.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border bg-muted">
                        <img src={img.url} alt="" className="h-24 w-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-8 w-8 rounded-full"
                          onClick={() => onDeletePhoto(img)}
                          disabled={photosBusy || accountLocked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-3">
                    {isRTL ? "لا توجد صور" : "No photos"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "اسم الخدمة" : "Service name"}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "الوصف" : "Description"}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px] rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "السعر (اختياري)" : "Price (optional)"}</Label>
              <Input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isRTL ? "مثال: 50" : "e.g. 50"}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {isRTL ? "الفئة" : "Category"}
              </Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => {
                  setCategoryId(v === "none" ? "" : v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder={isRTL ? "اختر الفئة" : "Select category"} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="none">{isRTL ? "-- اختر فئة --" : "-- Select --"}</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === "ar" && c.name_ar ? c.name_ar : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoryId && subcategories && subcategories.length > 0 && (
              <div className="space-y-2">
                <Label>{isRTL ? "تخصص (اختياري)" : "Subcategory (optional)"}</Label>
                <Select value={subcategoryId || "none"} onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder={isRTL ? "اختر تخصص" : "Select subcategory"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {language === "ar" && s.name_ar ? s.name_ar : s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {isRTL ? "المدينة" : "City"}
              </Label>
              <Select value={cityId || "none"} onValueChange={(v) => setCityId(v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder={isRTL ? "اختر المدينة" : "Select city"} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="none">{isRTL ? "-- اختر مدينة --" : "-- Select --"}</SelectItem>
                  {cities?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {language === "ar" && c.name_ar ? c.name_ar : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(cityId || (profile as any)?.city_id) && subCities && subCities.length > 0 && (
              <div className="space-y-2">
                <Label>{isRTL ? "المنطقة" : "Area"}</Label>
                <Select value={subCity || "none"} onValueChange={(v) => setSubCity(v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder={isRTL ? "اختر المنطقة" : "Select area"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="none">{isRTL ? "-- بدون --" : "-- None --"}</SelectItem>
                    {subCities.map((sc) => {
                      const label = language === "ar" && sc.name_ar ? sc.name_ar : sc.name;
                      return (
                        <SelectItem key={sc.id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {isRTL ? "السماح بالتواصل عبر واتساب" : "Allow WhatsApp"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "إذا أغلقتها، زر واتساب سيختفي للزبائن" : "When off, the WhatsApp button will be hidden for customers"}
                </p>
              </div>
              <Switch checked={allowWhatsapp} onCheckedChange={setAllowWhatsapp} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={onSave} disabled={saving || accountLocked} className="h-12 rounded-xl flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className={saving ? "ms-2" : ""}>{isRTL ? "حفظ" : "Save"}</span>
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} className="h-12 rounded-xl flex-1">
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "ملاحظة: قد تحتاج تغييرات الفئة/الموقع إلى مراجعة الإدارة قبل ظهورها للناس."
                : "Note: Category/location changes may require admin review before becoming visible."}
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
