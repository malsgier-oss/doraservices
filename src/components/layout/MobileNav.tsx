import { Home, Heart, User, Shield, LayoutDashboard } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function isProviderLike(role: string | null | undefined) {
  const r = (role || "").toLowerCase();
  return r === "provider" || r === "business";
}

function isAdmin(role: string | null | undefined) {
  return (role || "").toLowerCase() === "admin";
}

export function MobileNav() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();

  const role = (profile?.role || "user").toString();
  const providerLike = isProviderLike(role);
  const admin = isAdmin(role);

  const navItems = [
    { to: "/", icon: Home, label: t.nav.home },
    ...(providerLike
      ? [
          {
            to: "/provider-dashboard",
            icon: LayoutDashboard,
            label: isRTL ? "لوحة مقدم الخدمة" : "Dashboard",
          },
        ]
      : [
          {
            to: "/favorites",
            icon: Heart,
            label: t.favorites?.title || (isRTL ? "المفضلة" : "Favorites"),
          },
        ]),
    { to: "/profile", icon: User, label: t.nav.profile },
    ...(admin ? [{ to: "/admin", icon: Shield, label: isRTL ? "لوحة التحكم" : "Admin" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
