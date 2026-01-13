import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SitePageRow = {
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  is_published: boolean | null;
  updated_at: string | null;
};

export default function SitePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? window.location.pathname.replace('/','');
  const { language, isRTL } = useLanguage();
  const [page, setPage] = useState<SitePageRow | null>(null);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => {
    if (!page) return "";
    const primary = language === "ar" ? page.title_ar : page.title_en;
    const fallback = language === "ar" ? page.title_en : page.title_ar;
    return primary || fallback || "";
  }, [page, language]);

  const content = useMemo(() => {
    if (!page) return "";
    const primary = language === "ar" ? page.content_ar : page.content_en;
    const fallback = language === "ar" ? page.content_en : page.content_ar;
    return primary || fallback || "";
  }, [page, language]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("site_pages")
        .select("slug,title_en,title_ar,content_en,content_ar,is_published,updated_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        setPage(null);
      } else {
        setPage((data as any) ?? null);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? "text-right" : "text-left"}>
            {loading ? (language === "ar" ? "جاري التحميل..." : "Loading...") : title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`prose max-w-none ${isRTL ? "text-right" : "text-left"}`}>
            {loading ? null : <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
