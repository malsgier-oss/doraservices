// Phone utility functions for Dora auth system
// Libya country code: +218
// STRICT LOCAL FORMAT: 09XXXXXXXX only (10 digits, starts with 09)

/**
 * Validate phone number format - STRICT local format only
 * Accept ONLY: 09XXXXXXXX (exactly 10 digits starting with 09)
 */
export function isValidLibyanPhone(phone: string): boolean {
  // Remove any spaces (in case user accidentally adds them)
  const cleaned = phone.replace(/\s/g, '');
  // Must be exactly 10 digits starting with 09
  return /^09\d{8}$/.test(cleaned);
}

/**
 * Clean phone for storage - removes spaces only, keeps as-is
 * Input: 09XXXXXXXX (with possible spaces)
 * Output: 09XXXXXXXX (exactly as entered, no spaces)
 */
export function cleanPhoneForStorage(phone: string): string {
  return phone.replace(/\s/g, '');
}

/**
 * Convert local phone to internal email for Supabase auth
 * 0912345678 → 2189123456789@phone.dora.ly
 * We convert 0 → 218 internally for the email mapping only
 */
export function phoneToInternalEmail(localPhone: string): string {
  const cleaned = cleanPhoneForStorage(localPhone);
  // Convert 09XXXXXXXX to 2189XXXXXXXX for email
  const withCountryCode = '218' + cleaned.slice(1);
  return `${withCountryCode}@phone.dora.ly`;
}

/**
 * LEGACY: Normalize phone to +218 format (for backward compatibility with existing data)
 * This should NOT be used for new signups
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  
  // If starts with 0, replace with 218
  if (cleaned.startsWith('0')) {
    cleaned = '218' + cleaned.slice(1);
  }
  
  // If doesn't start with 218, prepend it
  if (!cleaned.startsWith('218')) {
    cleaned = '218' + cleaned;
  }
  
  return '+' + cleaned;
}

/**
 * Get digits only from phone number (for WhatsApp links)
 */
export function getDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Generate WhatsApp link from phone
 * Handles both local (09XXXXXXXX) and normalized (+218XXXXXXXX) formats
 */
export function getWhatsAppLink(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  // If local format (starts with 0), convert to international
  if (cleaned.startsWith('0')) {
    const international = '218' + cleaned.slice(1);
    return `https://wa.me/${international}`;
  }
  // Otherwise use digits only
  const digits = getDigitsOnly(cleaned);
  return `https://wa.me/${digits}`;
}

/**
 * Generate tel: link from phone
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  // If local format, convert to international for tel link
  if (cleaned.startsWith('0')) {
    return `tel:+218${cleaned.slice(1)}`;
  }
  // If already has +, use as-is
  if (cleaned.startsWith('+')) {
    return `tel:${cleaned}`;
  }
  return `tel:+${cleaned}`;
}

/**
 * Format phone for display - returns exactly as stored
 */
export function formatPhoneDisplay(phone: string): string {
  return phone;
}
