import { useState } from "react";
import { Star, Reply, Send, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface ReviewResponseCardProps {
  review: {
    id: string;
    author: {
      name: string;
      avatar?: string;
      initials: string;
    };
    rating: number;
    content: string;
    date: string;
  };
}

export function ReviewResponseCard({ review }: ReviewResponseCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [reply, setReply] = useState("");
  const [hasReplied, setHasReplied] = useState(false);
  const [savedReply, setSavedReply] = useState("");

  const handleSubmitReply = () => {
    if (reply.trim()) {
      setSavedReply(reply);
      setHasReplied(true);
      setShowReplyForm(false);
      setReply("");
      toast({
        title: "Response sent!",
        description: "Your response has been posted publicly.",
      });
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden">
      <div className="p-5">
        {/* Review Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.author.avatar} alt={review.author.name} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
              {review.author.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-foreground">{review.author.name}</p>
              <div className="flex items-center gap-2">
                {hasReplied ? (
                  <Badge variant="outline" className="text-success border-success">
                    <Check className="h-3 w-3 mr-1" />
                    Responded
                  </Badge>
                ) : (
                  <Badge variant="secondary">Awaiting Response</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < review.rating ? "fill-star text-star" : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{review.date}</span>
            </div>
          </div>
        </div>

        {/* Review Content */}
        <p className="text-foreground text-sm leading-relaxed mb-4">
          {review.content}
        </p>

        {/* Owner Response */}
        {hasReplied && savedReply && (
          <div className="bg-warm/50 rounded-xl p-4 mb-4 border-l-4 border-primary">
            <p className="text-xs font-medium text-primary mb-1">Your Response</p>
            <p className="text-sm text-foreground">{savedReply}</p>
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <div className="space-y-3 animate-fade-in">
            <Textarea
              placeholder="Write your response to this review..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setReply("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="warm"
                size="sm"
                onClick={handleSubmitReply}
                disabled={!reply.trim()}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Response
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showReplyForm && (
          <Button
            variant={hasReplied ? "ghost" : "outline"}
            size="sm"
            onClick={() => setShowReplyForm(true)}
          >
            <Reply className="h-4 w-4 mr-1" />
            {hasReplied ? "Edit Response" : "Reply"}
          </Button>
        )}
      </div>
    </div>
  );
}
