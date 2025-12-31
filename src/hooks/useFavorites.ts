import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavoriteIds(new Set());
      setLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("saved_businesses")
      .select("business_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching favorites:", error);
    } else {
      setFavoriteIds(new Set(data?.map(d => d.business_id) || []));
    }
    setLoading(false);
  };

  const toggleFavorite = async (serviceId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const isFavorited = favoriteIds.has(serviceId);

    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from("saved_businesses")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", serviceId);

      if (!error) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
      }
      return { error, removed: true };
    } else {
      // Add to favorites
      const { error } = await supabase
        .from("saved_businesses")
        .insert({
          user_id: user.id,
          business_id: serviceId,
        });

      if (!error) {
        setFavoriteIds(prev => new Set(prev).add(serviceId));
      }
      return { error, added: true };
    }
  };

  const isFavorite = (serviceId: string) => favoriteIds.has(serviceId);

  return {
    favoriteIds,
    loading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: fetchFavorites,
  };
}
