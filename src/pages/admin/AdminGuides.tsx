import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type GuideRow = {
  id: string;
  icon_key: string;
  title_ar: string;
  title_en: string | null;
  summary_lines_ar: string[];
  summary_lines_en: string[] | null;
  bullets_ar: string[];
  bullets_en: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

const ICON_KEYS = [
  "Home",
  "Car",
  "Zap",
  "Briefcase",
  "Building2",
  "GraduationCap",
  "Heart",
  "PartyPopper",
  "Wrench",
  "Droplets",
  "Wind",
  "Fuel",
  "ClipboardCheck",
] as const;

function linesToArray(v: string) {
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(arr: string[] | null | undefined) {
  return (arr || []).join("\n");
}

export default function AdminGuides() {
  const { language, isRTL } = useLanguage();
  const [rows, setRows] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<GuideRow>>({
    icon_key: "ClipboardCheck",
    title_ar: "",
    title_en: "",
    summary_lines_ar: ["", ""],
    summary_lines_en: ["", ""],
    bullets_ar: [],
    bullets_en: [],
    sort_order: 0,
    is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guides")
      .select("id,icon_key,title_ar,title_en,summary_lines_ar,summary_lines_en,bullets_ar,bullets_en,sort_order,is_active,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) toast.error(error.message);
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      icon_key: "ClipboardCheck",
      title_ar: "",
      title_en: "",
      summary_lines_ar: ["", ""],
      summary_lines_en: ["", ""],
      bullets_ar: [],
      bullets_en: [],
      sort_order: 0,
      is_active: true,
    });
  };

  const editRow = (r: GuideRow) => {
    setForm({
      id: r.id,
      icon_key: r.icon_key || "ClipboardCheck",
      title_ar: r.title_ar || "",
      title_en: r.title_en || "",
      summary_lines_ar: (r.summary_lines_ar || ["", ""]).slice(0, 2),
      summary_lines_en: (r.summary_lines_en || ["", ""]).slice(0, 2),
      bullets_ar: r.bullets_ar || [],
      bullets_en: r.bullets_en || [],
      sort_order: Number(r.sort_order || 0),
      is_active: Boolean(r.is_active),
    });
  };

  const upsert = async () => {
    const titleAr = String(form.title_ar || "").trim();
    const titleEn = String(form.title_en || "").trim();
    const slAr = (form.summary_lines_ar || ["", ""]).map((s) => String(s || "").trim());
    const slEn = (form.summary_lines_en || ["", ""]).map((s) => String(s || "").trim());

    if (!titleAr) {
      toast.error(language === "ar" ? "العنوان العربي مطلوب" : "Arabic title is required");
      return;
    }
    if (slAr.length !== 2 || !slAr[0] || !slAr[1]) {
      toast.error(language === "ar" ? "ملخص عربي: سطرين مطلوبين" : "Arabic summary must be exactly 2 lines");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        id: form.id,
        icon_key: String(form.icon_key || "ClipboardCheck"),
        title_ar: titleAr,
        title_en: titleEn || null,
        summary_lines_ar: slAr,
        summary_lines_en: slEn[0] && slEn[1] ? slEn : null,
        bullets_ar: (form.bullets_ar || []).map(String).filter(Boolean),
        bullets_en: (form.bullets_en || []).map(String).filter(Boolean),
        sort_order: Number(form.sort_order || 0),
        is_active: Boolean(form.is_active),
      };

      const { error } = await supabase.from("guides").upsert(payload);
      if (error) throw error;

      toast.success(form.id ? (language === "ar" ? "تم التحديث" : "Updated") : (language === "ar" ? "تمت الإضافة" : "Created"));
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e?.message || (language === "ar" ? "فشل الحفظ" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!id) return;
    const { error } = await supabase.from("guides").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(language === "ar" ? "تم الحذف" : "Deleted");
    if (form.id === id) resetForm();
    await load();
  };

  const formBulletsArText = useMemo(() => arrayToLines(form.bullets_ar as any), [form.bullets_ar]);
  const formBulletsEnText = useMemo(() => arrayToLines(form.bullets_en as any), [form.bullets_en]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {language === "ar" ? "إدارة النصائح (Guides)" : "Manage Guides"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={upsert} disabled={saving}>
              {form.id ? (language === "ar" ? "تحديث" : "Update") : (language === "ar" ? "إضافة" : "Create")}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              {language === "ar" ? "مسح" : "Clear"}
            </Button>
            <Button variant="outline" onClick={load}>
              {language === "ar" ? "تحديث القائمة" : "Refresh list"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "الأيقونة" : "Icon"}</div>
              <Select value={String(form.icon_key || "ClipboardCheck")} onValueChange={(v) => setForm((p) => ({ ...p, icon_key: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {ICON_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "الترتيب" : "Sort order"}</div>
              <Input
                type="number"
                value={String(form.sort_order ?? 0)}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="text-sm font-medium">{language === "ar" ? "نشط" : "Active"}</div>
            <Switch checked={Boolean(form.is_active)} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "العنوان (AR)" : "Title (AR)"}</div>
              <Input value={String(form.title_ar ?? "")} onChange={(e) => setForm((p) => ({ ...p, title_ar: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "العنوان (EN)" : "Title (EN)"}</div>
              <Input value={String(form.title_en ?? "")} onChange={(e) => setForm((p) => ({ ...p, title_en: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "ملخص (AR) - سطر 1" : "Summary (AR) - line 1"}</div>
              <Input
                value={String((form.summary_lines_ar as any)?.[0] ?? "")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    summary_lines_ar: [e.target.value, String((p.summary_lines_ar as any)?.[1] ?? "")],
                  }))
                }
              />
              <div className="text-sm font-medium">{language === "ar" ? "ملخص (AR) - سطر 2" : "Summary (AR) - line 2"}</div>
              <Input
                value={String((form.summary_lines_ar as any)?.[1] ?? "")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    summary_lines_ar: [String((p.summary_lines_ar as any)?.[0] ?? ""), e.target.value],
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "ملخص (EN) - line 1" : "Summary (EN) - line 1"}</div>
              <Input
                value={String((form.summary_lines_en as any)?.[0] ?? "")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    summary_lines_en: [e.target.value, String((p.summary_lines_en as any)?.[1] ?? "")],
                  }))
                }
              />
              <div className="text-sm font-medium">{language === "ar" ? "ملخص (EN) - line 2" : "Summary (EN) - line 2"}</div>
              <Input
                value={String((form.summary_lines_en as any)?.[1] ?? "")}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    summary_lines_en: [String((p.summary_lines_en as any)?.[0] ?? ""), e.target.value],
                  }))
                }
              />
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "الإنجليزي اختياري (إذا تركته فارغاً سيتم استخدام العربي)." : "English is optional (Arabic will be used as fallback)."}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "النقاط (AR) - سطر لكل نقطة" : "Bullets (AR) - one per line"}</div>
              <Textarea
                rows={8}
                value={formBulletsArText}
                onChange={(e) => setForm((p) => ({ ...p, bullets_ar: linesToArray(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{language === "ar" ? "النقاط (EN) - one per line" : "Bullets (EN) - one per line"}</div>
              <Textarea
                rows={8}
                value={formBulletsEnText}
                onChange={(e) => setForm((p) => ({ ...p, bullets_en: linesToArray(e.target.value) }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {language === "ar" ? "القائمة" : "List"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">{language === "ar" ? "لا توجد نصائح" : "No guides"}</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium line-clamp-1">{r.title_ar}</div>
                    <div className="text-xs text-muted-foreground">{r.icon_key} • order {r.sort_order}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {(r.summary_lines_ar || []).join(" | ")}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => editRow(r)}>
                      {language === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                      {language === "ar" ? "حذف" : "Delete"}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div className="text-xs">{language === "ar" ? "نشط" : "Active"}</div>
                  <Switch
                    checked={Boolean(r.is_active)}
                    onCheckedChange={async (v) => {
                      const { error } = await supabase.from("guides").update({ is_active: v }).eq("id", r.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success(language === "ar" ? "تم" : "Saved");
                        await load();
                      }
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
