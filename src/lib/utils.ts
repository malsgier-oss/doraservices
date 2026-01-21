import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes category/subcategory names for consistent storage and filtering.
 * Ensures exact matching between written values and filter queries.
 */
export function normalizeCategory(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Cleans phone number for storage + internal login:
 * - keeps digits only
 * - supports +218 / 218 / 00218
 * - returns Libyan local mobile format: 09XXXXXXXX
 */
export function cleanPhoneForStorage(input: string) {
  let digits = (input || "").replace(/\D/g, "");

  // handle international prefixes
  if (digits.startsWith("00218")) digits = digits.slice(5);
  if (digits.startsWith("218")) digits = digits.slice(3);

  // some people enter "9XXXXXXXX" (missing leading 0)
  if (digits.length === 9 && digits.startsWith("9")) digits = `0${digits}`;

  // ensure starts with 0
  if (digits.length > 0 && !digits.startsWith("0")) digits = `0${digits}`;

  // limit to 10 digits for Libyan mobile like 09XXXXXXXX
  if (digits.length > 10) digits = digits.slice(0, 10);

  return digits;
}

export function isValidLibyanPhone(input: string) {
  const p = cleanPhoneForStorage(input);
  // 09 + 8 digits = 10 total
  return /^09\d{8}$/.test(p);
}

/**
 * Turn a phone into an internal email used for Supabase Email/Password auth.
 * Example: 0912345678 -> 0912345678@dora.ly
 */
export function phoneToInternalEmail(phoneOrDirtyInput: string) {
  const cleaned = cleanPhoneForStorage(phoneOrDirtyInput);
  return `${cleaned}@dora.ly`;
}