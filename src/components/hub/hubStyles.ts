export const HUB_CARD_BASE =
  "rounded-2xl bg-card shadow-[0_8px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 active:scale-[0.98]";

/** Horizontal scroll row: max 4 cards visible, scroll for more (matches Buy & Sell category sections). */
export const HUB_CARD_ROW_4 =
  "flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4";

/** Slot width for 4-cards layout: ~4 visible on desktop, fewer on small screens. */
export const HUB_CARD_SLOT_4 =
  "shrink-0 w-[72vw] sm:w-[48vw] max-w-[240px] snap-center";

export const HUB_SECTION_SPACING = "space-y-6";

export const HUB_CONTAINER_PADDING = "px-4 space-y-8";

export const HUB_HEADER_SPACING = "space-y-6";

// Enhanced shadow utilities with depth levels
export const HUB_SHADOW_SUBTLE =
  "shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.12)]";

export const HUB_SHADOW_MEDIUM =
  "shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.2)]";

export const HUB_SHADOW_PROMINENT =
  "shadow-[0_12px_40px_rgba(15,23,42,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.3)]";

// Ring utilities for focus and interactive states
export const HUB_RING_BASE = "ring-1 ring-black/5 dark:ring-white/10";

export const HUB_RING_FOCUS = "ring-2 ring-primary/40 dark:ring-primary/60";

// Divider utilities for section separation
export const HUB_DIVIDER_LIGHT = "border-border/30 dark:border-border/40";

export const HUB_DIVIDER_MEDIUM = "border-border/50 dark:border-border/60";

// Spacing standardization
export const HUB_SPACING_XS = "space-y-2";
export const HUB_SPACING_SM = "space-y-3";
export const HUB_SPACING_MD = "space-y-4";
export const HUB_SPACING_LG = "space-y-6";
export const HUB_SPACING_XL = "space-y-8";

// Section padding consistency
export const HUB_SECTION_PADDING = "p-4 md:p-6";
export const HUB_CARD_PADDING = "p-3 md:p-4";

// Responsive grid gaps
export const HUB_GRID_GAP_COMPACT = "gap-2 md:gap-3";
export const HUB_GRID_GAP_NORMAL = "gap-3 md:gap-4";
export const HUB_GRID_GAP_SPACIOUS = "gap-4 md:gap-6";
