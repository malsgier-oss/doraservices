import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Eye, EyeOff, Edit, Trash2, StickyNote, Star } from "lucide-react";
import { format } from "date-fns";
import { useCategories } from "@/hooks/useCategories";
import { useAllSubcategories } from "@/hooks/useSubcategories";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  subcategory_id?: string | null;
  price: number | null;

  /**
   * Column name is `city` and it stores UUID (cities.id)
   */
  city: string | null;

  is_visible: boolean;
  is_active: boolean;
  admin_note: string | null;
  views_count: number;
  user_id: string | null;
  created_at: string;

  // Featured
  is_featured?: boolean;
  featured_order?: number | null;

  provider?: {
    full_name: string | null;
  } | null;
}

type ProviderProfile = {
  user_id: string;
  full_name: string | null;
  phone?: string | null;
};

type CityRow = {
  id: string;
  name?: string | null;
  name_ar?: string | null;
};

export default function AdminServices() {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { data: subcategories } = useAllSubcategories();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    subcategory_id: "" as string,
    city: "", // stores city UUID
    user_id: "" as string, // provider assignment
  });

  // Featured order local draft
  const [featuredOrderDraft, setFeaturedOrderDraft] = useState<Record<string, string>>({});

  // Provider search in edit dialog
  const [providerSearch, setProviderSearch] = useState("");
  const [providerResults, setProviderResults] = useState<ProviderProfile[]>([]);
  const [providerSearching, setProviderSearching] = useState(false);

  /**
   * Cities list for dropdown + mapping
   */
  const { data: cities } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name, name_ar")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as CityRow[];
    },
  });

  const cityMap = useMemo(() => {
    const m = new Map<string, CityRow>();
    (cities || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [cities]);

  const cityLabel = (c?: CityRow | null) => c?.name || c?.name_ar || "";

  const subcategoryMap = useMemo(() => {
    const m = new Map<string, { id: string; name: string; name_ar: string | null }>();
    (subcategories || []).forEach((s: any) => m.set(s.id, s));
    return m;
  }, [subcategories]);

  const subcategoryLabel = (id?: string | null) => {
    if (!id) return "";
    const s = subcategoryMap.get(id);
    if (!s) return id;
    return s.name_ar ? `${s.name} / ${s.name_ar}` : s.name;
  };

  const subcategoryOptions = useMemo(() => {
    const catById = new Map<string, any>();
    (categories || []).forEach((c: any) => catById.set(c.id, c));
    return (subcategories || [])
      .filter((s: any) => s.is_active !== false)
      .map((s: any) => {
        const c = catById.get(s.category_id);
        const label = c ? `${c.name} — ${s.name}` : s.name;
        const label2 = s.name_ar ? `${label} (${s.name_ar})` : label;
        return { id: s.id, label: label2 };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subcategories, categories]);

  const {
    data: services,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-services", categoryFilter, visibilityFilter, featuredFilter, search],
    queryFn: async () => {
      // ✅ IMPORTANT: no join here. Joins fail if FK is not defined in Supabase.
      let query = supabase.from("services").select("*");

      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (visibilityFilter !== "all") query = query.eq("is_visible", visibilityFilter === "visible");

      if (featuredFilter === "featured") query = query.eq("is_featured", true);
      else if (featuredFilter === "not_featured") query = query.or("is_featured.is.null,is_featured.eq.false");

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const ordered =
        featuredFilter === "featured"
          ? query
              .order("featured_order", { ascending: true, nullsFirst: false })
              .order("created_at", { ascending: false })
          : query.order("created_at", { ascending: false });

      const { data, error } = await ordered;
      if (error) throw error;

      // Batch fetch provider names for any services that have user_id
      const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id).filter(Boolean))) as string[];

      let profileMap = new Map<string, any>();

      if (userIds.length) {
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        if (pErr) throw pErr;
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const servicesWithProvider = (data || []).map((service: any) => {
        if (service.user_id) {
          return {
            ...service,
            provider: profileMap.get(service.user_id) || null,
          };
        }
        return { ...service, provider: null };
      });

      return servicesWithProvider as Service[];
    },
  });

  // ✅ FIX: useEffect (not useMemo) for setting state from services
  useEffect(() => {
    if (!services) return;
    const map: Record<string, string> = {};
    services.forEach((s) => {
      map[s.id] = s.featured_order === null || s.featured_order === undefined ? "" : String(s.featured_order);
    });
    setFeaturedOrderDraft(map);
  }, [services]);

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const { error } = await supabase.from("services").update({ is_visible: isVisible }).eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: isVisible ? "service_shown" : "service_hidden",
        p_target_type: "service",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Service visibility updated");
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const updateService = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Service> }) => {
      const { error } = await supabase.from("services").update(data.updates).eq("id", data.id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "service_updated",
        p_target_type: "service",
        p_target_id: data.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Service updated");
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update service"),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "service_deleted",
        p_target_type: "service",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Service deleted");
    },
    onError: () => toast.error("Failed to delete service"),
  });

  const saveAdminNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("services").update({ admin_note: note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Note saved");
      setNoteOpen(false);
    },
    onError: () => toast.error("Failed to save note"),
  });

  const updateFeatured = useMutation({
    mutationFn: async (payload: { id: string; is_featured?: boolean; featured_order?: number | null }) => {
      const { id, ...updates } = payload;
      const { error } = await supabase.from("services").update(updates).eq("id", id);
      if (error) throw error;

      const action =
        typeof updates.is_featured === "boolean"
          ? updates.is_featured
            ? "service_featured_on"
            : "service_featured_off"
          : "service_featured_order";

      await supabase.rpc("log_admin_action", {
        p_action: action,
        p_target_type: "service",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Featured updated");
    },
    onError: () => toast.error("Failed to update featured"),
  });

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setProviderSearch("");
    setProviderResults([]);

    setEditForm({
      title: service.title,
      description: service.description || "",
      category: service.category,
      subcategory_id: service.subcategory_id || "",
      city: service.city || "",
      user_id: service.user_id || "",
    });

    setEditOpen(true);
  };

  const openNoteDialog = (service: Service) => {
    setSelectedService(service);
    setAdminNote(service.admin_note || "");
    setNoteOpen(true);
  };

  const handleToggleFeatured = (service: Service) => {
    const next = !(service.is_featured === true);

    const draft = featuredOrderDraft[service.id];
    const parsed = draft?.trim() ? Number(draft) : null;

    updateFeatured.mutate({
      id: service.id,
      is_featured: next,
      featured_order: next ? (Number.isFinite(parsed as any) ? parsed : 999) : null,
    });
  };

  const handleSaveFeaturedOrder = (service: Service) => {
    const draft = (featuredOrderDraft[service.id] ?? "").trim();
    const nextOrder = draft === "" ? null : Number(draft);

    if (draft !== "" && !Number.isFinite(nextOrder)) {
      toast.error("Order must be a number");
      return;
    }

    updateFeatured.mutate({
      id: service.id,
      featured_order: nextOrder,
    });
  };

  const runProviderSearch = async () => {
    const q = providerSearch.trim();
    if (!q) {
      setProviderResults([]);
      return;
    }

    setProviderSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${q}%`)
        .limit(10);

      if (error) throw error;
      setProviderResults((data || []) as ProviderProfile[]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to search providers");
    } finally {
      setProviderSearching(false);
    }
  };

  const currentProviderLabel =
    services?.find((s) => s.id === selectedService?.id)?.provider?.full_name ||
    (editForm.user_id ? "Selected provider" : "");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Services</h1>
        <p className="text-muted-foreground">Manage all services on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>All Services</span>

            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>

              <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="featured">Featured Only</SelectItem>
                  <SelectItem value="not_featured">Not Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* ✅ Show real error instead of silent "empty" */}
          {isError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Failed to load services: {(error as any)?.message ?? "Unknown error"}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : services?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No services found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {services?.map((service) => {
                  const isFeatured = service.is_featured === true;

                  const mappedCity = service.city ? cityMap.get(service.city) : null;
                  const displayCity = mappedCity ? cityLabel(mappedCity) : service.city || "—";

                  return (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium max-w-48 truncate">
                        {service.title}
                        {service.admin_note && <StickyNote className="inline ml-2 h-3 w-3 text-yellow-500" />}
                      </TableCell>

                      <TableCell>{service.category}</TableCell>

                      <TableCell className="max-w-56 truncate">
                        {subcategoryLabel(service.subcategory_id) || (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      <TableCell className="max-w-40 truncate">{displayCity}</TableCell>

                      <TableCell>
                        {service.user_id ? (
                          service.provider?.full_name || "—"
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={isFeatured ? "text-yellow-600" : "text-muted-foreground"}
                          onClick={() => handleToggleFeatured(service)}
                          disabled={updateFeatured.isPending}
                        >
                          <Star className={isFeatured ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4"} />
                          <span className="ml-2">{isFeatured ? "Yes" : "No"}</span>
                        </Button>
                      </TableCell>

                      <TableCell className="w-32">
                        <Input
                          value={featuredOrderDraft[service.id] ?? ""}
                          onChange={(e) =>
                            setFeaturedOrderDraft((prev) => ({
                              ...prev,
                              [service.id]: e.target.value,
                            }))
                          }
                          onBlur={() => handleSaveFeaturedOrder(service)}
                          placeholder="e.g. 1"
                          className="h-9"
                          inputMode="numeric"
                        />
                      </TableCell>

                      <TableCell>{service.views_count}</TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          {service.is_visible ? (
                            <Badge className="bg-green-500">Visible</Badge>
                          ) : (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                          {!service.is_active && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                      </TableCell>

                      <TableCell>{format(new Date(service.created_at), "MMM d, yyyy")}</TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleVisibility.mutate({
                                id: service.id,
                                isVisible: !service.is_visible,
                              })
                            }
                          >
                            {service.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>

                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(service)}>
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button variant="ghost" size="icon" onClick={() => openNoteDialog(service)}>
                            <StickyNote className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this service?")) {
                                deleteService.mutate(service.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Assign Provider */}
            <div className="space-y-2">
              <Label>Assign Provider</Label>

              {editForm.user_id ? (
                <div className="text-sm text-muted-foreground">
                  Current:{" "}
                  <span className="text-foreground font-medium">{currentProviderLabel || editForm.user_id}</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No provider assigned</div>
              )}

              <div className="flex gap-2">
                <Input
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder="Search provider by name..."
                />
                <Button type="button" variant="outline" onClick={runProviderSearch} disabled={providerSearching}>
                  {providerSearching ? "Searching..." : "Search"}
                </Button>
              </div>

              {providerResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {providerResults.map((p) => (
                    <button
                      key={p.user_id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setEditForm((prev) => ({ ...prev, user_id: p.user_id }));
                        setProviderResults([]);
                        setProviderSearch(p.full_name || "");
                      }}
                    >
                      <div className="font-medium">{p.full_name || "Unnamed provider"}</div>
                      <div className="text-xs text-muted-foreground">{p.user_id}</div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Assigning a provider sets <code>services.user_id</code>.
              </p>
            </div>

            <div>
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subcategory (for Hub)</Label>
              <Select
                value={editForm.subcategory_id}
                onValueChange={(v) => setEditForm({ ...editForm, subcategory_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {subcategoryOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Used by Hub to open the correct service list (recommended for Featured providers and Recently viewed).
              </p>
            </div>

            {/* City Select (stores UUID) */}
            <div>
              <Label>City</Label>
              <Select value={editForm.city} onValueChange={(v) => setEditForm({ ...editForm, city: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {(cities || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {cityLabel(c) || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground mt-1">
                Stored value is the city ID (UUID); the UI shows the city name.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedService) return;

                if (!editForm.user_id) {
                  toast.error("Please assign a provider");
                  return;
                }

                if (!editForm.city) {
                  toast.error("Please select a city");
                  return;
                }

                updateService.mutate({
                  id: selectedService.id,
                  updates: {
                    title: editForm.title,
                    description: editForm.description,
                    category: editForm.category,
                    subcategory_id: editForm.subcategory_id || null,
                    city: editForm.city,
                    user_id: editForm.user_id,
                  },
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Note</DialogTitle>
          </DialogHeader>

          <div>
            <Label>Internal Note</Label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a private note about this service..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedService) {
                  saveAdminNote.mutate({ id: selectedService.id, note: adminNote });
                }
              }}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
