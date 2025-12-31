import { Header } from "./Header";
import { PageTransition } from "./PageTransition";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col touch-manipulation no-tap-highlight bg-[#F9F9F9]" dir={isRTL ? "rtl" : "ltr"}>
      {showHeader && <Header />}
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="hidden md:block border-t border-border bg-white py-6">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#333] flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {isRTL ? "د" : "D"}
                </span>
              </div>
              <span className="font-medium text-[#333]">{t.appName}</span>
            </div>
            <p className="text-sm text-[#777]">
              © 2024 {t.appName}. {t.appTagline}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
