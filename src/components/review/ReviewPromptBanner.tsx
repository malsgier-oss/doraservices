import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReviewPrompts, ReviewPrompt } from "@/hooks/useReviewPrompts";
import { ReviewDialog } from "@/components/service/ReviewDialog";
import { useReviews } from "@/hooks/useReviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReviewPromptBanner() {
  const { isRTL } = useLanguage();
  const { prompts, dismissPrompt, markReviewed, hasPrompts } = useReviewPrompts();
  const [currentPrompt, setCurrentPrompt] = useState<ReviewPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use reviews hook for the current prompt's service
  const { submitReview, userReview } = useReviews(currentPrompt?.service_id);

  if (!hasPrompts) return null;

  const prompt = prompts[0]; // Show first pending prompt

  const handleOpenReview = () => {
    setCurrentPrompt(prompt);
    setDialogOpen(true);
  };

  const handleDismiss = () => {
    dismissPrompt.mutate(prompt.id);
  };

  const handleSubmitReview = async (rating: number, content: string) => {
    if (!currentPrompt) return;

    setIsSubmitting(true);
    const { error } = await submitReview({
      rating,
      content: content || undefined,
      providerId: currentPrompt.provider_id,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(isRTL ? "حدث خطأ" : "Error submitting review");
    } else {
      toast.success(isRTL ? "شكراً لتقييمك!" : "Thanks for your review!");
      markReviewed.mutate(currentPrompt.id);
      setDialogOpen(false);
      setCurrentPrompt(null);
    }
  };

  return (
    <>
      <div 
        className={cn(
          "bg-primary/10 border border-primary/20 rounded-2xl p-4 mx-4 mb-4",
          "flex items-center gap-3"
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">
            {isRTL ? "كيف كانت تجربتك؟" : "How was your experience?"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isRTL ? `مع ${prompt.provider_name}` : `With ${prompt.provider_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" onClick={handleOpenReview} className="rounded-full">
            {isRTL ? "قيّم" : "Rate"}
          </Button>
          <button 
            onClick={handleDismiss}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {currentPrompt && (
        <ReviewDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setCurrentPrompt(null);
          }}
          providerName={currentPrompt.provider_name || "Provider"}
          existingReview={userReview ? { rating: userReview.rating, content: userReview.content } : undefined}
          onSubmit={handleSubmitReview}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}
