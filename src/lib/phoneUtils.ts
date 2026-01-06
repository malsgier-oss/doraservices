// Phone utility functions for Dora auth system
// Libya country code: +218

/**
 * Normalize phone number to +218XXXXXXXXX format
 * Accepts: 0912345678, +218912345678, 218912345678
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
 * Convert normalized phone to internal email for Supabase auth
 * +218912345678 → 218912345678@phone.dora.ly
 */
export function phoneToInternalEmail(normalizedPhone: string): string {
  const digits = getDigitsOnly(normalizedPhone);
  return `${digits}@phone.dora.ly`;
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidLibyanPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Should be +218 followed by 9 digits
  return /^\+218\d{9}$/.test(normalized);
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  // Format as +218 XX XXX XXXX
  const digits = getDigitsOnly(normalized);
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return normalized;
}

/**
 * Generate WhatsApp link from phone
 */
export function getWhatsAppLink(phone: string): string {
  const digits = getDigitsOnly(normalizePhone(phone));
  return `https://wa.me/${digits}`;
}

/**
 * Generate tel: link from phone
 */
export function getTelLink(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}
