import type { LucideIcon } from "lucide-react";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

type HubChipCardProps = {
  label: string;
  onClick: () => void;
  isRTL?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
};

export function HubChipCard({
  label,
  onClick,
  isRTL,
  icon: Icon,
  iconColor,
}: HubChipCardProps) {
  const iconColorStyle = iconColor ? { color: iconColor } : undefined;
  const circleBg = iconColor
    ? { backgroundColor: `${iconColor}30` }
    : { backgroundColor: "hsl(var(--muted) / 0.5)" };
  const EffectiveIcon = Icon ?? LayoutGrid;

  return (
    <button
      type="button"
      className={cn(
        HUB_CARD_BASE,
        "shrink-0 w-[72vw] max-w-[320px] min-h-[110px] snap-start bg-card px-4 py-4 text-left transition-colors hover:bg-muted/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        isRTL && "text-right"
      )}
      onClick={onClick}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "flex items-center gap-4",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 border border-border/50"
          style={circleBg}
        >
          <EffectiveIcon
            className="h-7 w-7"
            style={iconColorStyle}
            strokeWidth={2.2}
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold line-clamp-2">{label}</span>
        </div>
      </div>
    </button>
  );
}
