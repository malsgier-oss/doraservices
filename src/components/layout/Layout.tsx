import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { PageTransition } from "./PageTransition";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col touch-manipulation no-tap-highlight">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <footer className="hidden md:block border-t border-border bg-card py-8">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full gradient-warm flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">C</span>
              </div>
              <span className="font-display font-medium text-foreground">The Circle</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 The Circle. Building stronger communities together.
            </p>
          </div>
        </div>
      </footer>
      <MobileNav />
    </div>
  );
}
