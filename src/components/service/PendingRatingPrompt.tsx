import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReviewDialog } from "@/components/service/ReviewDialog";
import { toast } from "sonner";

const PENDING_RATINGS_KEY = "dora_pending_ratings_v1";
const REVIEWER_KEY_STORAGE = "dora_reviewer_key_v1";

type PendingRating = {
  service_id: string;
  provider_id: string;
  provider_name: string;
  created_at: number;
  source: "call" | "whatsapp";
};

function getOrCreateReviewerKey(): string {
  try {
    const existing = localStorage.getItem(REVIEWER_KEY_STORAGE);
    if (existing) return existing;
    const key = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `${Date.now()}_${Math.random()}`;
    localStorage.setItem(REVIEWER_KEY_STORAGE, key);
    return key;
  } catch {
    return `${Date.now()}_${Math.random()}`;
  }
}

function readPending(): PendingRating[] {
  try {
    const raw = localStorage.getItem(PENDING_RATINGS_KEY);
    const list = raw ? (JSON.parse(raw) as PendingRating[]) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writePending(list: PendingRating[]) {
  try {
    localStorage.setItem(PENDING_RATINGS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // ignore
  }
}

export function PendingRatingPrompt() {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PendingRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDelayMs = 5 * 60 * 1000; // "after a while"

  const eligible = useMemo(() => {
    const list = readPending();
    const now = Date.now();
    return list.find((x) => now - x.created_at >= minDelayMs) || null;
  }, [open]);

  useEffect(() => {
    // Only show one prompt at a time.
    if (open) return;

    const next = eligible;
    if (!next) return;

    setActive(next);
    setOpen(true);
  }, [eligible, open]);

  const removeActiveFromQueue = () => {
    if (!active) return;
    const list = readPending().filter(
      (x) => !(x.service_id === active.service_id && x.provider_id === active.provider_id),
    );
    writePending(list);
  };

  const onSubmit = async (rating: number, content: string) => {
    if (!active) return;

    setIsSubmitting(true);
    try {
      const reviewerKey = user ? null : getOrCreateReviewerKey();

      const { error } = await supabase.from("service_reviews").insert({
        service_id: active.service_id,
        provider_id: active.provider_id,
        rating,
        content: content?.trim() || null,
        user_id: user?.id ?? null,
        reviewer_key: reviewerKey,
      } as any);

      if (error) {
        // Unique violation (already reviewed)
        if ((error as any).code === "23505") {
          toast.info(isRTL ? "تم إرسال تقييمك مسبقاً" : "You already rated this provider");
        } else {
          console.error(error);
          toast.error(isRTL ? "فشل إرسال التقييم" : "Failed to submit rating");
        }
        return;
      }

      toast.success(isRTL ? "شكراً لتقييمك" : "Thanks for your feedback");
      removeActiveFromQueue();
      setOpen(false);
      setActive(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // If user dismisses, remove from queue (no nagging).
    if (!nextOpen) {
      removeActiveFromQueue();
      setActive(null);
    }
    setOpen(nextOpen);
  };

  if (!active) return null;

  return (
    <ReviewDialog
      open={open}
      onOpenChange={handleOpenChange}
      providerName={active.provider_name}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
