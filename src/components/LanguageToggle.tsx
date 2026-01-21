import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-full", className)}>
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t.language.title}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border z-50">
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={cn(
            "cursor-pointer",
            language === "en" && "bg-primary/10 text-primary"
          )}
        >
          <span className="font-medium">English</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("ar")}
          className={cn(
            "cursor-pointer",
            language === "ar" && "bg-primary/10 text-primary"
          )}
        >
          <span className="font-medium">العربية</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
