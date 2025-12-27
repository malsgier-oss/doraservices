import { useState } from "react";
import { PenSquare, Image, Send } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { CommunityPost } from "@/components/community/CommunityPost";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { communityPosts } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const Community = () => {
  const [newPost, setNewPost] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const handlePost = () => {
    if (newPost.trim()) {
      toast({
        title: "Post shared!",
        description: "Your post is now visible to the community.",
      });
      setNewPost("");
      setShowComposer(false);
    }
  };

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
                  <AvatarFallback className="bg-warm text-warm-foreground font-medium">
                    You
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
                    <AvatarFallback className="bg-warm text-warm-foreground font-medium">
                      You
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
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="warm"
                      size="sm"
                      onClick={handlePost}
                      disabled={!newPost.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Posts */}
          <div className="space-y-6">
            {communityPosts.map((post, index) => (
              <div
                key={post.id}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CommunityPost {...post} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Community;
