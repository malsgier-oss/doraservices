import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyBusinessStore, useBusinessStoreMutations } from "@/hooks/useBusinessStore";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "./ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StoreSettingsForm() {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { data: store, isLoading } = useMyBusinessStore();
  const { data: cities } = useCities();
  const { updateStore } = useBusinessStoreMutations();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [aboutText, setAboutText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsApp, setContactWhatsApp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) {
      setLogoUrl(store.logo_url || null);
      setBannerUrl(store.banner_url || null);
      setAboutText(store.about_text || "");
      setContactPhone(store.contact_phone || "");
      setContactWhatsApp(store.contact_whatsapp || "");
      setContactEmail(store.contact_email || "");
      setAddress(store.address || "");
      setCityId(store.city_id || "");
    }
  }, [store]);

  const handleLogoUpload = async (file: File): Promise<string> => {
    if (!store) throw new Error(t("المتجر غير موجود", "Store not found"));
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${store.id}/logo.${fileExt}`;
    const filePath = `store-assets/logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("store-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(t("فشل رفع الصورة", "Failed to upload image") + ": " + uploadError.message);
    }

    const { data } = supabase.storage.from("store-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleBannerUpload = async (file: File): Promise<string> => {
    if (!store) throw new Error(t("المتجر غير موجود", "Store not found"));
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${store.id}/banner.${fileExt}`;
    const filePath = `store-assets/banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("store-assets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error(t("فشل رفع الصورة", "Failed to upload image") + ": " + uploadError.message);
    }

    const { data } = supabase.storage.from("store-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!store) return;

    if (!contactPhone.trim()) {
      toast.error(t("رقم الهاتف مطلوب", "Phone number is required"));
      return;
    }

    setSaving(true);
    try {
      await updateStore({
        businessId: store.id,
        data: {
          logo_url: logoUrl,
          banner_url: bannerUrl,
          about_text: aboutText || null,
          contact_phone: contactPhone.trim(),
          contact_whatsapp: contactWhatsApp.trim() || null,
          contact_email: contactEmail.trim() || null,
          address: address.trim() || null,
          city_id: cityId || null,
        },
      });
      toast.success(t("تم حفظ الإعدادات", "Settings saved"));
    } catch (error) {
      toast.error(t("حدث خطأ أثناء الحفظ", "Error saving settings"));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>;
  }

  if (!store) {
    return <div className="text-sm text-muted-foreground">{t("لا يوجد متجر", "No store found")}</div>;
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="space-y-2">
        <Label>{t("شعار المتجر", "Store Logo")}</Label>
        <ImageUploader
          value={logoUrl}
          onChange={setLogoUrl}
          onUpload={handleLogoUpload}
          maxSizeMB={2}
          aspectRatio="1"
          label={t("الشعار", "Logo")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("بانر المتجر", "Store Banner")}</Label>
        <ImageUploader
          value={bannerUrl}
          onChange={setBannerUrl}
          onUpload={handleBannerUpload}
          maxSizeMB={2}
          aspectRatio="16/9"
          label={t("البانر", "Banner")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("نبذة عن المتجر", "About Store")}</Label>
        <Textarea
          value={aboutText}
          onChange={(e) => setAboutText(e.target.value)}
          placeholder={t("اكتب نبذة عن متجرك...", "Write about your store...")}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          {aboutText.length}/1000 {t("حرف", "characters")}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("معلومات الاتصال", "Contact Information")}</h3>

        <div className="space-y-2">
          <Label>{t("رقم الهاتف", "Phone Number")} *</Label>
          <Input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("مثال: 0912345678", "e.g. 0912345678")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t("واتساب", "WhatsApp")}</Label>
          <Input
            value={contactWhatsApp}
            onChange={(e) => setContactWhatsApp(e.target.value)}
            placeholder={t("مثال: 0912345678", "e.g. 0912345678")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("البريد الإلكتروني", "Email")}</Label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={t("example@email.com", "example@email.com")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("العنوان", "Address")}</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("العنوان الكامل", "Full address")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("المدينة", "City")}</Label>
          <Select value={cityId} onValueChange={setCityId}>
            <SelectTrigger>
              <SelectValue placeholder={t("اختر المدينة", "Select city")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("لا شيء", "None")}</SelectItem>
              {(cities || []).map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {language === "ar" && city.name_ar ? city.name_ar : city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || !contactPhone.trim()} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("جاري الحفظ...", "Saving...")}
          </>
        ) : (
          t("حفظ الإعدادات", "Save Settings")
        )}
      </Button>
    </div>
  );
}
