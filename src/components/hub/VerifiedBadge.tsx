import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

export function VerifiedBadge({ className, size = "md", showText = false }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <CheckCircle2
        className={cn(
          sizeClasses[size],
          "text-emerald-600 dark:text-emerald-400",
          "drop-shadow-sm"
        )}
        fill="currentColor"
      />
      {showText && (
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Verified
        </span>
      )}
    </div>
  );
}
