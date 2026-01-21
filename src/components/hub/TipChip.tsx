import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

type TipChipProps = {
  title: string;
  line1: string;
  line2: string;
  Icon: LucideIcon;
  onClick: () => void;
  isRTL?: boolean;
};

export function TipChip({ title, line1, line2, Icon, onClick, isRTL }: TipChipProps) {
  return (
    <button
      type="button"
      className={cn(
        HUB_CARD_BASE,
        "shrink-0 w-[64vw] max-w-[280px] min-h-[92px] bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/50",
        isRTL && "text-right"
      )}
      onClick={onClick}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-background/70 border border-border/60 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-semibold line-clamp-1">{title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{line1}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{line2}</div>
        </div>
      </div>
    </button>
  );
}
