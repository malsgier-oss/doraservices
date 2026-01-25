import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// #region agent log
const _log = (payload: { location: string; message: string; data?: Record<string, unknown>; hypothesisId?: string }) => {
  fetch("http://127.0.0.1:7242/ingest/9400dad2-6936-4b7c-930c-5ff551ab6c67", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: "debug-session" }),
  }).catch(() => {});
};
// #endregion

export interface ListingReview {
  id: string;
  listing_id: string;
  user_id: string | null;
  reviewer_key: string | null;
  rating: number;
  content: string | null;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface ListingRating {
  averageRating: number;
  totalReviews: number;
}

const LISTING_REVIEWER_KEY_STORAGE = "dora_listing_reviewer_key_v1";

function getOrCreateListingReviewerKey(): string {
  try {
    const existing = localStorage.getItem(LISTING_REVIEWER_KEY_STORAGE);
    if (existing) return existing;
    const key = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : `${Date.now()}_${Math.random()}`;
    localStorage.setItem(LISTING_REVIEWER_KEY_STORAGE, key);
    return key;
  } catch {
    return `${Date.now()}_${Math.random()}`;
  }
}

export function useListingReviews(listingId: string | null | undefined, enabled = true) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [rating, setRating] = useState<ListingRating>({ averageRating: 0, totalReviews: 0 });
  const [userReview, setUserReview] = useState<ListingReview | null>(null);
  const [loading, setLoading] = useState(true);
  // #region agent log
  const currentListingIdRef = useRef<string | null>(null);
  // #endregion

  useEffect(() => {
    // #region agent log
    _log({ location: "useListingReviews.ts:effect", message: "effect_run", data: { listingId: listingId ?? null, enabled }, hypothesisId: "B" });
    // #endregion
    if (enabled && listingId) {
      // #region agent log
      currentListingIdRef.current = listingId;
      // #endregion
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [listingId, user, enabled]);

  const fetchReviews = async () => {
    if (!listingId) return;
    const fetchingFor = listingId;
    // #region agent log
    _log({ location: "useListingReviews.ts:fetchReviews", message: "fetch_start", data: { listingId: fetchingFor }, hypothesisId: "A" });
    // #endregion

    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        supabase
          .from("listing_reviews")
          .select("*")
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false }),
        supabase.from("listing_review_stats").select("average_rating, total_reviews").eq("listing_id", listingId).maybeSingle(),
      ]);

      if (reviewsRes.error) {
        // #region agent log
        _log({ location: "useListingReviews.ts:fetchReviews", message: "fetch_reviews_error", data: { listingId: fetchingFor, error: String(reviewsRes.error?.message) }, hypothesisId: "A" });
        // #endregion
        console.error("Error fetching listing reviews:", reviewsRes.error);
        setLoading(false);
        return;
      }

      const reviewsData = reviewsRes.data || [];
      const enriched: ListingReview[] = reviewsData.map((r: any) => ({
        ...r,
        reviewer_name: "User",
        reviewer_avatar: "",
      }));

      // #region agent log
      const currentAtComplete = currentListingIdRef.current;
      const isStale = currentAtComplete !== fetchingFor;
      _log({
        location: "useListingReviews.ts:fetchReviews",
        message: isStale ? "fetch_ignored_race" : "fetch_applied",
        data: { responseFor: fetchingFor, currentListingId: currentAtComplete, reviewsCount: enriched.length, isStale },
        hypothesisId: "A",
      });
      _log({
        location: "useListingReviews.ts:fetchReviews",
        message: "stats_source",
        data: { listingId: fetchingFor, fromStats: !!statsRes.data, statsError: !!statsRes.error },
        hypothesisId: "C",
      });
      if (isStale) {
        setLoading(false);
        return;
      }
      // #endregion

      setReviews(enriched);

      if (statsRes.data) {
        setRating({
          averageRating: Math.round(Number(statsRes.data.average_rating || 0) * 10) / 10,
          totalReviews: Number(statsRes.data.total_reviews || 0),
        });
      } else {
        const totalRating = reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0);
        setRating({
          averageRating: reviewsData.length ? Math.round((totalRating / reviewsData.length) * 10) / 10 : 0,
          totalReviews: reviewsData.length,
        });
      }

      if (user) {
        const my = enriched.find((r) => r.user_id === user.id);
        setUserReview(my || null);
      } else {
        const key = getOrCreateListingReviewerKey();
        const my = enriched.find((r) => r.reviewer_key === key);
        setUserReview(my || null);
      }
    } catch (e) {
      // #region agent log
      _log({ location: "useListingReviews.ts:fetchReviews", message: "fetch_exception", data: { listingId: fetchingFor, error: String(e) }, hypothesisId: "A" });
      // #endregion
      console.error("Listing reviews fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (data: { rating: number; content?: string }) => {
    if (!listingId) return { error: new Error("No listing") };
    if (data.rating < 1 || data.rating > 5) return { error: new Error("Rating must be between 1 and 5") };

    let content: string | null = null;
    if (data.content) {
      content = data.content.trim().replace(/<[^>]*>/g, "");
      if (content.length > 500) return { error: new Error("Review must be under 500 characters") };
      if (content.length === 0) content = null;
    }

    try {
      if (userReview) {
        const { error } = await supabase
          .from("listing_reviews")
          .update({ rating: data.rating, content })
          .eq("id", userReview.id);
        if (error) return { error };
      } else {
        const reviewerKey = user ? null : getOrCreateListingReviewerKey();
        const { error } = await supabase.from("listing_reviews").insert({
          listing_id: listingId,
          user_id: user?.id ?? null,
          reviewer_key: reviewerKey,
          rating: data.rating,
          content,
        } as any);
        if (error) return { error };
      }
      await fetchReviews();
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  };

  const deleteReview = async () => {
    if (!user || !userReview || userReview.user_id !== user.id) return { error: new Error("Cannot delete") };
    const { error } = await supabase.from("listing_reviews").delete().eq("id", userReview.id);
    if (!error) await fetchReviews();
    return { error };
  };

  return {
    reviews,
    rating,
    userReview,
    loading,
    submitReview,
    deleteReview,
    refreshReviews: fetchReviews,
  };
}
