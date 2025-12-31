import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ServiceReview } from "@/hooks/useReviews";

interface ReviewListProps {
  reviews: ServiceReview[];
  loading?: boolean;
}

export function ReviewList({ reviews, loading }: ReviewListProps) {
  const { isRTL } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-muted/50 rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        {isRTL ? "لا توجد تقييمات بعد" : "No reviews yet"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div
          key={review.id}
          className={cn(
            "bg-muted/30 rounded-xl p-4",
            isRTL && "text-right"
          )}
        >
          <div className={cn(
            "flex items-start gap-3",
            isRTL && "flex-row-reverse"
          )}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.reviewer_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {review.reviewer_name?.slice(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className={cn(
                "flex items-center justify-between gap-2",
                isRTL && "flex-row-reverse"
              )}>
                <span className="font-medium text-foreground text-sm truncate">
                  {review.reviewer_name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(review.created_at), "d MMM yyyy")}
                </span>
              </div>
              
              <div className={cn("flex items-center gap-0.5 mt-1", isRTL && "flex-row-reverse justify-end")}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-3.5 w-3.5",
                      review.rating >= star
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              
              {review.content && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {review.content}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
