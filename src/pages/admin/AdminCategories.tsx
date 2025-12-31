import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Category, useAllCategories } from "@/hooks/useCategories";

const ICON_OPTIONS = [
  "Wrench", "Sparkles", "Car", "GraduationCap", "PartyPopper",
  "Laptop", "Heart", "Scale", "Camera", "Dumbbell", "Home",
  "Briefcase", "Utensils", "Music", "Plane", "ShoppingCart",
  "Baby", "Paintbrush", "Scissors", "Dog",
];

const COLOR_OPTIONS = [
  "bg-blue-500", "bg-pink-500", "bg-orange-500", "bg-purple-500",
  "bg-yellow-500", "bg-cyan-500", "bg-red-500", "bg-emerald-500",
  "bg-indigo-500", "bg-lime-500", "bg-rose-500", "bg-teal-500",
];

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useAllCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    icon: "Wrench",
    color: "bg-blue-500",
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
      // Check if any services use this category
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
    setForm({ name: "", name_ar: "", icon: "Wrench", color: "bg-blue-500", is_active: true });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage service categories</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Arabic Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(categories || [])]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span>{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center text-white text-xs`}>
                          {category.icon.slice(0, 2)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.name_ar || "-"}</TableCell>
                      <TableCell>
                        <div className={`w-6 h-6 rounded ${category.color}`} />
                      </TableCell>
                      <TableCell>
                        {category.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reorderCategory.mutate({ id: category.id, direction: "up" })}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reorderCategory.mutate({ id: category.id, direction: "down" })}
                            disabled={index === (categories?.length || 0) - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this category?")) {
                                deleteCategory.mutate(category.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
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
            <div>
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-lg ${color} ${form.color === color ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
