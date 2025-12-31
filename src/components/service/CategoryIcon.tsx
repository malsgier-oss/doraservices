import { 
  Home, 
  Scissors, 
  Laptop, 
  PawPrint, 
  Sparkles, 
  Car, 
  GraduationCap, 
  HeartPulse,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, LucideIcon> = {
  homeMaintenance: Home,
  personalCare: Scissors,
  techSupport: Laptop,
  petServices: PawPrint,
  cleaning: Sparkles,
  automotive: Car,
  education: GraduationCap,
  health: HeartPulse,
};

const categoryColors: Record<string, string> = {
  homeMaintenance: "bg-blue-100 text-blue-600",
  personalCare: "bg-pink-100 text-pink-600",
  techSupport: "bg-purple-100 text-purple-600",
  petServices: "bg-amber-100 text-amber-600",
  cleaning: "bg-emerald-100 text-emerald-600",
  automotive: "bg-slate-100 text-slate-600",
  education: "bg-indigo-100 text-indigo-600",
  health: "bg-red-100 text-red-600",
};

interface CategoryIconProps {
  category: string;
  label: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
}

export function CategoryIcon({ 
  category, 
  label, 
  onClick, 
  size = "md",
  selected = false 
}: CategoryIconProps) {
  const Icon = categoryIcons[category] || Home;
  const colorClass = categoryColors[category] || "bg-muted text-muted-foreground";
  
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };
  
  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 transition-all duration-200",
        onClick && "cursor-pointer active:scale-95"
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center transition-all duration-200",
          sizeClasses[size],
          colorClass,
          selected && "ring-2 ring-primary ring-offset-2",
          onClick && "hover:scale-105 hover:shadow-md"
        )}
      >
        <Icon className={iconSizes[size]} />
      </div>
      <span className={cn(
        "text-xs font-medium text-foreground text-center leading-tight max-w-[80px]",
        size === "lg" && "text-sm max-w-[100px]"
      )}>
        {label}
      </span>
    </button>
  );
}
