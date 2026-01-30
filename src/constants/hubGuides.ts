import type { LucideIcon } from "lucide-react";
import { Zap, Droplets, Wind, ClipboardCheck } from "lucide-react";

export type GuideCard = {
  id: string;
  icon: LucideIcon;
  title: string;
  summaryLines: [string, string];
  bullets: string[];
};

/** Fallback guides when DB has none. Phase 3: admin-controlled content. */
export const DEFAULT_GUIDES_AR: GuideCard[] = [
  {
    id: "guide-electricity",
    icon: Zap,
    title: "قبل ما تتصل بالكهربائي",
    summaryLines: [
      "هل المشكلة من العداد أو داخل البيت؟",
      "اسأل عن المعاينة قبل بدء التصليح",
    ],
    bullets: [
      "هل المشكلة من العداد أو داخل البيت؟",
      "اسأل لو في معاينة قبل بدء الشغل",
      "حدّد مكان المشكلة بدقة",
      "اسأل لو السعر تقريبي أو نهائي",
      "اتفق على الوقت قبل ما يطلع الفني",
    ],
  },
  {
    id: "guide-plumbing",
    icon: Droplets,
    title: "تبي سباك؟",
    summaryLines: [
      "صوّر المشكلة قبل ما تتصل",
      "اسأل لو السعر شامل القطعة",
    ],
    bullets: [
      "صوّر المشكلة قبل ما تتصل",
      "اسأل لو السعر شامل القطعة",
      "خليك واضح: تسريب ولا انسداد؟",
      "اتفق على سعر تقريبي قبل الزيارة",
      "اسأل عن مدة الشغل والضمان",
    ],
  },
  {
    id: "guide-ac",
    icon: Wind,
    title: "صيانة التكييف",
    summaryLines: [
      "تنظيف أو فريون؟ الفرق كبير بالسعر",
      "اسأل عن الضمان بعد الشغل",
    ],
    bullets: [
      "تنظيف أو فريون؟ الفرق كبير بالسعر",
      "اسأل عن الضمان بعد الشغل",
      "اسأل هل السعر شامل زيارة وفحص",
      "حدد نوع التكييف وقدرته (مثلاً 1.5 طن)",
      "اتفق لو في قطع غيار قبل التركيب",
    ],
  },
  {
    id: "guide-general",
    icon: ClipboardCheck,
    title: "كيف تختار فني صح",
    summaryLines: [
      "خليك واضح من أول مكالمة",
      "لا تدفع كامل المبلغ قبل الشغل",
    ],
    bullets: [
      "خليك واضح من أول مكالمة",
      "لا تدفع كامل المبلغ قبل الشغل",
      "اسأل عن مدة التنفيذ قبل ما يجي",
      "اتفق على السعر أو الحد الأعلى",
      "خلي كلامك بسيط ومحدد",
    ],
  },
];

export const DEFAULT_GUIDES_EN: GuideCard[] = [
  {
    id: "guide-electricity",
    icon: Zap,
    title: "Before you call an electrician",
    summaryLines: [
      "Is it the meter or inside the home?",
      "Ask if there is an inspection fee",
    ],
    bullets: [
      "Is it the meter or inside the home?",
      "Ask if there is an inspection fee",
      "Describe the problem location clearly",
      "Confirm if the price is estimate or final",
      "Agree on timing before the visit",
    ],
  },
  {
    id: "guide-plumbing",
    icon: Droplets,
    title: "Need a plumber?",
    summaryLines: [
      "Take a photo before you call",
      "Ask if the part is included",
    ],
    bullets: [
      "Take a photo before you call",
      "Ask if the part is included",
      "Be clear: leak or blockage?",
      "Agree on an estimate before the visit",
      "Ask about duration and warranty",
    ],
  },
  {
    id: "guide-ac",
    icon: Wind,
    title: "AC service",
    summaryLines: [
      "Cleaning vs freon changes the price",
      "Ask about warranty",
    ],
    bullets: [
      "Cleaning vs freon changes the price",
      "Ask about warranty",
      "Ask if the visit/inspection is included",
      "Confirm the brand and unit size",
      "Agree on timing",
    ],
  },
  {
    id: "guide-general",
    icon: ClipboardCheck,
    title: "Choose a technician wisely",
    summaryLines: [
      "Be clear from the first call",
      "Don't pay the full amount upfront",
    ],
    bullets: [
      "Be clear from the first call",
      "Don't pay the full amount upfront",
      "Confirm what is included in the price",
      "Ask about expected time",
      "Keep messages/photos as reference",
    ],
  },
];
