import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface CommunityPostProps {
  id: string;
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

export function CommunityPost({
  author,
  content,
  image,
  likes: initialLikes,
  comments,
  timeAgo,
}: CommunityPostProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  return (
    <article className="bg-card rounded-2xl p-5 shadow-card animate-fade-in">
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback className="bg-warm text-warm-foreground font-medium">
            {author.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{author.name}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed mb-4">{content}</p>

      {/* Image */}
      {image && (
        <div className="rounded-xl overflow-hidden mb-4">
          <img src={image} alt="" className="w-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={liked ? "text-destructive" : "text-muted-foreground"}
        >
          <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-current" : ""}`} />
          {likes}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <MessageCircle className="h-4 w-4 mr-1.5" />
          {comments}
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
