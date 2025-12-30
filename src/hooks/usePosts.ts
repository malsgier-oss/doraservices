import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  user_id: string;
  business_id: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

interface PostWithProfile extends Post {
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  businesses?: {
    name: string;
  } | null;
}

export function usePosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    // First fetch posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      setLoading(false);
      return;
    }

    // Then fetch profiles for each unique user_id
    const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    // Fetch business names
    const businessIds = [...new Set(postsData?.filter(p => p.business_id).map(p => p.business_id) || [])];
    const { data: businessesData } = businessIds.length > 0 
      ? await supabase.from("businesses").select("id, name").in("id", businessIds)
      : { data: [] };

    // Combine the data
    const postsWithProfiles = postsData?.map(post => ({
      ...post,
      profiles: profilesData?.find(p => p.user_id === post.user_id) || null,
      businesses: businessesData?.find(b => b.id === post.business_id) || null,
    })) || [];

    setPosts(postsWithProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createPost = async (postData: { 
    content: string; 
    image_url?: string;
    business_id?: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("posts")
      .insert({
        ...postData,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (!error && data) {
      // Fetch profile for this user
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      const postWithProfile: PostWithProfile = {
        ...data,
        profiles: profileData || null,
        businesses: null,
      };
      
      setPosts((prev) => [postWithProfile, ...prev]);
    }

    return { data, error };
  };

  const deletePost = async (postId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }

    return { error };
  };

  return { posts, loading, createPost, deletePost, refetch: fetchPosts };
}
