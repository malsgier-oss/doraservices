import { useState } from "react";
import { PenSquare, Image, Send, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { CommunityPost } from "@/components/community/CommunityPost";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { usePosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { posts, loading, createPost } = usePosts();

  const handlePost = async () => {
    if (!newPost.trim()) return;
    
    setIsSubmitting(true);
    const { error } = await createPost({ content: newPost.trim() });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Post shared!",
        description: "Your post is now visible to the community.",
      });
      setNewPost("");
      setShowComposer(false);
    }
    setIsSubmitting(false);
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Layout>
      {/* Header */}
      <section className="bg-warm py-12">
        <div className="container">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Community Feed
          </h1>
          <p className="text-muted-foreground">
            Connect with neighbors, share recommendations, and stay updated
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="container max-w-2xl">
          {/* Create Post */}
          <div className="bg-card rounded-2xl p-5 shadow-card mb-8">
            {!showComposer ? (
              <button
                onClick={() => setShowComposer(true)}
                className="flex items-center gap-3 w-full text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-warm text-warm-foreground font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 px-4 py-3 rounded-full bg-secondary text-muted-foreground text-sm">
                  What's on your mind?
                </div>
                <PenSquare className="h-5 w-5 text-muted-foreground" />
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-warm text-warm-foreground font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Share something with your community..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      className="min-h-[100px] border-0 bg-secondary resize-none focus-visible:ring-1"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button variant="ghost" size="sm">
                    <Image className="h-4 w-4 mr-2" />
                    Add Photo
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowComposer(false);
                        setNewPost("");
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="warm"
                      size="sm"
                      onClick={handlePost}
                      disabled={!newPost.trim() || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Posts */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in"
                >
                  <CommunityPost
                    id={post.id}
                    authorName={post.profiles?.full_name || "Community Member"}
                    authorAvatar={post.profiles?.avatar_url || ""}
                    authorInitials={(post.profiles?.full_name || "CM").slice(0, 2).toUpperCase()}
                    content={post.content}
                    image={post.image_url || undefined}
                    timestamp={formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    likes={post.likes_count}
                    comments={post.comments_count}
                    shares={0}
                    businessName={post.businesses?.name}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl shadow-card">
              <PenSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No posts yet. Be the first to share something!
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Community;
