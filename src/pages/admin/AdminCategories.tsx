import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Dog,
  Scissors,
  Laptop,
  PawPrint,
  Sparkles,
  Dumbbell,
  Utensils,
  Music,
  Plane,
  ShoppingCart,
  Baby,
  Paintbrush,
  Hammer,
  Battery,
  Calculator,
  LucideIcon,
  Star,
} from "lucide-react";
import { Category, useAllCategories } from "@/hooks/useCategories";
import { Subcategory, useAllSubcategories, useSubcategoryMutations } from "@/hooks/useSubcategories";
import { cn } from "@/lib/utils";

// Icon mapping for rendering actual icons
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
  Sun,
  Cog,
  Scale,
  Languages,
  Camera,
  UtensilsCrossed,
  Stethoscope,
  Activity,
  Dog,
  Scissors,
  Laptop,
  PawPrint,
  Sparkles,
  Dumbbell,
  Utensils,
  Music,
  Plane,
  ShoppingCart,
  Baby,
  Paintbrush,
  Hammer,
  Battery,
  Calculator,
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
  const { data: subcategories } = useAllSubcategories();
  const { createSubcategory, updateSubcategory, deleteSubcategory } = useSubcategoryMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    icon: "Home",
    color: "bg-[#FFEBD4]",
    is_active: true,
  });

  // Subcategory dialog state
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({
    name: "",
    name_ar: "",
    icon: "Wrench",
    is_active: true,
    is_popular: false,
    popular_order: "" as string,
  });

  const [iconSearch, setIconSearch] = useState("");
  const [subIconSearch, setSubIconSearch] = useState("");


  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Popular services ordering (subcategories)
  const [popularOrderDraft, setPopularOrderDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    (subcategories || []).forEach((s) => {
      map[s.id] = s.popular_order === null || s.popular_order === undefined ? "" : String(s.popular_order);
    });


    setPopularOrderDraft(map);
  }, [subcategories]);

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

  const deleteCategoryMutation = useMutation({
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

  // Subcategory handlers
  const openCreateSubDialog = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingSubcategory(null);
    setSubForm({
      name: "",
      name_ar: "",
      icon: "Wrench",
      is_active: true,
      is_popular: false,
      popular_order: "",
    });
    setSubDialogOpen(true);
  };

  const openEditSubDialog = (sub: Subcategory) => {
    setSelectedCategoryId(sub.category_id);
    setEditingSubcategory(sub);
    setSubForm({
      name: sub.name,
      name_ar: sub.name_ar || "",
      icon: sub.icon,
      is_active: sub.is_active ?? true,
      is_popular: Boolean(sub.is_popular),
      popular_order: sub.popular_order === null || sub.popular_order === undefined ? "" : String(sub.popular_order),
    });
    setSubDialogOpen(true);
  };

  const closeSubDialog = () => {
    setSubDialogOpen(false);
    setEditingSubcategory(null);
    setSelectedCategoryId(null);
  };

  const handleSubSubmit = async () => {
    if (!subForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const po = String(subForm.popular_order || "").trim();
    const popular_order = po === "" ? null : Number(po);
    if (po !== "" && !Number.isFinite(popular_order)) {
      toast.error("Popular order must be a number");
      return;
    }

    const payload = {
      name: subForm.name,
      name_ar: subForm.name_ar,
      icon: subForm.icon,
      is_active: subForm.is_active,
      // These two may be ignored automatically on older DB schemas by the hook retry logic
      is_popular: Boolean(subForm.is_popular),
      popular_order,
    };

    try {
      if (editingSubcategory) {
        await updateSubcategory.mutateAsync({ id: editingSubcategory.id, ...payload });
      } else if (selectedCategoryId) {
        const categorySubcats = subcategories?.filter((s) => s.category_id === selectedCategoryId) || [];
        const maxOrder = Math.max(...categorySubcats.map((s) => s.display_order ?? 0), 0);
        await createSubcategory.mutateAsync({
          category_id: selectedCategoryId,
          ...payload,
          display_order: maxOrder + 1,
        });
      }
      closeSubDialog();
    } catch {
      // Errors are toasted inside the hook; keep dialog open so user can fix inputs.
    }
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const sortedCategories = [...(categories || [])].sort((a, b) => a.display_order - b.display_order);

  const getSubcategoriesForCategory = (categoryId: string) => {
    return (subcategories || [])
      .filter((s) => s.category_id === categoryId)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  };

  const togglePopular = (sub: Subcategory) => {
    const next = !(sub.is_popular === true);
    const draft = (popularOrderDraft[sub.id] ?? "").trim();
    const parsed = draft === "" ? null : Number(draft);

    if (draft !== "" && !Number.isFinite(parsed)) {
      toast.error("Popular order must be a number");
      return;
    }

    updateSubcategory.mutate({
      id: sub.id,
      is_popular: next,
      popular_order: next ? (Number.isFinite(parsed as any) ? parsed : 999) : null,
    });
  };

  const savePopularOrder = (sub: Subcategory) => {
    const draft = (popularOrderDraft[sub.id] ?? "").trim();
    const next = draft === "" ? null : Number(draft);
    if (draft !== "" && !Number.isFinite(next)) {
      toast.error("Popular order must be a number");
      return;
    }
    updateSubcategory.mutate({ id: sub.id, popular_order: next });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Categories & Subcategories</h1>
          <p className="text-muted-foreground">
            Manage main categories and their subcategories (e.g., Electrician under Home Maintenance)
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Preview Section */}
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
              {sortedCategories
                .filter((c) => c.is_active)
                .map((category) => {
                  const IconComponent = ICON_MAP[category.icon] || Home;
                  return (
                    <div
                      key={category.id}
                      className={cn(
                        "flex-shrink-0 w-[100px] h-[100px] rounded-[20px] flex flex-col items-center justify-center gap-2",
                        category.color,
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
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : sortedCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories found. Add your first category!</p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((category, index) => {
                const IconComponent = ICON_MAP[category.icon] || Home;
                const categorySubs = getSubcategoriesForCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleExpanded(category.id)}>
                    <div className={cn("rounded-xl border transition-all", !category.is_active && "opacity-50")}>
                      {/* Category Header */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0",
                              category.color,
                            )}
                          >
                            <IconComponent className="h-7 w-7 text-[#333]" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{category.name}</span>
                              {!category.is_active && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {categorySubs.length} subcategories
                              </Badge>
                            </div>
                            {category.name_ar && (
                              <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
                                {category.name_ar}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this category?")) {
                                  deleteCategoryMutation.mutate(category.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expand/Collapse Trigger */}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 w-full justify-between">
                            <span className="text-sm text-muted-foreground">
                              {isExpanded ? "Hide" : "Show"} Subcategories
                            </span>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      {/* Subcategories */}
                      <CollapsibleContent>
                        <div className="border-t px-4 py-3 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium">Subcategories</span>
                            <Button size="sm" variant="outline" onClick={() => openCreateSubDialog(category.id)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>

                          {categorySubs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No subcategories yet. Add one to enable specific service types.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {categorySubs.map((sub) => {
                                const SubIcon = ICON_MAP[sub.icon] || Wrench;
                                return (
                                  <div
                                    key={sub.id}
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg border bg-background",
                                      !sub.is_active && "opacity-50",
                                    )}
                                  >
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                      <SubIcon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{sub.name}</p>
                                      {sub.name_ar && (
                                        <p className="text-xs text-muted-foreground truncate" dir="rtl">
                                          {sub.name_ar}
                                        </p>
                                      )}
                                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{sub.is_active ? "Active" : "Inactive"}</span>
                                        {sub.is_popular === true && (
                                          <Badge variant="outline" className="text-[10px] h-5 px-2">
                                            Popular
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-7 w-7",
                                          sub.is_popular === true ? "text-yellow-600" : "text-muted-foreground",
                                        )}
                                        onClick={() => togglePopular(sub)}
                                        title={sub.is_popular === true ? "Unmark popular" : "Mark popular"}
                                      >
                                        <Star
                                          className={cn(
                                            "h-3.5 w-3.5",
                                            sub.is_popular === true && "fill-yellow-400 text-yellow-400",
                                          )}
                                        />
                                      </Button>

                                      <Input
                                        value={popularOrderDraft[sub.id] ?? ""}
                                        onChange={(e) =>
                                          setPopularOrderDraft((prev) => ({
                                            ...prev,
                                            [sub.id]: e.target.value,
                                          }))
                                        }
                                        onBlur={() => savePopularOrder(sub)}
                                        placeholder="#"
                                        className="h-7 w-14 text-xs"
                                        inputMode="numeric"
                                        title="Popular order"
                                      />

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditSubDialog(sub)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => {
                                          if (confirm("Delete this subcategory?")) {
                                            deleteSubcategory.mutate(sub.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Category Dialog */}
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
                form.color,
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
              <div className="mt-2 grid grid-cols-2 gap-2">

              <div className="grid grid-cols-8 gap-2 mt-2 max-h-32 overflow-y-auto p-1">
                {ICON_OPTIONS.filter((n) => n.toLowerCase().includes(iconSearch.toLowerCase())).map((iconName) => {
                  const IconComp = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                        form.icon === iconName
                          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                          : "border-border hover:border-primary/50",
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
                      form.color === colorOpt.value ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105",
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

      {/* Add/Edit Subcategory Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubcategory ? "Edit Subcategory" : "Add Subcategory"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name (English)</Label>
              <Input
                value={subForm.name}
                onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                placeholder="e.g., Electrician"
              />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input
                value={subForm.name_ar}
                onChange={(e) => setSubForm({ ...subForm, name_ar: e.target.value })}
                placeholder="e.g., كهربائي"
                dir="rtl"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <Label>Icon</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  value={subIconSearch}
                  onChange={(e) => setSubIconSearch(e.target.value)}
                  placeholder="Search icons..."
                />
                <Input
                  value={subForm.icon}
                  onChange={(e) => setSubForm({ ...subForm, icon: e.target.value })}
                  placeholder="Or type icon key (e.g., Wrench)"
                />
              </div>
              <div className="grid grid-cols-8 gap-2 mt-2 max-h-32 overflow-y-auto p-1">
                {ICON_OPTIONS.filter((n) => n.toLowerCase().includes(subIconSearch.toLowerCase())).map((iconName) => {
                  const IconComp = ICON_MAP[iconName];
                  return (
                    <button
                      key={iconName}
                      type="button"
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center border transition-all",
                        subForm.icon === iconName
                          ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={() => setSubForm({ ...subForm, icon: iconName })}
                      title={iconName}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={subForm.is_active}
                onCheckedChange={(checked) => setSubForm({ ...subForm, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(subForm.is_popular)}
                onCheckedChange={(checked) => setSubForm({ ...subForm, is_popular: checked })}
              />
              <Label>Popular (shows in Hub)</Label>
            </div>

            {Boolean(subForm.is_popular) && (
              <div>
                <Label>Popular Order</Label>
                <Input
                  value={subForm.popular_order}
                  onChange={(e) => setSubForm({ ...subForm, popular_order: e.target.value })}
                  placeholder="e.g., 1"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeSubDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubSubmit}>{editingSubcategory ? "Save Changes" : "Add Subcategory"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
