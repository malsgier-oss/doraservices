import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

// Some deployments may not have the newer optional columns (is_popular, popular_order) yet.
// If PostgREST returns a "column does not exist" error, we retry without those fields.
function stripUnsupportedColumns<T extends Record<string, any>>(payload: T) {
  const { is_popular, popular_order, ...rest } = payload as any;
  return rest as Omit<T, "is_popular" | "popular_order">;
}

function isMissingColumnError(err: unknown, column: string) {
  const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : "";
  return (
    msg.toLowerCase().includes("column") &&
    msg.toLowerCase().includes(column.toLowerCase()) &&
    msg.toLowerCase().includes("does not exist")
  );
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
      // First try with the full payload
      let { data, error } = await supabase.from("subcategories").insert(subcategory).select().single();

      // If older schema doesn't have optional columns, retry without them
      if (error && (isMissingColumnError(error, "is_popular") || isMissingColumnError(error, "popular_order"))) {
        ({ data, error } = await supabase
          .from("subcategories")
          .insert(stripUnsupportedColumns(subcategory))
          .select()
          .single());
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategory saved");
    },
    onError: (err) => {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : "Failed to save subcategory";
      toast.error(msg);
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
      let { data, error } = await supabase.from("subcategories").update(updates).eq("id", id).select().single();

      if (error && (isMissingColumnError(error, "is_popular") || isMissingColumnError(error, "popular_order"))) {
        ({ data, error } = await supabase
          .from("subcategories")
          .update(stripUnsupportedColumns(updates as any))
          .eq("id", id)
          .select()
          .single());
      }

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategory updated");
    },
    onError: (err) => {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : "Failed to update subcategory";
      toast.error(msg);
    },
  });

  const deleteSubcategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategory deleted");
    },
    onError: (err) => {
      const msg = typeof err === "object" && err && "message" in err ? String((err as any).message) : "Failed to delete subcategory";
      toast.error(msg);
    },
  });

  return { createSubcategory, updateSubcategory, deleteSubcategory };
}
