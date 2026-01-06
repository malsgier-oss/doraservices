// Dora phone utilities (Libya)

export function cleanPhoneForStorage(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");

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

export function phoneToInternalEmail(localPhone: string): string {
  const cleaned = cleanPhoneForStorage(localPhone);
  return `${cleaned}@dora.ly`;
}

export function getDigitsOnly(phone: string): string {
  return (phone || "").replace(/\D/g, "");
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

// legacy
export function normalizePhone(phone: string): string {
  let cleaned = (phone || "").replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "218" + cleaned.slice(1);
  if (!cleaned.startsWith("218")) cleaned = "218" + cleaned;

  return "+" + cleaned;
}