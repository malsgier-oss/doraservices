import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type City = { id: string; name: string; name_ar: string | null };
type Category = { id: string; name: string; name_ar: string | null; is_active: boolean; display_order: number };
type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean | null;
  display_order: number | null;
  is_featured?: boolean | null;
  featured_order?: number | null;
};

type HubBanner = {
  id: string;
  title_ar: string | null;
  subtitle_ar: string | null;
  cta_text_ar: string | null;
  image_path: string;
  target_type: "none" | "category" | "subcategory" | "shelf";
  target_category_id: string | null;
  target_subcategory_id: string | null;
  target_shelf_id: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
};

type HubChip = {
  id: string;
  label_ar: string | null;
  label_en: string | null;
  target_type: "category" | "subcategory" | "shelf";
  target_category_id: string | null;
  target_subcategory_id: string | null;
  target_shelf_id: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
};

type HubTopCategory = {
  id: string;
  scope: "global" | "city";
  city_id: string | null;
  category_id: string;
  display_order: number;
  is_active: boolean;
};

type HubShelf = {
  id: string;
  title_ar: string;
  shelf_type: "category" | "manual";
  category_id: string | null;
  city_id: string | null;
  display_order: number;
  is_active: boolean;
  max_items: number;
};

type HubShelfItem = {
  id: string;
  shelf_id: string;
  subcategory_id: string | null;
  category_id: string | null; // backward compatibility
  display_order: number;
};

function normalizeFileExt(name: string) {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "png";
  return ext.replace(/[^a-z0-9]/g, "") || "png";
}

export default function AdminHub() {
  const { toast } = useToast();

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [banners, setBanners] = useState<HubBanner[]>([]);
  const [chips, setChips] = useState<HubChip[]>([]);
  const [topCategories, setTopCategories] = useState<HubTopCategory[]>([]);
  const [shelves, setShelves] = useState<HubShelf[]>([]);

  const [loading, setLoading] = useState(true);

  // Banner form state
  const [bannerForm, setBannerForm] = useState<Partial<HubBanner>>({
    title_ar: null,
    subtitle_ar: null,
    cta_text_ar: null,
    target_type: "none",
    target_category_id: null,
    target_subcategory_id: null,
    target_shelf_id: null,
    city_id: null,
    display_order: 0,
    is_active: true,
    start_at: null,
    end_at: null,
  });
  const [bannerImage, setBannerImage] = useState<File | null>(null);

  // Chips form state
  const [chipForm, setChipForm] = useState<Partial<HubChip>>({
    label_ar: "",
    label_en: "",
    target_type: "subcategory",
    target_category_id: null,
    target_subcategory_id: null,
    target_shelf_id: null,
    city_id: null,
    display_order: 0,
    is_active: true,
  });

  // Top-8 selector state
  const [topScope, setTopScope] = useState<"global" | "city">("global");
  const [topCityId, setTopCityId] = useState<string | null>(null);

  // Shelf form state
  const [shelfForm, setShelfForm] = useState<Partial<HubShelf>>({
    title_ar: "",
    shelf_type: "category",
    category_id: null,
    city_id: null,
    display_order: 0,
    is_active: true,
    max_items: 10,
  });

  // Manual items dialog
  const [itemsOpenForShelf, setItemsOpenForShelf] = useState<string | null>(null);
  const [items, setItems] = useState<HubShelfItem[]>([]);
  const [subcatSearch, setSubcatSearch] = useState<string>("");
  const [subcatFilterCategoryId, setSubcatFilterCategoryId] = useState<string>("all");

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshAll() {
    setLoading(true);
    await Promise.all([loadCities(), loadCategories(), loadSubcategories(), loadBanners(), loadChips(), loadTopCategories(), loadShelves()]);
    setLoading(false);
  }

  async function loadCities() {
    const { data, error } = await supabase
      .from("cities")
      .select("id,name,name_ar")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setCities(((data as any[]) || []) as City[]);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,name_ar,is_active,display_order")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setCategories((((data as any[]) || []) as Category[]).filter(c => c.is_active));
  }

  async function loadSubcategories() {
    const { data, error } = await supabase
      .from("subcategories")
      .select("id,category_id,name,name_ar,is_active,display_order,is_featured,featured_order")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setSubcategories((((data as any[]) || []) as Subcategory[]).filter((s) => s.is_active !== false));
  }

  async function loadBanners() {
    const { data, error } = await supabase
      .from("hub_banners")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setBanners(((data as any[]) || []) as HubBanner[]);
  }

  async function loadChips() {
    const { data, error } = await supabase
      .from("hub_chips")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setChips(((data as any[]) || []) as HubChip[]);
  }

  async function loadTopCategories() {
    const { data, error } = await supabase
      .from("hub_top_categories")
      .select("id,scope,city_id,category_id,display_order,is_active")
      .order("scope", { ascending: true })
      .order("city_id", { ascending: true, nullsFirst: true })
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setTopCategories(((data as any[]) || []) as HubTopCategory[]);
  }

  async function loadShelves() {
    const { data, error } = await supabase
      .from("hub_shelves")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) console.error(error);
    setShelves(((data as any[]) || []) as HubShelf[]);
  }

  const categoriesById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const citiesById = useMemo(() => {
    const map: Record<string, City> = {};
    for (const c of cities) map[c.id] = c;
    return map;
  }, [cities]);

  async function uploadBannerImage(file: File): Promise<string> {
    const ext = normalizeFileExt(file.name);
    const path = `banners/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("hub-banners").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function createBanner() {
    try {
      if (!bannerImage) throw new Error("Banner image is required.");

      if (bannerForm.target_type === "category" && !bannerForm.target_category_id) {
        throw new Error("Select a target category.");
      }
      if (bannerForm.target_type === "subcategory" && !bannerForm.target_subcategory_id) {
        throw new Error("Select a target subcategory.");
      }
      if (bannerForm.target_type === "shelf" && !bannerForm.target_shelf_id) {
        throw new Error("Select a target shelf.");
      }

      const image_path = await uploadBannerImage(bannerImage);

      const { error } = await supabase.from("hub_banners").insert({
        title_ar: bannerForm.title_ar || null,
        subtitle_ar: bannerForm.subtitle_ar || null,
        cta_text_ar: bannerForm.cta_text_ar || null,
        image_path,
        target_type: bannerForm.target_type || "none",
        target_category_id: bannerForm.target_type === "category" ? bannerForm.target_category_id : null,
        target_subcategory_id: bannerForm.target_type === "subcategory" ? bannerForm.target_subcategory_id : null,
        target_shelf_id: bannerForm.target_type === "shelf" ? bannerForm.target_shelf_id : null,
        city_id: bannerForm.city_id || null,
        display_order: Number(bannerForm.display_order || 0),
        is_active: !!bannerForm.is_active,
        start_at: bannerForm.start_at || null,
        end_at: bannerForm.end_at || null,
      });

      if (error) throw error;

      toast({ title: "Banner created" });
      setBannerForm({
        title_ar: null,
        subtitle_ar: null,
        cta_text_ar: null,
        target_type: "none",
        target_category_id: null,
        target_subcategory_id: null,
        target_shelf_id: null,
        city_id: null,
        display_order: 0,
        is_active: true,
        start_at: null,
        end_at: null,
      });
      setBannerImage(null);
      await loadBanners();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    }
  }

  async function toggleBannerActive(id: string, is_active: boolean) {
    const { error } = await supabase.from("hub_banners").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    await loadBanners();
  }

  async function deleteBanner(id: string) {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("hub_banners").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await loadBanners();
  }

  // --- Chips ---
  async function createChip() {
    try {
      const labelAr = (chipForm.label_ar || "").trim();
      const labelEn = (chipForm.label_en || "").trim();
      if (!labelAr && !labelEn) throw new Error("Chip label (AR or EN) is required.");
      if (!chipForm.target_type) throw new Error("Chip target type is required.");

      if (chipForm.target_type === "category" && !chipForm.target_category_id) throw new Error("Select a target category.");
      if (chipForm.target_type === "subcategory" && !chipForm.target_subcategory_id) throw new Error("Select a target subcategory.");
      if (chipForm.target_type === "shelf" && !chipForm.target_shelf_id) throw new Error("Select a target shelf.");

      const { error } = await supabase.from("hub_chips").insert({
        label_ar: labelAr || null,
        label_en: labelEn || null,
        target_type: chipForm.target_type,
        target_category_id: chipForm.target_type === "category" ? chipForm.target_category_id : null,
        target_subcategory_id: chipForm.target_type === "subcategory" ? chipForm.target_subcategory_id : null,
        target_shelf_id: chipForm.target_type === "shelf" ? chipForm.target_shelf_id : null,
        city_id: chipForm.city_id || null,
        display_order: Number(chipForm.display_order || 0),
        is_active: !!chipForm.is_active,
      });
      if (error) throw error;
      toast({ title: "Chip created" });
      setChipForm({
        label_ar: "",
        label_en: "",
        target_type: "subcategory",
        target_category_id: null,
        target_subcategory_id: null,
        target_shelf_id: null,
        city_id: null,
        display_order: 0,
        is_active: true,
      });
      await loadChips();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    }
  }

  async function toggleChipActive(id: string, is_active: boolean) {
    const { error } = await supabase.from("hub_chips").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    await loadChips();
  }

  async function deleteChip(id: string) {
    if (!confirm("Delete this chip?")) return;
    const { error } = await supabase.from("hub_chips").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await loadChips();
  }

  // --- Top 8 categories (global + per-city override) ---
  const scopedTop = useMemo(() => {
    return topCategories
      .filter((r) => r.is_active !== false)
      .filter((r) => (topScope === "global" ? r.scope === "global" : r.scope === "city" && r.city_id === topCityId))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [topCategories, topScope, topCityId]);

  async function addTopCategory(category_id: string) {
    try {
      if (!category_id) throw new Error("Select a category.");
      if (topScope === "city" && !topCityId) throw new Error("Select a city.");
      if (scopedTop.length >= 8) throw new Error("Top list already has 8 categories.");
      if (scopedTop.some((r) => r.category_id === category_id)) throw new Error("Category already added.");

      const { error } = await supabase.from("hub_top_categories").insert({
        scope: topScope,
        city_id: topScope === "city" ? topCityId : null,
        category_id,
        display_order: scopedTop.length,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Added" });
      await loadTopCategories();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    }
  }

  async function removeTopCategory(id: string) {
    if (!confirm("Remove this category from top list?")) return;
    const { error } = await supabase.from("hub_top_categories").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await loadTopCategories();
  }

  async function moveTopCategory(id: string, direction: "up" | "down") {
    const list = scopedTop;
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;
    const a = list[idx];
    const b = list[swapWith];
    const { error } = await supabase
      .from("hub_top_categories")
      .upsert([
        { id: a.id, display_order: b.display_order },
        { id: b.id, display_order: a.display_order },
      ], { onConflict: "id" });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await loadTopCategories();
  }

  // --- Featured services ---
  async function setFeatured(subcategory_id: string, is_featured: boolean) {
    const { error } = await supabase
      .from("subcategories")
      .update({ is_featured, featured_order: is_featured ? 0 : null })
      .eq("id", subcategory_id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await loadSubcategories();
  }

  async function setFeaturedOrder(subcategory_id: string, featured_order: number | null) {
    const { error } = await supabase
      .from("subcategories")
      .update({ featured_order })
      .eq("id", subcategory_id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await loadSubcategories();
  }

  async function createShelf() {
    try {
      if (!shelfForm.title_ar?.trim()) throw new Error("Shelf title (Arabic) is required.");
      if (!shelfForm.shelf_type) throw new Error("Shelf type is required.");

      if (shelfForm.shelf_type === "category" && !shelfForm.category_id) {
        throw new Error("Select a category for category shelf.");
      }

      const { error } = await supabase.from("hub_shelves").insert({
        title_ar: shelfForm.title_ar,
        shelf_type: shelfForm.shelf_type,
        category_id: shelfForm.shelf_type === "category" ? shelfForm.category_id : null,
        city_id: shelfForm.city_id || null,
        display_order: Number(shelfForm.display_order || 0),
        is_active: !!shelfForm.is_active,
        max_items: Number(shelfForm.max_items || 10),
      });

      if (error) throw error;

      toast({ title: "Shelf created" });
      setShelfForm({
        title_ar: "",
        shelf_type: "category",
        category_id: null,
        city_id: null,
        display_order: 0,
        is_active: true,
        max_items: 10,
      });
      await loadShelves();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message || String(e), variant: "destructive" });
    }
  }

  async function toggleShelfActive(id: string, is_active: boolean) {
    const { error } = await supabase.from("hub_shelves").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    await loadShelves();
  }

  async function deleteShelf(id: string) {
    if (!confirm("Delete this shelf?")) return;
    const { error } = await supabase.from("hub_shelves").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await loadShelves();
  }

  async function openItemsDialog(shelfId: string) {
    setItemsOpenForShelf(shelfId);
    setSubcatSearch("");
    setSubcatFilterCategoryId("all");
    const { data, error } = await supabase
      .from("hub_shelf_items")
      .select("*")
      .eq("shelf_id", shelfId)
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      setItems([]);
      return;
    }
    setItems(((data as any[]) || []) as HubShelfItem[]);
  }

  async function addManualItem(subcategoryId: string) {
    if (!itemsOpenForShelf) return;
    if (!subcategoryId) return;

    // prevent duplicates in UI (DB also has unique index after migration)
    if (items.some((i) => i.subcategory_id === subcategoryId)) {
      toast({ title: "Already added" });
      return;
    }

    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 0;

    const { error } = await supabase.from("hub_shelf_items").insert({
      shelf_id: itemsOpenForShelf,
      subcategory_id: subcategoryId,
      display_order: nextOrder,
    } as any);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await openItemsDialog(itemsOpenForShelf);
  }

  async function moveManualItem(itemId: string, direction: "up" | "down") {
    if (!itemsOpenForShelf) return;
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];

    // swap display_order in DB
    const { error } = await supabase
      .from("hub_shelf_items")
      .update({ display_order: b.display_order })
      .eq("id", a.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    const { error: error2 } = await supabase
      .from("hub_shelf_items")
      .update({ display_order: a.display_order })
      .eq("id", b.id);
    if (error2) {
      toast({ title: "Failed", description: error2.message, variant: "destructive" });
      return;
    }

    await openItemsDialog(itemsOpenForShelf);
  }

  async function removeManualItem(itemId: string) {
    const { error } = await supabase.from("hub_shelf_items").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    if (itemsOpenForShelf) await openItemsDialog(itemsOpenForShelf);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hub</h1>
        <p className="text-sm text-muted-foreground">Manage home screen banners and shelves (city-targeted).</p>
      </div>

      {loading ? (
        <div className="p-6 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-10">
          <div>
            <h2 className="text-lg font-semibold">Banners</h2>
            <p className="text-sm text-muted-foreground">Shown on the Hub, can be city-targeted. Image source: Supabase Storage.</p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Banner</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="عنوان (عربي)"
                  value={bannerForm.title_ar || ""}
                  onChange={(e) => setBannerForm((p) => ({ ...p, title_ar: e.target.value }))}
                />
                <Input
                  placeholder="عنوان فرعي (عربي) اختياري"
                  value={bannerForm.subtitle_ar || ""}
                  onChange={(e) => setBannerForm((p) => ({ ...p, subtitle_ar: e.target.value }))}
                />
                <Input
                  placeholder="CTA (اختياري)"
                  value={bannerForm.cta_text_ar || ""}
                  onChange={(e) => setBannerForm((p) => ({ ...p, cta_text_ar: e.target.value }))}
                />

                <Select
                  value={bannerForm.target_type || "none"}
                  onValueChange={(v: any) =>
                    setBannerForm((p) => ({
                      ...p,
                      target_type: v,
                      target_category_id: v === "category" ? p.target_category_id : null,
                      target_subcategory_id: v === "subcategory" ? p.target_subcategory_id : null,
                      target_shelf_id: v === "shelf" ? p.target_shelf_id : null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (image only)</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="subcategory">Subcategory</SelectItem>
                    <SelectItem value="shelf">Shelf (scroll)</SelectItem>
                  </SelectContent>
                </Select>

                {bannerForm.target_type === "category" ? (
                  <Select
                    value={bannerForm.target_category_id || ""}
                    onValueChange={(v) => setBannerForm((p) => ({ ...p, target_category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Target category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name_ar || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                ) : bannerForm.target_type === "subcategory" ? (
                  <Select
                    value={bannerForm.target_subcategory_id || ""}
                    onValueChange={(v) => setBannerForm((p) => ({ ...p, target_subcategory_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Target subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name_ar || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : bannerForm.target_type === "shelf" ? (
                  <Select
                    value={bannerForm.target_shelf_id || ""}
                    onValueChange={(v) => setBannerForm((p) => ({ ...p, target_shelf_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Target shelf" />
                    </SelectTrigger>
                    <SelectContent>
                      {shelves.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title_ar}
                        </SelectItem>
                      ))}
                      <SelectItem value="featured-services">Featured services</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground">No target (banner is decorative).</div>
                )}

                <Select
                  value={bannerForm.city_id || "__all__"}
                  onValueChange={(v) => setBannerForm((p) => ({ ...p, city_id: v === "__all__" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="City targeting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_ar || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Display order"
                  value={bannerForm.display_order ?? 0}
                  onChange={(e) => setBannerForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!bannerForm.is_active}
                    onCheckedChange={(v) => setBannerForm((p) => ({ ...p, is_active: v }))}
                  />
                  <span className="text-sm">Active</span>
                </div>

                <div className="md:col-span-2 grid gap-2">
                  <div className="text-sm text-muted-foreground">Banner image (Supabase Storage: hub-banners)</div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerImage(e.target.files?.[0] || null)}
                  />
                  <div>
                    <Button onClick={createBanner}>Create Banner</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Banners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {banners.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No banners yet.</div>
                ) : (
                  banners.map((b) => (
                    <div key={b.id} className="flex flex-col md:flex-row md:items-center gap-2 justify-between border rounded-md p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{b.title_ar || "(Image banner)"}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.target_type === "none" ? "Target: None" :
                           b.target_type === "category" ? `Category: ${b.target_category_id ? (categoriesById[b.target_category_id]?.name_ar || categoriesById[b.target_category_id]?.name) : "—"}` :
                           b.target_type === "subcategory" ? `Subcategory: ${b.target_subcategory_id ? (subcategories.find(s=>s.id===b.target_subcategory_id)?.name_ar || subcategories.find(s=>s.id===b.target_subcategory_id)?.name) : "—"}` :
                           `Shelf: ${b.target_shelf_id || "—"}`}
                          {" • "}
                          City: {b.city_id ? (citiesById[b.city_id]?.name_ar || citiesById[b.city_id]?.name) : "All"}
                          {" • "}
                          Order: {b.display_order}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={b.is_active} onCheckedChange={(v) => toggleBannerActive(b.id, v)} />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => deleteBanner(b.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold">Top 8 categories</h2>
            <p className="text-sm text-muted-foreground">These control the 8 tiles grid on the Hub. You can set a global list, or override per city.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configure Top 8</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Select value={topScope} onValueChange={(v: any) => { setTopScope(v); if (v === "global") setTopCityId(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="city">City override</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={topCityId || "__none__"}
                  onValueChange={(v) => setTopCityId(v === "__none__" ? null : v)}
                  disabled={topScope !== "city"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select city</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_ar || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value="" onValueChange={(v) => addTopCategory(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_ar || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {scopedTop.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No categories selected yet.</div>
                ) : (
                  scopedTop.map((r, idx) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                      <div className="text-sm">#{idx + 1} — {categoriesById[r.category_id]?.name_ar || categoriesById[r.category_id]?.name}</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => moveTopCategory(r.id, "up")}>Up</Button>
                        <Button size="sm" variant="outline" onClick={() => moveTopCategory(r.id, "down")}>Down</Button>
                        <Button size="sm" variant="destructive" onClick={() => removeTopCategory(r.id)}>Remove</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold">Search chips</h2>
            <p className="text-sm text-muted-foreground">Scrollable chips under the search bar (city-targeted). Each chip can lead to a category, subcategory, or scroll to a shelf.</p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Chip</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Label AR" value={chipForm.label_ar || ""} onChange={(e) => setChipForm((p) => ({ ...p, label_ar: e.target.value }))} />
                <Input placeholder="Label EN" value={chipForm.label_en || ""} onChange={(e) => setChipForm((p) => ({ ...p, label_en: e.target.value }))} />

                <Select
                  value={chipForm.target_type || "subcategory"}
                  onValueChange={(v: any) =>
                    setChipForm((p) => ({
                      ...p,
                      target_type: v,
                      target_category_id: v === "category" ? p.target_category_id : null,
                      target_subcategory_id: v === "subcategory" ? p.target_subcategory_id : null,
                      target_shelf_id: v === "shelf" ? p.target_shelf_id : null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="subcategory">Subcategory</SelectItem>
                    <SelectItem value="shelf">Shelf (scroll)</SelectItem>
                  </SelectContent>
                </Select>

                {chipForm.target_type === "category" ? (
                  <Select value={chipForm.target_category_id || ""} onValueChange={(v) => setChipForm((p) => ({ ...p, target_category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Target category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : chipForm.target_type === "subcategory" ? (
                  <Select value={chipForm.target_subcategory_id || ""} onValueChange={(v) => setChipForm((p) => ({ ...p, target_subcategory_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Target subcategory" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name_ar || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={chipForm.target_shelf_id || ""} onValueChange={(v) => setChipForm((p) => ({ ...p, target_shelf_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Target shelf" /></SelectTrigger>
                    <SelectContent>
                      {shelves.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title_ar}</SelectItem>
                      ))}
                      <SelectItem value="featured-services">Featured services</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Select value={chipForm.city_id || "__all__"} onValueChange={(v) => setChipForm((p) => ({ ...p, city_id: v === "__all__" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name_ar || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input type="number" placeholder="Display order" value={chipForm.display_order ?? 0} onChange={(e) => setChipForm((p) => ({ ...p, display_order: Number(e.target.value) }))} />

                <div className="flex items-center gap-2">
                  <Switch checked={!!chipForm.is_active} onCheckedChange={(v) => setChipForm((p) => ({ ...p, is_active: v }))} />
                  <span className="text-sm">Active</span>
                </div>

                <div className="md:col-span-2">
                  <Button onClick={createChip}>Create Chip</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Chips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {chips.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No chips yet.</div>
                ) : (
                  chips.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.label_ar || c.label_en}</div>
                        <div className="text-xs text-muted-foreground">Target: {c.target_type} • City: {c.city_id ? (citiesById[c.city_id]?.name_ar || citiesById[c.city_id]?.name) : "All"} • Order: {c.display_order}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleChipActive(c.id, v)} />
                        <Button size="sm" variant="destructive" onClick={() => deleteChip(c.id)}>Delete</Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h2 className="text-lg font-semibold">Featured services</h2>
            <p className="text-sm text-muted-foreground">Mark subcategories as featured to show them in the "Featured services" shelf.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Manage Featured Subcategories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subcategories
                .slice()
                .sort((a, b) => {
                  const ao = a.featured_order ?? 9999;
                  const bo = b.featured_order ?? 9999;
                  return ao - bo;
                })
                .map((s) => (
                  <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border rounded-md p-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.name_ar || s.name}</div>
                      <div className="text-xs text-muted-foreground">Order: {s.featured_order ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={!!s.is_featured} onCheckedChange={(v) => setFeatured(s.id, v)} />
                      <Input
                        className="w-28"
                        type="number"
                        placeholder="Order"
                        value={s.featured_order ?? ""}
                        onChange={(e) => setFeaturedOrder(s.id, e.target.value === "" ? null : Number(e.target.value))}
                        disabled={!s.is_featured}
                      />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold">Shelves</h2>
            <p className="text-sm text-muted-foreground">Control Hub layout sections (city-targeted). Manual shelves curate services (subcategories).</p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Shelf</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="عنوان (عربي)"
                  value={shelfForm.title_ar || ""}
                  onChange={(e) => setShelfForm((p) => ({ ...p, title_ar: e.target.value }))}
                />

                <Select
                  value={shelfForm.shelf_type || "category"}
                  onValueChange={(v: any) =>
                    setShelfForm((p) => ({
                      ...p,
                      shelf_type: v,
                      category_id: v === "category" ? p.category_id : null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Shelf type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category shelf</SelectItem>
                    <SelectItem value="manual">Manual shelf</SelectItem>
                  </SelectContent>
                </Select>

                {shelfForm.shelf_type === "category" ? (
                  <Select
                    value={shelfForm.category_id || ""}
                    onValueChange={(v) => setShelfForm((p) => ({ ...p, category_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name_ar || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center">
                    Manual shelf items are selected after creating the shelf.
                  </div>
                )}

                <Select
                  value={shelfForm.city_id || "__all__"}
                  onValueChange={(v) => setShelfForm((p) => ({ ...p, city_id: v === "__all__" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="City targeting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_ar || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Display order"
                  value={shelfForm.display_order ?? 0}
                  onChange={(e) => setShelfForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                />

                <Input
                  type="number"
                  placeholder="Max items"
                  value={shelfForm.max_items ?? 10}
                  onChange={(e) => setShelfForm((p) => ({ ...p, max_items: Number(e.target.value) }))}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!shelfForm.is_active}
                    onCheckedChange={(v) => setShelfForm((p) => ({ ...p, is_active: v }))}
                  />
                  <span className="text-sm">Active</span>
                </div>

                <div className="md:col-span-2">
                  <Button onClick={createShelf}>Create Shelf</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Shelves</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shelves.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No shelves yet.</div>
                ) : (
                  shelves.map((s) => (
                    <div key={s.id} className="flex flex-col md:flex-row md:items-center gap-2 justify-between border rounded-md p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.title_ar}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {s.shelf_type}
                          {s.shelf_type === "category" ? ` • Category: ${s.category_id ? (categoriesById[s.category_id]?.name_ar || categoriesById[s.category_id]?.name) : "—"}` : ""}
                          {" • "}
                          City: {s.city_id ? (citiesById[s.city_id]?.name_ar || citiesById[s.city_id]?.name) : "All"}
                          {" • "}
                          Order: {s.display_order}
                          {" • "}
                          Max: {s.max_items}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {s.shelf_type === "manual" && (
                          <Dialog open={itemsOpenForShelf === s.id} onOpenChange={(open) => setItemsOpenForShelf(open ? s.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => openItemsDialog(s.id)}>
                                Manage items
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Manual shelf items</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-3">
                                <div className="grid gap-2 md:grid-cols-3">
                                  <Select value={subcatFilterCategoryId} onValueChange={setSubcatFilterCategoryId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Filter category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All categories</SelectItem>
                                      {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name_ar || c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="md:col-span-2">
                                    <Input
                                      placeholder="Search services (subcategories)..."
                                      value={subcatSearch}
                                      onChange={(e) => setSubcatSearch(e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="border rounded-md p-2 max-h-56 overflow-auto">
                                  {(subcategories || [])
                                    .filter((sc) => sc.is_active !== false)
                                    .filter((sc) => (subcatFilterCategoryId === "all" ? true : sc.category_id === subcatFilterCategoryId))
                                    .filter((sc) => {
                                      const q = subcatSearch.trim().toLowerCase();
                                      if (!q) return true;
                                      return `${sc.name_ar || ""} ${sc.name}`.toLowerCase().includes(q);
                                    })
                                    .slice(0, 40)
                                    .map((sc) => {
                                      const cat = categoriesById[sc.category_id];
                                      const already = items.some((i) => i.subcategory_id === sc.id);
                                      return (
                                        <div key={sc.id} className="flex items-center justify-between gap-2 py-1">
                                          <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{sc.name_ar || sc.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{cat ? (cat.name_ar || cat.name) : ""}</div>
                                          </div>
                                          <Button size="sm" variant={already ? "secondary" : "default"} disabled={already} onClick={() => addManualItem(sc.id)}>
                                            {already ? "Added" : "Add"}
                                          </Button>
                                        </div>
                                      );
                                    })}

                                  {subcategories.length === 0 ? (
                                    <div className="text-sm text-muted-foreground p-2">No subcategories yet.</div>
                                  ) : null}
                                </div>

                                {items.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">No items yet.</div>
                                ) : (
                                  <div className="space-y-2">
                                    {items.map((it, idx) => {
                                      const label = it.subcategory_id
                                        ? (subcategories.find((sc) => sc.id === it.subcategory_id)?.name_ar || subcategories.find((sc) => sc.id === it.subcategory_id)?.name || it.subcategory_id)
                                        : (categoriesById[it.category_id || ""]?.name_ar || categoriesById[it.category_id || ""]?.name || it.category_id || "—");

                                      return (
                                        <div key={it.id} className="flex items-center justify-between border rounded-md p-2 gap-2">
                                          <div className="text-sm min-w-0 truncate">{label}</div>

                                          <div className="flex items-center gap-1">
                                            <Button size="sm" variant="secondary" disabled={idx === 0} onClick={() => moveManualItem(it.id, "up")}>↑</Button>
                                            <Button size="sm" variant="secondary" disabled={idx === items.length - 1} onClick={() => moveManualItem(it.id, "down")}>↓</Button>
                                            <Button variant="destructive" size="sm" onClick={() => removeManualItem(it.id)}>
                                              Remove
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        <div className="flex items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => toggleShelfActive(s.id, v)} />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => deleteShelf(s.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
