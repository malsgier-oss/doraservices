import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type SitePageRow = {
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  is_published: boolean | null;
};

const SLUGS = ["about","contact","terms","privacy"] as const;

export default function AdminPages() {
  const { toast } = useToast();
  const { language, isRTL } = useLanguage();
  const [rows, setRows] = useState<Record<string, SitePageRow>>({});
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<typeof SLUGS[number]>("about");

  const emptyRow = (slug: string): SitePageRow => ({
    slug,
    title_en: null,
    title_ar: null,
    content_en: null,
    content_ar: null,
    is_published: false,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_pages")
      .select("slug,title_en,title_ar,content_en,content_ar,is_published")
      .in("slug", [...SLUGS]);

    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows({});
    } else {
      const map: Record<string, SitePageRow> = {};
      (data ?? []).forEach((r: any) => {
        map[String(r.slug)] = {
          slug: String(r.slug),
          title_en: (r.title_en ?? null) as string | null,
          title_ar: (r.title_ar ?? null) as string | null,
          content_en: (r.content_en ?? null) as string | null,
          content_ar: (r.content_ar ?? null) as string | null,
          is_published: (r.is_published ?? false) as boolean | null,
        };
      });
      setRows(map);
    }
    setLoading(false);
  }

  useEffect(()=> { load(); }, []);

  const current = rows[activeSlug];

  const titleLabel = language === "ar" ? "العنوان" : "Title";
  const contentLabel = language === "ar" ? "المحتوى" : "Content";
  const publishedLabel = language === "ar" ? "منشور" : "Published";

  function setField(field: keyof SitePageRow, value: any) {
    setRows(prev => ({
      ...prev,
      [activeSlug]: { ...(prev[activeSlug] ?? emptyRow(activeSlug)), [field]: value }
    }));
  }

  async function save() {
    const payload = rows[activeSlug];
    if (!payload) return;
    const { error } = await supabase.from("site_pages").upsert({
      slug: activeSlug,
      title_en: payload.title_en ?? null,
      title_ar: payload.title_ar ?? null,
      content_en: payload.content_en ?? null,
      content_ar: payload.content_ar ?? null,
      is_published: payload.is_published ?? false,
    }, { onConflict: "slug" });

    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: language === "ar" ? "تم الحفظ" : "Saved" });
  }

  const tabName = (s: typeof SLUGS[number]) => {
    const map: any = {
      about: { en:"About", ar:"عن Dora" },
      contact: { en:"Contact", ar:"تواصل معنا" },
      terms: { en:"Terms", ar:"الشروط" },
      privacy: { en:"Privacy", ar:"الخصوصية" },
    };
    return language === "ar" ? map[s].ar : map[s].en;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {language === "ar" ? "إدارة صفحات الموقع" : "Manage Site Pages"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SLUGS.map(s => (
              <Button key={s} variant={activeSlug === s ? "default" : "outline"} onClick={()=> setActiveSlug(s)}>
                {tabName(s)}
              </Button>
            ))}
          </div>

          {!current ? (
            <div className="text-sm text-muted-foreground">{loading ? "..." : (language==="ar" ? "لا يوجد بيانات" : "No data")}</div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{titleLabel} (EN)</div>
                  <Input value={current.title_en ?? ""} onChange={(e)=> setField("title_en", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{titleLabel} (AR)</div>
                  <Input value={current.title_ar ?? ""} onChange={(e)=> setField("title_ar", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{contentLabel} (EN)</div>
                  <Textarea rows={10} value={current.content_en ?? ""} onChange={(e)=> setField("content_en", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{contentLabel} (AR)</div>
                  <Textarea rows={10} value={current.content_ar ?? ""} onChange={(e)=> setField("content_ar", e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="text-sm font-medium">{publishedLabel}</div>
                <Switch checked={!!current.is_published} onCheckedChange={(v)=> setField("is_published", v)} />
              </div>

              <div className="flex gap-2">
                <Button onClick={save}>{language==="ar" ? "حفظ" : "Save"}</Button>
                <Button variant="outline" onClick={load}>{language==="ar" ? "تحديث" : "Refresh"}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
