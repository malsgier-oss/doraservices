import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { PageTransition } from "./PageTransition";
import { useLanguage } from "@/contexts/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col touch-manipulation no-tap-highlight" dir={isRTL ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="hidden md:block border-t border-border bg-card py-6">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {isRTL ? "د" : "C"}
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
      <MobileNav />
    </div>
  );
}
