import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Search } from "lucide-react";
import { useCities } from "@/hooks/useCities";
import { useAllSubCities, SubCity } from "@/hooks/useSubCities";

export default function AdminSubCities() {
  const queryClient = useQueryClient();
  const { data: cities } = useCities();
  const { data: subCities, isLoading } = useAllSubCities();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubCity, setEditingSubCity] = useState<SubCity | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    city_id: "",
    display_order: 0,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      city_id: "",
      display_order: 0,
      is_active: true,
    });
    setEditingSubCity(null);
  };

  const handleOpenDialog = (subCity?: SubCity) => {
    if (subCity) {
      setEditingSubCity(subCity);
      setFormData({
        name: subCity.name,
        name_ar: subCity.name_ar || "",
        city_id: subCity.city_id,
        display_order: subCity.display_order || 0,
        is_active: subCity.is_active ?? true,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.city_id) {
      toast.error("Name and city are required");
      return;
    }

    try {
      if (editingSubCity) {
        const { error } = await supabase
          .from("sub_cities")
          .update({
            name: formData.name,
            name_ar: formData.name_ar || null,
            city_id: formData.city_id,
            display_order: formData.display_order,
            is_active: formData.is_active,
          })
          .eq("id", editingSubCity.id);

        if (error) throw error;
        toast.success("Sub-city updated");
      } else {
        const { error } = await supabase
          .from("sub_cities")
          .insert({
            name: formData.name,
            name_ar: formData.name_ar || null,
            city_id: formData.city_id,
            display_order: formData.display_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Sub-city created");
      }

      queryClient.invalidateQueries({ queryKey: ["sub_cities"] });
      handleCloseDialog();
    } catch (error) {
      toast.error("Failed to save sub-city");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sub-city?")) return;

    try {
      const { error } = await supabase
        .from("sub_cities")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Sub-city deleted");
      queryClient.invalidateQueries({ queryKey: ["sub_cities"] });
    } catch (error) {
      toast.error("Failed to delete sub-city");
    }
  };

  const handleToggleActive = async (subCity: SubCity) => {
    try {
      const { error } = await supabase
        .from("sub_cities")
        .update({ is_active: !subCity.is_active })
        .eq("id", subCity.id);

      if (error) throw error;
      toast.success(subCity.is_active ? "Sub-city deactivated" : "Sub-city activated");
      queryClient.invalidateQueries({ queryKey: ["sub_cities"] });
    } catch (error) {
      toast.error("Failed to update sub-city");
    }
  };

  const getCityName = (cityId: string) => {
    const city = cities?.find(c => c.id === cityId);
    return city?.name || cityId;
  };

  const filteredSubCities = subCities?.filter(sc => {
    const matchesSearch = sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sc.name_ar && sc.name_ar.includes(searchQuery));
    const matchesCity = filterCity === "all" || sc.city_id === filterCity;
    return matchesSearch && matchesCity;
  }) || [];

  // Group by city
  const groupedSubCities = filteredSubCities.reduce((acc, sc) => {
    const cityName = getCityName(sc.city_id);
    if (!acc[cityName]) acc[cityName] = [];
    acc[cityName].push(sc);
    return acc;
  }, {} as Record<string, SubCity[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Sub-Cities / Areas</h1>
          <p className="text-muted-foreground">Manage areas within cities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-City
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubCity ? "Edit Sub-City" : "Add Sub-City"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Parent City *</Label>
                <Select
                  value={formData.city_id}
                  onValueChange={(value) => setFormData({ ...formData, city_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities?.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name} {city.name_ar ? `(${city.name_ar})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name (English) *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Hay Al-Andalus"
                />
              </div>
              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="e.g., حي الأندلس"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  {editingSubCity ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sub-cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities?.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : Object.keys(groupedSubCities).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sub-cities found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedSubCities).map(([cityName, citySubCities]) => (
          <Card key={cityName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {cityName}
                <Badge variant="secondary">{citySubCities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Name (Arabic)</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citySubCities
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                    .map((subCity) => (
                      <TableRow key={subCity.id}>
                        <TableCell className="font-medium">{subCity.name}</TableCell>
                        <TableCell dir="rtl">{subCity.name_ar || "-"}</TableCell>
                        <TableCell>{subCity.display_order || 0}</TableCell>
                        <TableCell>
                          <Badge
                            variant={subCity.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(subCity)}
                          >
                            {subCity.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(subCity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(subCity.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
