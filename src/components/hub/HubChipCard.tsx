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
  /** When true, card fills grid cell (w-full). Use for non-scrollable grid layout. */
  fill?: boolean;
  /** When true, show selected state (ring). */
  isSelected?: boolean;
};

export function HubChipCard({
  label,
  onClick,
  isRTL,
  icon: Icon,
  iconColor,
  fill = false,
  isSelected = false,
}: HubChipCardProps) {
  const iconColorStyle = iconColor ? { color: iconColor } : undefined;
  const circleBg = iconColor
    ? { backgroundColor: `${iconColor}35` }
    : { backgroundColor: "hsl(var(--muted) / 0.5)" };
  const EffectiveIcon = Icon ?? LayoutGrid;

  return (
    <button
      type="button"
      className={cn(
        HUB_CARD_BASE,
        "min-h-[110px] bg-card px-4 py-4 transition-colors hover:bg-muted/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        fill ? "w-full min-w-0" : "shrink-0 w-[72vw] max-w-[320px] snap-start",
        isRTL && "text-right",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onClick}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex flex-col items-center justify-center gap-3 text-center">
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
        <span className="text-sm font-semibold line-clamp-2">{label}</span>
      </div>
    </button>
  );
}
