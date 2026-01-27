import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HubSectionProps = {
  id?: string;
  title: string;
  icon?: LucideIcon;
  count?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function HubSection({
  id,
  title,
  icon: Icon,
  count,
  actionLabel,
  onAction,
  action,
  className,
  children,
}: HubSectionProps) {
  return (
    <section id={id} className={cn("space-y-5", className)}>
      <div dir="rtl" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
            {typeof count === "number" && count > 0 && (
              <span className="text-sm text-muted-foreground font-medium">({count})</span>
            )}
          </div>
        </div>
        {action
          ? action
          : actionLabel && onAction
            ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 px-4 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onAction}
              >
                {actionLabel}
                <svg className="ms-1 h-3 w-3 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )
            : null}
      </div>
      {children}
    </section>
  );
}
