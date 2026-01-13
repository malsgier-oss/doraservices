import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { language, isRTL } = useLanguage();

  const items = [
    { to: "/about", en: "About", ar: "عن Dora" },
    { to: "/contact", en: "Contact", ar: "تواصل معنا" },
    { to: "/terms", en: "Terms", ar: "الشروط" },
    { to: "/privacy", en: "Privacy", ar: "الخصوصية" },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${isRTL ? "text-right" : "text-left"}`}>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Dora.ly
          </div>
          <nav className="flex flex-wrap gap-4 text-sm">
            {items.map((it) => (
              <Link key={it.to} to={it.to} className="text-muted-foreground hover:text-foreground transition-colors">
                {language === "ar" ? it.ar : it.en}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
