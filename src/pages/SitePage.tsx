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

  const fallback = useMemo(() => {
    const slugKey = (slug || "").toLowerCase();
    const F: Record<string, { title_ar: string; title_en: string; content_ar: string; content_en: string }> = {
      "about": {
        title_ar: "من نحن",
        title_en: "About Dora",
        content_ar: "دورا منصة تربطك بمزودي الخدمات المحليين...",
        content_en: "Dora connects you with local service providers...",
      },
      "help": {
        title_ar: "مركز المساعدة",
        title_en: "Help Center",
        content_ar: "• كيف أتواصل؟ اضغط على الخدمة ثم اتصل مباشرة...",
        content_en: "• How do I contact a provider? Open a service and call directly...",
      },
      "become-provider": {
        title_ar: "انضم كمزود خدمة",
        title_en: "Become a Provider",
        content_ar: "لتصبح مزود خدمة: سجل حسابك، أكمل بياناتك، ثم ارفع إثباتك إن لزم...",
        content_en: "To become a provider: sign up, complete your profile, then submit verification if required...",
      },
      "terms": {
        title_ar: "الشروط والأحكام",
        title_en: "Terms",
        content_ar: "هذه نسخة مبدئية للشروط. باستخدامك للتطبيق...",
        content_en: "This is an initial Terms draft. By using the app...",
      },
      "privacy": {
        title_ar: "سياسة الخصوصية",
        title_en: "Privacy Policy",
        content_ar: "نحترم خصوصيتك. نستخدم بيانات الحد الأدنى لتشغيل الخدمة...",
        content_en: "We respect your privacy. We use minimal data to operate the service...",
      },
    };
    return F[slugKey] || null;
  }, [slug]);

  const title = useMemo(() => {
    if (page) {
      const primary = language === "ar" ? page.title_ar : page.title_en;
      const alt = language === "ar" ? page.title_en : page.title_ar;
      return primary || alt || "";
    }
    if (fallback) return language === "ar" ? fallback.title_ar : fallback.title_en;
    return "";
  }, [page, language]);

  const content = useMemo(() => {
    if (page) {
      const primary = language === "ar" ? page.content_ar : page.content_en;
      const alt = language === "ar" ? page.content_en : page.content_ar;
      return primary || alt || "";
    }
    if (fallback) return language === "ar" ? fallback.content_ar : fallback.content_en;
    return "";
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
