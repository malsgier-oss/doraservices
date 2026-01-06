// Phone utility functions for Dora auth system
// STRICT LOCAL FORMAT: 09XXXXXXXX only (10 digits, starts with 09)

/**
 * Convert any common Libyan input into STRICT local format: 09XXXXXXXX
 * Accepts:
 * - 09XXXXXXXX
 * - 9XXXXXXXX (adds leading 0)
 * - +2189XXXXXXXX / 2189XXXXXXXX / 002189XXXXXXXX
 * - with spaces/dashes
 *
 * Returns digits only, max 10, starting with 09 when possible.
 */
export function cleanPhoneForStorage(phone: string): string {
  let digits = (phone || "").replace(/\D/g, ""); // keep digits only

  // handle international prefixes
  if (digits.startsWith("00218")) digits = digits.slice(5);
  if (digits.startsWith("218")) digits = digits.slice(3);

  // if starts with 9 and length 9, add leading 0 -> 09xxxxxxxx
  if (digits.length === 9 && digits.startsWith("9")) digits = `0${digits}`;

  // if somehow still doesn't start with 0 but looks like local length, force leading 0
  if (digits.length === 9 && !digits.startsWith("0")) digits = `0${digits}`;

  // limit to 10 digits
  if (digits.length > 10) digits = digits.slice(0, 10);

  return digits;
}

/**
 * Validate STRICT local format only:
 * 09XXXXXXXX (exactly 10 digits starting with 09)
 */
export function isValidLibyanPhone(phone: string): boolean {
  const cleaned = cleanPhoneForStorage(phone);
  return /^09\d{8}$/.test(cleaned);
}

/**
 * Convert local phone to internal email for Supabase auth
 * Example: 0912345678 → 0912345678@dora.ly
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
  const cleaned = cleanPhoneForStorage(phone);

  // cleaned is 09xxxxxxxx, wa.me uses 218 + without 0
  if (/^09\d{8}$/.test(cleaned)) {
    return `https://wa.me/218${cleaned.slice(1)}`;
  }

  // fallback
  const digits = getDigitsOnly(phone);
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}

/**
 * Generate tel: link from phone
 */
export function getTelLink(phone: string): string {
  const cleaned = cleanPhoneForStorage(phone);

  if (/^09\d{8}$/.test(cleaned)) {
    return `tel:+218${cleaned.slice(1)}`;
  }

  const digits = getDigitsOnly(phone);
  return digits ? `tel:+${digits}` : "tel:";
}

/**
 * Format phone for display (keep strict format)
 */
export function formatPhoneDisplay(phone: string): string {
  return cleanPhoneForStorage(phone);
}