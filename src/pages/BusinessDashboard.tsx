import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ArrowLeft, Loader2, Tag, PlusCircle, PencilLine, Archive, CheckCircle, XCircle } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useMyBusiness";
import { useMyBusinessDeals, useMyBusinessDealMutations } from "@/hooks/useMyBusinessDeals";
import type { Deal } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEAL_CATEGORIES = ["electronics", "vehicles", "home", "fashion", "sports", "games", "books", "other"] as const;
const DISCOUNT_TYPES = ["percentage", "fixed", "free_item"] as const;

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user, profile, refreshProfile } = useAuth();
  const { data: myBusiness, isLoading } = useMyBusiness();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: myDeals, isLoading: dealsLoading } = useMyBusinessDeals(myBusiness?.id ?? null);
  const dealMutations = useMyBusinessDealMutations(myBusiness?.id ?? null);

  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealForm, setDealForm] = useState({
    title: "",
    description: "",
    discount: "",
    category: "other" as (typeof DEAL_CATEGORIES)[number],
    discount_type: "percentage" as (typeof DISCOUNT_TYPES)[number],
    start_date: new Date().toISOString().slice(0, 16),
    expires_at: "",
    promo_code: "",
    terms_conditions: "",
  });
  const [dealSaving, setDealSaving] = useState(false);

  const resetDealForm = () => {
    setEditingDeal(null);
    setDealForm({
      title: "",
      description: "",
      discount: "",
      category: "other",
      discount_type: "percentage",
      start_date: new Date().toISOString().slice(0, 16),
      expires_at: "",
      promo_code: "",
      terms_conditions: "",
    });
  };

  const openCreateDeal = () => {
    resetDealForm();
    setDealDialogOpen(true);
  };

  const openEditDeal = (d: Deal) => {
    setEditingDeal(d);
    setDealForm({
      title: d.title,
      description: d.description || "",
      discount: d.discount || "",
      category: (DEAL_CATEGORIES.includes(d.category as any) ? d.category : "other") as (typeof DEAL_CATEGORIES)[number],
      discount_type: (DISCOUNT_TYPES.includes(d.discount_type as any) ? d.discount_type : "percentage") as (typeof DISCOUNT_TYPES)[number],
      start_date: d.start_date ? new Date(d.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      expires_at: d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 16) : "",
      promo_code: d.promo_code || "",
      terms_conditions: d.terms_conditions || "",
    });
    setDealDialogOpen(true);
  };

  const saveDeal = async () => {
    if (!user || !myBusiness) return;
    if (!dealForm.title.trim()) {
      toast.error(t("العنوان مطلوب", "Title is required"));
      return;
    }
    setDealSaving(true);
    try {
      if (editingDeal) {
        await dealMutations.updateDeal(editingDeal.id, {
          title: dealForm.title.trim(),
          description: dealForm.description.trim() || null,
          discount: dealForm.discount.trim() || "0",
          category: dealForm.category,
          discount_type: dealForm.discount_type,
          start_date: dealForm.start_date ? new Date(dealForm.start_date).toISOString() : new Date().toISOString(),
          expires_at: dealForm.expires_at ? new Date(dealForm.expires_at).toISOString() : null,
          promo_code: dealForm.promo_code.trim() || null,
          terms_conditions: dealForm.terms_conditions.trim() || null,
        });
        toast.success(t("تم تحديث العرض", "Deal updated"));
      } else {
        await dealMutations.createDeal({
          user_id: user.id,
          title: dealForm.title.trim(),
          description: dealForm.description.trim() || null,
          discount: dealForm.discount.trim() || "0",
          category: dealForm.category,
          discount_type: dealForm.discount_type,
          start_date: dealForm.start_date ? new Date(dealForm.start_date).toISOString() : new Date().toISOString(),
          expires_at: dealForm.expires_at ? new Date(dealForm.expires_at).toISOString() : null,
          promo_code: dealForm.promo_code.trim() || null,
          terms_conditions: dealForm.terms_conditions.trim() || null,
        });
        toast.success(t("تم إنشاء العرض", "Deal created"));
      }
      dealMutations.invalidate();
      setDealDialogOpen(false);
      resetDealForm();
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setDealSaving(false);
    }
  };

  const setDealStatus = async (d: Deal, status: "active" | "inactive" | "archived") => {
    try {
      await dealMutations.setDealStatus(d.id, status);
      toast.success(
        status === "active" ? t("تم تفعيل العرض", "Deal activated") :
        status === "inactive" ? t("تم إلغاء تفعيل العرض", "Deal deactivated") :
        t("تم أرشفة العرض", "Deal archived"),
      );
      dealMutations.invalidate();
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    }
  };

  const canCreate = useMemo(() => {
    return !!user && name.trim().length >= 2 && category.trim().length >= 2 && !saving;
  }, [user, name, category, saving]);

  const createBusiness = async () => {
    if (!user) {
      navigate("/auth?tab=login");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("businesses").insert({
        user_id: user.id,
        name: name.trim(),
        category: category.trim(),
        location: location.trim() ? location.trim() : null,
        description: description.trim() ? description.trim() : null,
      } as any);
      if (error) throw error;

      // Best-effort: store a business role marker in profiles if schema allows it.
      await supabase.from("profiles").update({ role: "business" } as any).eq("user_id", user.id).catch(() => {});
      await refreshProfile();

      toast.success(t("تم إنشاء المتجر", "Business created"));
      window.location.reload();
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as any).message) : t("حدث خطأ", "Something went wrong");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">{t("لوحة المتجر", "Business Dashboard")}</h1>
            </div>
          </div>
        </div>

        {myBusiness ? (
          <>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{myBusiness.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>{t("الحالة:", "Status:")} {myBusiness.authorization_status}</div>
                <div>{t("التصنيف:", "Category:")} {myBusiness.category}</div>
                {myBusiness.location ? <div>{t("الموقع:", "Location:")} {myBusiness.location}</div> : null}
                {myBusiness.description ? <div className="whitespace-pre-line">{myBusiness.description}</div> : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  {t("عروضي", "My Deals")}
                </CardTitle>
                <Button size="sm" onClick={openCreateDeal} className="gap-1.5">
                  <PlusCircle className="h-4 w-4" />
                  {t("عرض جديد", "New deal")}
                </Button>
              </CardHeader>
              <CardContent>
                {dealsLoading ? (
                  <div className="text-sm text-muted-foreground py-4">{t("جاري التحميل...", "Loading...")}</div>
                ) : !myDeals || myDeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                    <Tag className="h-10 w-10 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">{t("لا توجد عروض. أضف عرضاً جديداً.", "No deals yet. Add a new deal.")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myDeals.map((d) => {
                      const st = (d.status || "").toLowerCase();
                      const statusLabel =
                        st === "active" ? t("نشط", "Active") :
                        st === "inactive" ? t("غير نشط", "Inactive") :
                        st === "draft" ? t("مسودة", "Draft") :
                        st === "archived" ? t("أرشيف", "Archived") : st;
                      return (
                        <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border bg-card">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{d.title}</div>
                            <div className="text-xs text-muted-foreground">{d.category} • {statusLabel}</div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => openEditDeal(d)}>
                              <PencilLine className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">{t("تعديل", "Edit")}</span>
                            </Button>
                            {st !== "active" && st !== "archived" ? (
                              <Button size="sm" className="h-8 gap-1" onClick={() => setDealStatus(d, "active")}>
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("تفعيل", "Activate")}</span>
                              </Button>
                            ) : null}
                            {st === "active" ? (
                              <Button variant="secondary" size="sm" className="h-8 gap-1" onClick={() => setDealStatus(d, "inactive")}>
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("إلغاء التفعيل", "Deactivate")}</span>
                              </Button>
                            ) : null}
                            {st !== "archived" ? (
                              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={() => setDealStatus(d, "archived")}>
                                <Archive className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("أرشفة", "Archive")}</span>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={dealDialogOpen} onOpenChange={(open) => { setDealDialogOpen(open); if (!open) resetDealForm(); }}>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
                <DialogHeader>
                  <DialogTitle>{editingDeal ? t("تعديل العرض", "Edit deal") : t("عرض جديد", "New deal")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>{t("العنوان", "Title")} *</Label>
                    <Input value={dealForm.title} onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))} placeholder={t("مثال: خصم 20%", "e.g. 20% off")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("التصنيف", "Category")}</Label>
                    <Select value={dealForm.category} onValueChange={(v) => setDealForm((f) => ({ ...f, category: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("نوع الخصم", "Discount type")}</Label>
                      <Select value={dealForm.discount_type} onValueChange={(v) => setDealForm((f) => ({ ...f, discount_type: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">LYD</SelectItem>
                          <SelectItem value="free_item">{t("مجاني", "Free")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("الخصم", "Discount")}</Label>
                      <Input value={dealForm.discount} onChange={(e) => setDealForm((f) => ({ ...f, discount: e.target.value }))} placeholder="0" inputMode="decimal" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("الوصف (اختياري)", "Description (optional)")}</Label>
                    <Textarea value={dealForm.description} onChange={(e) => setDealForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("بداية", "Start")}</Label>
                      <Input type="datetime-local" value={dealForm.start_date} onChange={(e) => setDealForm((f) => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("نهاية (اختياري)", "End (optional)")}</Label>
                      <Input type="datetime-local" value={dealForm.expires_at} onChange={(e) => setDealForm((f) => ({ ...f, expires_at: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("رمز الترويج (اختياري)", "Promo code (optional)")}</Label>
                    <Input value={dealForm.promo_code} onChange={(e) => setDealForm((f) => ({ ...f, promo_code: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("الشروط (اختياري)", "Terms (optional)")}</Label>
                    <Textarea value={dealForm.terms_conditions} onChange={(e) => setDealForm((f) => ({ ...f, terms_conditions: e.target.value }))} rows={2} />
                  </div>
                </div>
                <DialogFooter className={isRTL ? "sm:justify-start" : "sm:justify-end"}>
                  <Button variant="outline" onClick={() => setDealDialogOpen(false)} disabled={dealSaving}>{t("إلغاء", "Cancel")}</Button>
                  <Button onClick={saveDeal} disabled={dealSaving || !dealForm.title.trim()}>
                    {dealSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingDeal ? t("حفظ", "Save") : t("إنشاء", "Create"))}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t("إنشاء ملف متجر", "Create business profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("اسم المتجر", "Business name")}</Label>
                <Input className="text-base" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("التصنيف", "Category")}</Label>
                <Input className="text-base" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("مثال: إلكترونيات", "e.g. Electronics")} />
              </div>
              <div className="space-y-2">
                <Label>{t("الموقع (اختياري)", "Location (optional)")}</Label>
                <Input className="text-base" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("الوصف (اختياري)", "Description (optional)")}</Label>
                <Textarea className="text-base" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <Button className="w-full h-12" onClick={createBusiness} disabled={!canCreate}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("إنشاء", "Create")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

