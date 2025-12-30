import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, LogOut, LogIn, LayoutDashboard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/businesses", label: "Businesses" },
  { href: "/community", label: "Community" },
  { href: "/deals", label: "Deals" },
  { href: "/rewards", label: "Rewards" },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isBusiness } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

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

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 active:scale-95 transition-transform hidden md:flex">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {isBusiness ? (
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="text-primary">
                    <Building2 className="mr-2 h-4 w-4" />
                    Become a Business
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/rewards")}>
                  Rewards
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="hidden md:block">
              <Button variant="default" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Log In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
