import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

const CATEGORIES = ["electronics", "vehicles", "home", "fashion", "sports", "games", "books", "other"] as const;

export default function CreateListing() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user } = useAuth();
  const { data: cities } = useCities();

  const defaultCityId = getStoredCityId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [price, setPrice] = useState<string>("");
  const [cityId, setCityId] = useState<string>(defaultCityId || "");
  const [location, setLocation] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && !!category && !!cityId && !submitting;
  }, [title, category, cityId, submitting]);

  const handleSubmit = async () => {
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

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category,
        price: numericPrice,
        currency: "LYD",
        city_id: cityId,
        location: location.trim() ? location.trim() : null,
        status: "active",
      });

      if (error) throw error;

      toast.success(t("تم نشر الإعلان", "Listing published"));
      navigate("/#buy-sell", { replace: true });
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
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? t("جارٍ النشر...", "Publishing...") : t("نشر", "Publish")}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("العنوان", "Title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("مثال: آيفون 13", "e.g. iPhone 13")} />
          </div>

          <div className="space-y-2">
            <Label>{t("التصنيف", "Category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>{t("السعر (اختياري)", "Price (optional)")}</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("مثال: 1200", "e.g. 1200")} inputMode="decimal" />
          </div>

          <div className="space-y-2">
            <Label>{t("المدينة", "City")}</Label>
            <Select value={cityId} onValueChange={(v) => setCityId(v)}>
              <SelectTrigger>
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
            <Label>{t("الموقع (اختياري)", "Location (optional)")}</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("مثال: سوق الجمعة", "e.g. Souq Al-Jumaa")} />
          </div>

          <div className="space-y-2">
            <Label>{t("الوصف (اختياري)", "Description (optional)")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("اكتب تفاصيل أكثر عن المنتج...", "Add more details about the item...")}
            />
          </div>

          {!user ? (
            <div className="text-sm text-muted-foreground">
              {t("ستحتاج لتسجيل الدخول قبل النشر.", "You’ll need to sign in before publishing.")}
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

