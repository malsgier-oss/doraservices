import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ar } from "@/lib/i18n";

export function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { isBusiness, loading } = useUserRole();

  // Only show nav for authenticated users, and wait for role to load
  if (!user || loading) {
    return null;
  }

  const navItems = isBusiness
    ? [
        { href: "/", label: ar.nav.home, icon: Home },
        { href: "/activity", label: ar.nav.activity, icon: ClipboardList },
        { href: "/my-services", label: ar.nav.services, icon: Briefcase },
        { href: "/profile", label: ar.nav.profile, icon: User },
      ]
    : [
        { href: "/", label: ar.nav.home, icon: Home },
        { href: "/activity", label: ar.nav.activity, icon: ClipboardList },
        { href: "/profile", label: ar.nav.profile, icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-evenly h-16 px-2">
        {navItems.map((item) => {
          const isActive = 
            item.href === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-0 flex-1 h-full transition-all duration-200 active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative p-2 rounded-full transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200 truncate max-w-full px-1",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
