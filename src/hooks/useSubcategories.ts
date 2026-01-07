import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
  display_order: number | null;
  is_active: boolean | null;
  // Hub: admin-picked popular services
  is_popular?: boolean | null;
  popular_order?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useSubcategories(categoryId?: string) {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Subcategory[];
    },
  });
}

export function useAllSubcategories() {
  return useQuery({
    queryKey: ["subcategories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Subcategory[];
    },
  });
}

export function useSubcategoryMutations() {
  const queryClient = useQueryClient();

  const createSubcategory = useMutation({
    mutationFn: async (subcategory: {
      category_id: string;
      name: string;
      name_ar?: string;
      icon: string;
      color?: string;
      display_order?: number;
      is_active?: boolean;
      is_popular?: boolean;
      popular_order?: number | null;
    }) => {
      const { data, error } = await supabase.from("subcategories").insert(subcategory).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  const updateSubcategory = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      name_ar?: string;
      icon?: string;
      color?: string;
      display_order?: number;
      is_active?: boolean;
      is_popular?: boolean;
      popular_order?: number | null;
    }) => {
      const { data, error } = await supabase.from("subcategories").update(updates).eq("id", id).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
  });

  return { createSubcategory, updateSubcategory, deleteSubcategory };
}
