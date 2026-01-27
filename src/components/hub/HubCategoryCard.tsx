import type { LucideIcon } from "lucide-react";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { normalizeCategoryColor } from "@/lib/categoryIcons";

export interface HubCategoryCardProps {
  label: string;
  labelAr?: string | null;
  language: "ar" | "en";
  icon: LucideIcon;
  color?: string | null;
  onClick: () => void;
  subtitle?: string;
  /** When true, card is in a scroll row (HUB_CARD_SLOT_4). Otherwise used in grid. */
  inScrollSlot?: boolean;
}

/**
 * Buy–Sell-style category card: h-16 circle, shadow-md, colored icon, optional subtitle.
 * Used for Services main grid, shelf tiles, and Buy & Sell categories.
 */
export function HubCategoryCard({
  label,
  labelAr,
  language,
  icon: Icon,
  color,
  onClick,
  subtitle,
  inScrollSlot = false,
}: HubCategoryCardProps) {
  const hex = normalizeCategoryColor(color);
  const displayLabel = language === "ar" && labelAr ? labelAr : label;
  const slotClass = inScrollSlot ? "shrink-0 w-[72vw] sm:w-[48vw] max-w-[240px] snap-center" : "";

  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`${HUB_CARD_BASE} bg-card min-h-[100px] w-full px-3 py-3 flex flex-col items-center justify-center gap-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation hover:scale-105`}
    >
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center shadow-md"
        style={{ backgroundColor: hex + "1f" }}
      >
        <Icon className="h-6 w-6" style={{ color: hex }} strokeWidth={2.2} />
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {displayLabel}
        </div>
        {subtitle != null && subtitle !== "" && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </button>
  );

  if (inScrollSlot) {
    return <div className={slotClass}>{button}</div>;
  }
  return button;
}
