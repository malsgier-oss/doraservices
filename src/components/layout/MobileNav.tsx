import { Home, Heart, User, Shield, LayoutDashboard } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function isAdmin(role: string | null | undefined) {
  return (role || "").toLowerCase() === "admin";
}

export function MobileNav() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const location = useLocation();

  const preloadRoute = (to: string) => {
    // Keep this intentionally tiny: only preload the next screen chunk.
    // Profile is not prefetched to avoid caching a truncated chunk that causes "Unexpected end of script" on nav.
    if (to === "/favorites") void import("@/pages/Favorites");
    if (to === "/listings-panel") void import("@/pages/ListingsPanel");
    if (to.startsWith("/admin")) void import("@/pages/admin/AdminLayout");
  };

  const role = (profile?.role || "user").toString();
  const admin = isAdmin(role);
  
  // Marketplace Controls: show Listings Panel if either toggle is on
  const providerMode = !!(profile as any)?.provider_mode;
  const listingsActive = !!(profile as any)?.marketplace_enabled;
  const showListingsPanel = providerMode || listingsActive;

  const navItems = [
    { to: "/", icon: Home, label: t.nav.home },
    ...(showListingsPanel
      ? [{ to: "/listings-panel", icon: LayoutDashboard, label: isRTL ? "لوحة الإعلانات" : "Listings Panel" }]
      : []),
    ...(admin
      ? [{ to: "/admin", icon: Shield, label: isRTL ? "لوحة التحكم" : "Admin" }]
      : [{ to: "/favorites", icon: Heart, label: t.favorites?.title || (isRTL ? "المفضلة" : "Favorites") }]),
    { to: "/profile", icon: User, label: t.nav.profile },
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
