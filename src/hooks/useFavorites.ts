import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Service favorites are stored in saved_businesses (business_id = service id).
 * This hook loads and persists them so the Favorites page and any heart buttons stay in sync.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_businesses")
        .select("business_id")
        .eq("user_id", user.id);

      if (error) throw error;
      const ids = new Set<string>((data || []).map((x: { business_id: string }) => String(x.business_id)));
      setFavoriteIds(ids);
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (serviceId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const id = String(serviceId);
    const isFavorited = favoriteIds.has(id);

    if (isFavorited) {
      const { error } = await supabase
        .from("saved_businesses")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", id);
      if (error) return { error };
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return { error: null, removed: true };
    } else {
      const { error } = await supabase
        .from("saved_businesses")
        .insert({ user_id: user.id, business_id: id });
      if (error) return { error };
      setFavoriteIds((prev) => new Set(prev).add(id));
      return { error: null, added: true };
    }
  };

  const isFavorite = (serviceId: string) => favoriteIds.has(String(serviceId));

  return {
    favoriteIds,
    loading,
    toggleFavorite,
    isFavorite,
    refreshFavorites: fetchFavorites,
  };
}
