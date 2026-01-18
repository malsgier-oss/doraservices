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
import { Loader2, ArrowLeft, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import { useCities } from "@/hooks/useCities";
import { useSubCities } from "@/hooks/useSubCities";

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

export default function ServiceEditor() {
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

      // Best-effort: map stored category string back to a category/subcategory selection.
      // Stored value is a name (category or subcategory name), so we match by name.
      const matchedCategory = categories?.find((c) => c.name === row.category || c.name_ar === row.category) || null;
      if (matchedCategory) {
        setCategoryId(matchedCategory.id);
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
