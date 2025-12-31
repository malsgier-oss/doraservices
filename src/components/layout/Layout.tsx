import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { PageTransition } from "./PageTransition";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col touch-manipulation no-tap-highlight" dir="rtl">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="hidden md:block border-t border-border bg-card py-6">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">د</span>
              </div>
              <span className="font-medium text-foreground">الدائرة</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 الدائرة. مركز الخدمات المحلية.
            </p>
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}
