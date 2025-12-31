import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Briefcase, Bell } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Header() {
  const { user, signOut } = useAuth();
  const { t, isRTL } = useLanguage();
  const { profile } = useProfile();
  const { isBusiness } = useUserRole();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2) || (isRTL ? "م" : "U");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F9F9F9] border-b border-gray-100">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-[#333] flex items-center justify-center">
            <span className="text-white font-bold">
              {isRTL ? "د" : "D"}
            </span>
          </div>
          <span className="font-bold text-lg text-[#333] hidden sm:block">
            {t.appName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className="text-sm font-medium text-[#777] hover:text-[#333] transition-colors"
          >
            {t.nav.home}
          </Link>
          <Link 
            to="/activity" 
            className="text-sm font-medium text-[#777] hover:text-[#333] transition-colors"
          >
            {t.nav.activity}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />
          
          <button className="h-9 w-9 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Bell className="h-4 w-4 text-[#333]" />
          </button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-[#333] text-white text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48 bg-white border-gray-200 z-50">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.profile.title}
                </DropdownMenuItem>
                {!isBusiness && (
                  <DropdownMenuItem onClick={() => navigate("/create-service")}>
                    <Briefcase className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                    {t.profile.becomeProvider}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.profile.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                  <LogOut className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.profile.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} className="rounded-full bg-[#333] hover:bg-[#555]">
              {t.auth.login}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
