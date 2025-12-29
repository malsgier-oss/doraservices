import { Link, useLocation } from "react-router-dom";
import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/businesses", label: "Businesses" },
  { href: "/community", label: "Community" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rewards", label: "Rewards" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-lg safe-area-top">
      <div className="container flex h-14 md:h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 active:scale-95 transition-transform">
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full gradient-warm flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-display font-bold text-base md:text-lg">C</span>
          </div>
          <span className="font-display font-semibold text-lg md:text-xl text-foreground">
            The Circle
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.href
                  ? "bg-warm text-warm-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
              className="w-64 pl-9 bg-secondary border-0 focus-visible:ring-1"
            />
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9 active:scale-95 transition-transform">
            <Bell className="h-5 w-5" />
          </Button>

          <Link to="/profile" className="hidden md:block">
            <Button variant="ghost" size="icon" className="h-9 w-9 active:scale-95 transition-transform">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
