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

  const preloadRoute = (to: string) => {
    // Keep this intentionally tiny: only preload the next screen chunk.
    if (to === "/favorites") void import("@/pages/Favorites");
    if (to === "/profile") void import("@/pages/Profile");
    if (to === "/provider-dashboard") void import("@/pages/ProviderDashboard");
    if (to.startsWith("/admin")) void import("@/pages/admin/AdminLayout");
  };

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
    ...(admin
      ? [{ to: "/admin", icon: Shield, label: isRTL ? "لوحة التحكم" : "Admin" }]
      : []),
  ];

  return (
    <nav className={cn("fixed inset-x-0 bottom-0 z-40")}>
      {/* Bar is truly attached to bottom. Safe-area is handled INSIDE so height is correct. */}
      <div
        className={cn(
          "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75",
          // make it feel like YouTube: slightly taller, but icons sit a bit higher
          "shadow-[0_-6px_18px_rgba(0,0,0,0.06)]",
        )}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
      >
        <div className="mx-auto flex h-[62px] max-w-md items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);

            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => preloadRoute(item.to)}
                onTouchStart={() => preloadRoute(item.to)}
                className={cn(
                  // YouTube-like tap target: full height, centered, compact vertical stack
                  "flex h-full flex-1 flex-col items-center justify-center gap-1",
                  "rounded-xl transition-colors",
                  // reduce horizontal padding so icons align like native tabs
                  "px-1",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
