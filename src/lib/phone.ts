const ARABIC_INDIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const EASTERN_ARABIC_INDIC_DIGITS: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function toAsciiDigits(input: string | null | undefined) {
  const raw = String(input || "");
  return raw
    .split("")
    .map((char) => ARABIC_INDIC_DIGITS[char] ?? EASTERN_ARABIC_INDIC_DIGITS[char] ?? char)
    .join("");
}

export function digitsOnlyAscii(input: string | null | undefined) {
  return toAsciiDigits(input).replace(/\D/g, "");
}

export function normalizeLibyaForTel(input: string | null | undefined) {
  const digits = digitsOnlyAscii(input);
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

export function normalizeLibyaForWhatsApp(input: string | null | undefined) {
  let digits = digitsOnlyAscii(input);
  if (!digits) return "";

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("218")) return digits;
  if (digits.length === 10 && digits.startsWith("0")) return `218${digits.slice(1)}`;
  if (digits.length === 9) return `218${digits}`;
  return digits;
}
