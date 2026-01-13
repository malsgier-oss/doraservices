import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { PageTransition } from "./PageTransition";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean; // default: true
  hideHeader?: boolean; // optional override
}

export function Layout({
  children,
  showHeader = true,
  hideHeader = false,
}: LayoutProps) {
  const { t, isRTL } = useLanguage();

  const shouldShowHeader = showHeader && !hideHeader;

  return (
    <div
      className="min-h-screen flex flex-col touch-manipulation no-tap-highlight bg-background pb-16"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {shouldShowHeader && <Header />}

      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>

      <MobileNav />

      <footer className="hidden md:block border-t border-border bg-white py-6">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#333] flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {isRTL ? "د" : "D"}
                </span>
              </div>
              <span className="font-medium text-foreground">{t.appName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {t.appName}. {t.appTagline}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}