import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  existingReview?: {
    rating: number;
    content: string | null;
  };
  onSubmit: (rating: number, content: string) => Promise<void>;
  isSubmitting: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  providerName,
  existingReview,
  onSubmit,
  isSubmitting,
}: ReviewDialogProps) {
  const { t, isRTL } = useLanguage();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState(existingReview?.content || "");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(isRTL ? "يرجى اختيار تقييم" : "Please select a rating");
      return;
    }

    if (content.length > 500) {
      setError(isRTL ? "التعليق طويل جداً (الحد الأقصى 500 حرف)" : "Review is too long (max 500 characters)");
      return;
    }

    setError("");
    await onSubmit(rating, content.trim());
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setRating(existingReview?.rating || 0);
      setContent(existingReview?.content || "");
      setError("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {existingReview 
              ? (isRTL ? "تعديل التقييم" : "Edit Review")
              : (isRTL ? "تقييم" : "Rate")} {providerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <Label className="text-sm text-muted-foreground">
              {isRTL ? "تقييمك" : "Your Rating"}
            </Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {rating > 0 && (
                <>
                  {rating === 1 && (isRTL ? "سيء" : "Poor")}
                  {rating === 2 && (isRTL ? "مقبول" : "Fair")}
                  {rating === 3 && (isRTL ? "جيد" : "Good")}
                  {rating === 4 && (isRTL ? "جيد جداً" : "Very Good")}
                  {rating === 5 && (isRTL ? "ممتاز" : "Excellent")}
                </>
              )}
            </span>
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <Label htmlFor="review-content">
              {isRTL ? "تعليقك (اختياري)" : "Your Review (optional)"}
            </Label>
            <Textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isRTL ? "شارك تجربتك مع هذا المزود..." : "Share your experience with this provider..."}
              className="min-h-[100px] resize-none rounded-xl"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-full"
            disabled={isSubmitting}
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-full"
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting 
              ? (isRTL ? "جاري الحفظ..." : "Saving...") 
              : (existingReview ? (isRTL ? "تحديث" : "Update") : (isRTL ? "إرسال" : "Submit"))
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
