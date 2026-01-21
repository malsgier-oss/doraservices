import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessReview {
  id: string;
  user_id: string;
  business_id: string;
  rating: number;
  content: string | null;
  created_at: string;
}

export interface BusinessRating {
  averageRating: number;
  totalReviews: number;
}

export function useBusinessReviews(businessId: string | null | undefined) {
  return useQuery({
    queryKey: ["business-reviews", businessId],
    queryFn: async (): Promise<BusinessReview[]> => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching business reviews:", error);
        return [];
      }

      return (data || []) as BusinessReview[];
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

export function useBusinessRating(businessId: string | null | undefined) {
  const { data: reviews } = useBusinessReviews(businessId);

  return useQuery({
    queryKey: ["business-rating", businessId],
    queryFn: async (): Promise<BusinessRating> => {
      if (!reviews || reviews.length === 0) {
        return { averageRating: 0, totalReviews: 0 };
      }

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / reviews.length;

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
      };
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });
}
