// Dora phone utilities (Libya)

// Convert Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic-Indic (۰۱۲۳۴۵۶۷۸۹) digits to ASCII.
export function toAsciiDigits(input: string): string {
  const s = String(input ?? "");
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

export function cleanPhoneForStorage(phone: string): string {
  let digits = toAsciiDigits(phone || "").replace(/\D/g, "");

  if (digits.startsWith("00218")) digits = digits.slice(5);
  if (digits.startsWith("218")) digits = digits.slice(3);

  if (digits.length === 9 && digits.startsWith("9")) digits = `0${digits}`;
  if (digits.length === 9 && !digits.startsWith("0")) digits = `0${digits}`;

  if (digits.length > 10) digits = digits.slice(0, 10);

  return digits;
}

export function isValidLibyanPhone(phone: string): boolean {
  const cleaned = cleanPhoneForStorage(phone);
  return /^09\d{8}$/.test(cleaned);
}

export function getDigitsOnly(phone: string): string {
  return toAsciiDigits(phone || "").replace(/\D/g, "");
}

export function getWhatsAppLink(phone: string): string {
  const cleaned = cleanPhoneForStorage(phone);
  if (/^09\d{8}$/.test(cleaned)) return `https://wa.me/218${cleaned.slice(1)}`;

  const digits = getDigitsOnly(phone);
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}

export function getTelLink(phone: string): string {
  const cleaned = cleanPhoneForStorage(phone);
  if (/^09\d{8}$/.test(cleaned)) return `tel:+218${cleaned.slice(1)}`;

  const digits = getDigitsOnly(phone);
  return digits ? `tel:+${digits}` : "tel:";
}

export function formatPhoneDisplay(phone: string): string {
  return cleanPhoneForStorage(phone);
}


export function libyaPhoneToE164(phone: string): string {
  // Returns E.164 (+218...) for Supabase Phone OTP.
  // Accepts local formats like 09XXXXXXXX, 9XXXXXXXX, 2189..., +2189...
  return normalizePhone(phone);
}

// legacy
export function normalizePhone(phone: string): string {
  let cleaned = toAsciiDigits(phone || "").replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "218" + cleaned.slice(1);
  if (!cleaned.startsWith("218")) cleaned = "218" + cleaned;

  return "+" + cleaned;
}