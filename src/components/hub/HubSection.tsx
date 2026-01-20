import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HubSectionProps = {
  id?: string;
  title: string;
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
  count,
  actionLabel,
  onAction,
  action,
  className,
  children,
}: HubSectionProps) {
  return (
    <section id={id} className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {typeof count === "number" ? (
            <span className="text-xs text-muted-foreground">{count}</span>
          ) : null}
        </div>
        {action
          ? action
          : actionLabel && onAction
            ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 px-3 text-xs"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )
            : null}
      </div>
      {children}
    </section>
  );
}
