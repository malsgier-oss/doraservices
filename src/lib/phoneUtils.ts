// Phone utility functions for Dora auth system
// STRICT LOCAL FORMAT: 09XXXXXXXX only (10 digits, starts with 09)

/**
 * Validate phone number format - STRICT local format only
 * Accept ONLY: 09XXXXXXXX (exactly 10 digits starting with 09)
 */
export function isValidLibyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, "");
  return /^09\d{8}$/.test(cleaned);
}

/**
 * Clean phone for storage
 * Keeps local format exactly: 09XXXXXXXX
 */
export function cleanPhoneForStorage(phone: string): string {
  return phone.replace(/\s/g, "");
}

/**
 * Convert local phone to internal email for Supabase auth
 * Example:
 * 0912345678 → 0912345678@dora.ly
 *
 * Uses a REAL domain so Supabase accepts the signup.
 * Users never see or use this email.
 */
export function phoneToInternalEmail(localPhone: string): string {
  const cleaned = cleanPhoneForStorage(localPhone);
  return `${cleaned}@dora.ly`;
}

/**
 * LEGACY: Normalize phone to +218 format (READ-ONLY usage)
 * Do NOT use for new signups
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = "218" + cleaned.slice(1);
  }

  if (!cleaned.startsWith("218")) {
    cleaned = "218" + cleaned;
  }

  return "+" + cleaned;
}

/**
 * Get digits only from phone number
 */
export function getDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Generate WhatsApp link from phone
 */
export function getWhatsAppLink(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");

  if (cleaned.startsWith("0")) {
    return `https://wa.me/218${cleaned.slice(1)}`;
  }

  return `https://wa.me/${getDigitsOnly(cleaned)}`;
}

/**
 * Generate tel: link from phone
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");

  if (cleaned.startsWith("0")) {
    return `tel:+218${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("+")) {
    return `tel:${cleaned}`;
  }

  return `tel:+${cleaned}`;
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  return phone;
}