import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Plus, Edit, Trash2, ArrowUp, ArrowDown,
  Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper,
  Wrench, Droplets, Wind, Fuel, ClipboardCheck, Sun, Cog, Scale,
  Languages, Camera, UtensilsCrossed, Stethoscope, Activity, Dog,
  Scissors, Laptop, PawPrint, Sparkles, Dumbbell, Utensils, Music,
  Plane, ShoppingCart, Baby, Paintbrush, LucideIcon
} from "lucide-react";
import { Category, useAllCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

// Icon mapping for rendering actual icons
const ICON_MAP: Record<string, LucideIcon> = {
  Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper,
  Wrench, Droplets, Wind, Fuel, ClipboardCheck, Sun, Cog, Scale,
  Languages, Camera, UtensilsCrossed, Stethoscope, Activity, Dog,
  Scissors, Laptop, PawPrint, Sparkles, Dumbbell, Utensils, Music,
  Plane, ShoppingCart, Baby, Paintbrush
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  { value: "bg-[#FFEBD4]", label: "Peach" },
  { value: "bg-[#FFE9A8]", label: "Yellow" },
  { value: "bg-[#FFD6B0]", label: "Orange" },
  { value: "bg-[#C5D8F8]", label: "Blue" },
  { value: "bg-[#D4C4B0]", label: "Brown" },
  { value: "bg-[#B8E0E0]", label: "Teal" },
  { value: "bg-[#D4E5D2]", label: "Green" },
  { value: "bg-[#E8D4F0]", label: "Purple" },
  { value: "bg-[#C5E8F8]", label: "Light Blue" },
  { value: "bg-[#E8F4E8]", label: "Light Green" },
  { value: "bg-[#FFE4E4]", label: "Pink" },
  { value: "bg-[#F0F0F0]", label: "Gray" },
];

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useAllCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    icon: "Home",
    color: "bg-[#FFEBD4]",
    is_active: true,
  });

  const createCategory = useMutation({
    mutationFn: async (data: typeof form & { display_order: number }) => {
      const { error } = await supabase.from("categories").insert(data);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "category_created",
        p_target_type: "category",
        p_details: { name: data.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to create category");
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from("categories").update(data).eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "category_updated",
        p_target_type: "category",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to update category");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("category", categories?.find((c) => c.id === id)?.name || "");

      if (count && count > 0) {
        throw new Error(`Cannot delete: ${count} services use this category`);
      }

      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "category_deleted",
        p_target_type: "category",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    },
  });

  const reorderCategory = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const sorted = [...(categories || [])].sort((a, b) => a.display_order - b.display_order);
      const currentIndex = sorted.findIndex((c) => c.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sorted.length) return;

      const current = sorted[currentIndex];
      const target = sorted[targetIndex];

      await Promise.all([
        supabase.from("categories").update({ display_order: target.display_order }).eq("id", current.id),
        supabase.from("categories").update({ display_order: current.display_order }).eq("id", target.id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: () => {
      toast.error("Failed to reorder");
    },
  });

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm({ name: "", name_ar: "", icon: "Home", color: "bg-[#FFEBD4]", is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      name_ar: category.name_ar || "",
      icon: category.icon,
      color: category.color,
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, ...form });
    } else {
      const maxOrder = Math.max(...(categories?.map((c) => c.display_order) || [0]));
      createCategory.mutate({ ...form, display_order: maxOrder + 1 });
    }
  };

  const sortedCategories = [...(categories || [])].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage service categories as shown on the main page</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Preview Section - Shows categories as they appear on main page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview (Main Page Style)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-[100px] h-[100px] rounded-[20px] flex-shrink-0" />
              ))}
            </div>
          ) : sortedCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories found</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {sortedCategories.filter(c => c.is_active).map((category) => {
                const IconComponent = ICON_MAP[category.icon] || Home;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "flex-shrink-0 w-[100px] h-[100px] rounded-[20px] flex flex-col items-center justify-center gap-2",
                      category.color
                    )}
                  >
                    <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#333] text-center px-1 leading-tight">
                      {category.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories ({sortedCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories found. Add your first category!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCategories.map((category, index) => {
                const IconComponent = ICON_MAP[category.icon] || Home;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "relative p-4 rounded-xl border transition-all",
                      !category.is_active && "opacity-50"
                    )}
                  >
                    {/* Category Card Preview */}
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0",
                          category.color
                        )}
                      >
                        <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{category.name}</span>
                          {!category.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {category.name_ar && (
                          <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                            {category.name_ar}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Order: {index + 1} • Icon: {category.icon}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => reorderCategory.mutate({ id: category.id, direction: "up" })}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => reorderCategory.mutate({ id: category.id, direction: "down" })}
                          disabled={index === sortedCategories.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this category?")) {
                              deleteCategory.mutate(category.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          
          {/* Live Preview */}
          <div className="flex justify-center py-4">
            <div
              className={cn(
                "w-[100px] h-[100px] rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all",
                form.color
              )}
            >
              {(() => {
                const IconComp = ICON_MAP[form.icon] || Home;
                return <IconComp className="h-7 w-7 text-[#333]" strokeWidth={1.5} />;
              })()}
              <span className="text-[10px] font-medium text-[#333] text-center px-1 leading-tight">
                {form.name || "Category"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Name (English)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Home Maintenance"
              />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                placeholder="e.g., صيانة المنزل"
                dir="rtl"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-2 mt-2 max-h-32 overflow-y-auto p-1">
                {ICON_OPTIONS.map((iconName) => {
                  const IconComp = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                        form.icon === iconName
                          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setForm({ ...form, icon: iconName })}
                      title={iconName}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {COLOR_OPTIONS.map((colorOpt) => (
                  <button
                    key={colorOpt.value}
                    type="button"
                    className={cn(
                      "h-9 w-9 rounded-lg transition-all",
                      colorOpt.value,
                      form.color === colorOpt.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:scale-105"
                    )}
                    onClick={() => setForm({ ...form, color: colorOpt.value })}
                    title={colorOpt.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Active (visible on main page)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createCategory.isPending || updateCategory.isPending}>
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
