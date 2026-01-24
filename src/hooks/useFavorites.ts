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
    
    // TODO: Implement service favorites fetching if needed
    setFavoriteIds(new Set());
    setLoading(false);
  };

  const toggleFavorite = async (serviceId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const isFavorited = favoriteIds.has(serviceId);

    if (isFavorited) {
      // Remove from favorites
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
      return { error: null, removed: true };
    } else {
      // Add to favorites
      setFavoriteIds(prev => new Set(prev).add(serviceId));
      return { error: null, added: true };
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
