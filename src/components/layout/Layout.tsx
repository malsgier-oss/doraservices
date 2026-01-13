import { Header } from "./Header";
import { Footer } from "./Footer";
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

      <Footer />
    </div>
  );
}
