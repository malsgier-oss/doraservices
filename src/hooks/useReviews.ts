import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ServiceReview {
  id: string;
  service_id: string;
  user_id: string;
  provider_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface ServiceRating {
  averageRating: number;
  totalReviews: number;
}

const REVIEWER_KEY_STORAGE = "dora_reviewer_key_v1";

function getOrCreateReviewerKey(): string {
  try {
    const existing = localStorage.getItem(REVIEWER_KEY_STORAGE);
    if (existing) return existing;
    const key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random()}`;
    localStorage.setItem(REVIEWER_KEY_STORAGE, key);
    return key;
  } catch {
    return `${Date.now()}_${Math.random()}`;
  }
}

async function fetchReviewsForService(serviceId: string, userId: string | undefined) {
  const { data: reviewsData, error } = await supabase
    .from("service_reviews")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!reviewsData || reviewsData.length === 0) {
    return {
      reviews: [],
      rating: { averageRating: 0, totalReviews: 0 },
      userReview: null,
    };
  }

  const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  const enrichedReviews: ServiceReview[] = reviewsData.map((review) => ({
    ...review,
    reviewer_name: profileMap.get(review.user_id)?.full_name || "User",
    reviewer_avatar: profileMap.get(review.user_id)?.avatar_url || "",
  }));

  const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
  const rating: ServiceRating = {
    averageRating: Math.round((totalRating / reviewsData.length) * 10) / 10,
    totalReviews: reviewsData.length,
  };

  const userReview = userId
    ? enrichedReviews.find((r) => r.user_id === userId) ?? null
    : null;

  return { reviews: enrichedReviews, rating, userReview };
}

export function useReviews(serviceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["reviews", serviceId, user?.id],
    queryFn: () => fetchReviewsForService(serviceId!, user?.id),
    enabled: !!serviceId,
    staleTime: 60 * 1000,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (params: {
      rating: number;
      content?: string;
      providerId: string;
      userReview: ServiceReview | null;
    }) => {
      if (!serviceId) throw new Error("No service");

      let sanitizedContent: string | null = null;
      if (params.content) {
        sanitizedContent = params.content.trim().replace(/<[^>]*>/g, "");
        if (sanitizedContent.length > 500) {
          throw new Error("Review content must be less than 500 characters");
        }
        if (sanitizedContent.length === 0) sanitizedContent = null;
      }

      const userReview = params.userReview;

      if (userReview && user) {
        const { error } = await supabase
          .from("service_reviews")
          .update({ rating: params.rating, content: sanitizedContent })
          .eq("id", userReview.id);
        if (error) throw error;
      } else {
        const reviewerKey = user ? null : getOrCreateReviewerKey();
        const { error } = await supabase.from("service_reviews").insert({
          service_id: serviceId,
          user_id: user?.id ?? null,
          reviewer_key: reviewerKey,
          provider_id: params.providerId,
          rating: params.rating,
          content: sanitizedContent,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews", serviceId] });
      void queryClient.invalidateQueries({ queryKey: ["service-ratings"] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      const data = queryClient.getQueryData<{
        reviews: ServiceReview[];
        rating: ServiceRating;
        userReview: ServiceReview | null;
      }>(["reviews", serviceId, user?.id]);
      const userReview = data?.userReview;
      if (!user || !userReview) throw new Error("No review to delete");

      const { error } = await supabase
        .from("service_reviews")
        .delete()
        .eq("id", userReview.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews", serviceId] });
      void queryClient.invalidateQueries({ queryKey: ["service-ratings"] });
    },
  });

  const submitReview = async (data: {
    rating: number;
    content?: string;
    providerId: string;
  }) => {
    if (!serviceId) return { error: new Error("No service") };
    if (data.rating < 1 || data.rating > 5) {
      return { error: new Error("Rating must be between 1 and 5") };
    }

    try {
      await submitReviewMutation.mutateAsync({
        ...data,
        userReview: query.data?.userReview ?? null,
      });
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const deleteReview = async () => {
    try {
      await deleteReviewMutation.mutateAsync();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return {
    reviews: query.data?.reviews ?? [],
    rating: query.data?.rating ?? { averageRating: 0, totalReviews: 0 },
    userReview: query.data?.userReview ?? null,
    loading: query.isLoading,
    submitReview,
    deleteReview,
    refreshReviews: () => queryClient.invalidateQueries({ queryKey: ["reviews", serviceId] }),
  };
}

async function fetchServiceRatings(serviceIds: string[]): Promise<Map<string, ServiceRating>> {
  if (serviceIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("service_review_stats")
    .select("service_id, average_rating, total_reviews")
    .in("service_id", serviceIds);

  if (error) throw error;

  const map = new Map<string, ServiceRating>();
  for (const id of serviceIds) {
    const row = (data || []).find((r: { service_id: string }) => r.service_id === id);
    if (row) {
      map.set(id, {
        averageRating: Math.round(Number(row.average_rating || 0) * 10) / 10,
        totalReviews: Number(row.total_reviews || 0),
      });
    } else {
      map.set(id, { averageRating: 0, totalReviews: 0 });
    }
  }
  return map;
}

export function useServiceRatings(serviceIds: string[]) {
  const serviceIdsKey = JSON.stringify(serviceIds);

  const query = useQuery({
    queryKey: ["service-ratings", serviceIdsKey],
    queryFn: () => fetchServiceRatings(serviceIds),
    enabled: serviceIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const ratings = query.data ?? new Map<string, ServiceRating>();

  return {
    ratings,
    loading: query.isLoading,
    refreshRatings: () => query.refetch(),
  };
}
