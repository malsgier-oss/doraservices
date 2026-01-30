import { CheckCircle2, Star, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustBadgeProps = {
  type: "verified" | "rating" | "response" | "experience";
  value?: string | number;
  className?: string;
  size?: "sm" | "md";
};

export function TrustBadge({ type, value, className, size = "sm" }: TrustBadgeProps) {
  const sizeClasses = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  if (type === "verified") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
          textSizeClasses,
          className
        )}
      >
        <CheckCircle2 className={cn(sizeClasses, "text-emerald-600 dark:text-emerald-400")} />
        <span className="font-semibold">Verified</span>
      </div>
    );
  }

  if (type === "rating" && value !== undefined) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
          textSizeClasses,
          className
        )}
      >
        <Star className={cn(sizeClasses, "text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400")} />
        <span className="font-semibold">{value}</span>
      </div>
    );
  }

  if (type === "response" && value !== undefined) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
          textSizeClasses,
          className
        )}
      >
        <Clock className={cn(sizeClasses, "text-blue-600 dark:text-blue-400")} />
        <span className="font-semibold">{value}</span>
      </div>
    );
  }

  if (type === "experience" && value !== undefined) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20",
          textSizeClasses,
          className
        )}
      >
        <Award className={cn(sizeClasses, "text-purple-600 dark:text-purple-400")} />
        <span className="font-semibold">{value} years</span>
      </div>
    );
  }

  return null;
}
