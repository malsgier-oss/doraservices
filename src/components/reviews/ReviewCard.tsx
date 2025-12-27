import { Star, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ReviewCardProps {
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  rating: number;
  content: string;
  date: string;
  helpful: number;
}

export function ReviewCard({
  author,
  rating,
  content,
  date,
  helpful: initialHelpful,
}: ReviewCardProps) {
  const [marked, setMarked] = useState(false);
  const [helpful, setHelpful] = useState(initialHelpful);

  const handleHelpful = () => {
    setMarked(!marked);
    setHelpful(marked ? helpful - 1 : helpful + 1);
  };

  return (
    <div className="bg-card rounded-xl p-5 shadow-card">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
            {author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-foreground">{author.name}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < rating ? "fill-star text-star" : "text-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-foreground text-sm leading-relaxed mb-4">{content}</p>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleHelpful}
        className={marked ? "text-primary" : "text-muted-foreground"}
      >
        <ThumbsUp className={`h-4 w-4 mr-1.5 ${marked ? "fill-current" : ""}`} />
        Helpful ({helpful})
      </Button>
    </div>
  );
}
