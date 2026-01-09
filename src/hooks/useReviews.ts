import { useState, useEffect } from "react";
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

export function useReviews(serviceId?: string) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [rating, setRating] = useState<ServiceRating>({ averageRating: 0, totalReviews: 0 });
  const [userReview, setUserReview] = useState<ServiceReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serviceId) {
      fetchReviews();
    }
  }, [serviceId, user]);

  const fetchReviews = async () => {
    if (!serviceId) return;
    
    setLoading(true);
    try {
      // Fetch reviews for this service
      const { data: reviewsData, error } = await supabase
        .from("service_reviews")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        setLoading(false);
        return;
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setRating({ averageRating: 0, totalReviews: 0 });
        setUserReview(null);
        setLoading(false);
        return;
      }

      // Get reviewer profiles
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedReviews: ServiceReview[] = reviewsData.map(review => ({
        ...review,
        reviewer_name: profileMap.get(review.user_id)?.full_name || "User",
        reviewer_avatar: profileMap.get(review.user_id)?.avatar_url || "",
      }));

      setReviews(enrichedReviews);

      // Calculate average rating
      const totalRating = reviewsData.reduce((sum, r) => sum + r.rating, 0);
      setRating({
        averageRating: Math.round((totalRating / reviewsData.length) * 10) / 10,
        totalReviews: reviewsData.length,
      });

      // Find user's review if logged in
      if (user) {
        const myReview = enrichedReviews.find(r => r.user_id === user.id);
        setUserReview(myReview || null);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (data: { rating: number; content?: string; providerId: string }) => {
    if (!user || !serviceId) return { error: new Error("Not authenticated or no service") };

    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      return { error: new Error("Rating must be between 1 and 5") };
    }

    // Sanitize and validate content - strip HTML tags to prevent XSS
    let sanitizedContent: string | null = null;
    if (data.content) {
      // Strip all HTML tags but keep text content
      sanitizedContent = data.content.trim().replace(/<[^>]*>/g, '');
      
      if (sanitizedContent.length > 500) {
        return { error: new Error("Review content must be less than 500 characters") };
      }
      
      // Set to null if empty after sanitization
      if (sanitizedContent.length === 0) {
        sanitizedContent = null;
      }
    }

    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from("service_reviews")
          .update({
            rating: data.rating,
            content: sanitizedContent,
          })
          .eq("id", userReview.id);

        if (error) return { error };
      } else {
        // Create new review
        const { error } = await supabase
          .from("service_reviews")
          .insert({
            service_id: serviceId,
            user_id: user.id,
            provider_id: data.providerId,
            rating: data.rating,
            content: sanitizedContent,
          });

        if (error) return { error };
      }

      await fetchReviews();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const deleteReview = async () => {
    if (!user || !userReview) return { error: new Error("No review to delete") };

    const { error } = await supabase
      .from("service_reviews")
      .delete()
      .eq("id", userReview.id);

    if (!error) {
      await fetchReviews();
    }

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

// Hook to get ratings for multiple services at once
export function useServiceRatings(serviceIds: string[]) {
  const [ratings, setRatings] = useState<Map<string, ServiceRating>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serviceIds.length > 0) {
      fetchRatings();
    }
  }, [serviceIds.join(",")]);

  const fetchRatings = async () => {
    if (serviceIds.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_reviews")
        .select("service_id, rating")
        .in("service_id", serviceIds);

      if (error) {
        console.error("Error fetching ratings:", error);
        setLoading(false);
        return;
      }

      // Calculate average ratings per service
      const ratingsMap = new Map<string, ServiceRating>();
      
      serviceIds.forEach(id => {
        const serviceReviews = data?.filter(r => r.service_id === id) || [];
        if (serviceReviews.length > 0) {
          const totalRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0);
          ratingsMap.set(id, {
            averageRating: Math.round((totalRating / serviceReviews.length) * 10) / 10,
            totalReviews: serviceReviews.length,
          });
        } else {
          ratingsMap.set(id, { averageRating: 0, totalReviews: 0 });
        }
      });

      setRatings(ratingsMap);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return { ratings, loading, refreshRatings: fetchRatings };
}
