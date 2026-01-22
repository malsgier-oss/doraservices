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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { City, useAllCities } from "@/hooks/useCities";

export default function AdminCities() {
  const queryClient = useQueryClient();
  const { data: cities, isLoading } = useAllCities();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    region: "",
    is_active: true,
  });

  const createCity = useMutation({
    mutationFn: async (data: typeof form & { display_order: number }) => {
      const { error } = await supabase.from("cities").insert(data);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "city_created",
        p_target_type: "city",
        p_details: { name: data.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success("City created");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to create city");
    },
  });

  const updateCity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<City> & { id: string }) => {
      const { error } = await supabase.from("cities").update(data).eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "city_updated",
        p_target_type: "city",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success("City updated");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to update city");
    },
  });

  const deleteCity = useMutation({
    mutationFn: async (id: string) => {
      // Check if any services or profiles use this city
      const cityName = cities?.find((c) => c.id === id)?.name;
      const [{ count: servicesCount }, { count: profilesCount }] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("city", cityName || ""),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("city", cityName || ""),
      ]);

      if ((servicesCount || 0) > 0 || (profilesCount || 0) > 0) {
        throw new Error(`Cannot delete: city is used by ${servicesCount || 0} services and ${profilesCount || 0} profiles`);
      }

      const { error } = await supabase.from("cities").delete().eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "city_deleted",
        p_target_type: "city",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success("City deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete city");
    },
  });

  const reorderCity = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const sorted = [...(cities || [])].sort((a, b) => a.display_order - b.display_order);
      const currentIndex = sorted.findIndex((c) => c.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sorted.length) return;

      const current = sorted[currentIndex];
      const target = sorted[targetIndex];

      await Promise.all([
        supabase.from("cities").update({ display_order: target.display_order }).eq("id", current.id),
        supabase.from("cities").update({ display_order: current.display_order }).eq("id", target.id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: () => {
      toast.error("Failed to reorder");
    },
  });

  const openCreateDialog = () => {
    setEditingCity(null);
    setForm({ name: "", name_ar: "", region: "", is_active: true });
    setDialogOpen(true);
  };

  const openEditDialog = (city: City) => {
    setEditingCity(city);
    setForm({
      name: city.name,
      name_ar: city.name_ar || "",
      region: city.region || "",
      is_active: city.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCity(null);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (editingCity) {
      updateCity.mutate({ id: editingCity.id, ...form });
    } else {
      const maxOrder = Math.max(...(cities?.map((c) => c.display_order) || [0]));
      createCity.mutate({ ...form, display_order: maxOrder + 1 });
    }
  };

  // Group cities by region
  const groupedCities = cities?.reduce((acc, city) => {
    const region = city.region || "Other";
    if (!acc[region]) acc[region] = [];
    acc[region].push(city);
    return acc;
  }, {} as Record<string, City[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Cities</h1>
          <p className="text-muted-foreground">Manage available cities and locations</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add City
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Cities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cities?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No cities found</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {[...(cities || [])]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((city, index, arr) => (
                    <div key={city.id} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {index + 1}. {city.name}
                          </div>
                          {city.name_ar ? (
                            <div className="text-sm text-muted-foreground truncate" dir="rtl">
                              {city.name_ar}
                            </div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap gap-2">
                            {city.region ? <Badge variant="outline">{city.region}</Badge> : <Badge variant="secondary">No region</Badge>}
                            {city.is_active ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => reorderCity.mutate({ id: city.id, direction: "up" })}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Move up
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => reorderCity.mutate({ id: city.id, direction: "down" })}
                          disabled={index === arr.length - 1}
                        >
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Move down
                        </Button>
                        <Button variant="secondary" className="h-11" onClick={() => openEditDialog(city)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          className="h-11"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this city?")) {
                              deleteCity.mutate(city.id);
                            }
                          }}
                          disabled={deleteCity.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Arabic Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(cities || [])]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((city, index) => (
                        <TableRow key={city.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{city.name}</TableCell>
                          <TableCell dir="rtl">{city.name_ar || "-"}</TableCell>
                          <TableCell>
                            {city.region ? (
                              <Badge variant="outline">{city.region}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {city.is_active ? (
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
                                onClick={() => reorderCity.mutate({ id: city.id, direction: "up" })}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => reorderCity.mutate({ id: city.id, direction: "down" })}
                                disabled={index === (cities?.length || 0) - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(city)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this city?")) {
                                    deleteCity.mutate(city.id);
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Region Summary */}
      {groupedCities && Object.keys(groupedCities).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Region</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(groupedCities).map(([region, regionCities]) => (
                <div key={region} className="bg-muted rounded-lg p-4 min-w-32">
                  <p className="font-medium">{region}</p>
                  <p className="text-2xl font-bold">{regionCities.length}</p>
                  <p className="text-sm text-muted-foreground">cities</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCity ? "Edit City" : "Add City"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name (English)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Tripoli"
              />
            </div>
            <div>
              <Label>Name (Arabic)</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                placeholder="e.g., طرابلس"
                dir="rtl"
              />
            </div>
            <div>
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g., Tripolitania"
              />
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
              {editingCity ? "Save Changes" : "Create City"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
