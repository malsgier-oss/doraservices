import { cn } from "@/lib/utils";
import { HUB_DIVIDER_LIGHT } from "@/components/hub/hubStyles";

interface SectionDividerProps {
  className?: string;
  variant?: "light" | "medium" | "prominent";
}

export function SectionDivider({ className, variant = "light" }: SectionDividerProps) {
  const dividerVariants = {
    light: "border-t border-border/20 dark:border-border/30",
    medium: "border-t border-border/40 dark:border-border/50",
    prominent: "border-t border-border/60 dark:border-border/70",
  };

  return (
    <div
      className={cn(
        "my-6 md:my-8",
        dividerVariants[variant],
        className
      )}
      role="separator"
      aria-hidden="true"
    />
  );
}
