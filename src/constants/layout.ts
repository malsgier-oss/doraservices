/** Height of the fixed bottom mobile nav bar in pixels (excluding safe-area-inset-bottom). */
export const MOBILE_NAV_HEIGHT_PX = 62;

/** Tailwind-safe value for bottom padding: nav height + safe area. Use in pb-[...] or style. */
export const BOTTOM_SAFE_PADDING = `calc(${MOBILE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
