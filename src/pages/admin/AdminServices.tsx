import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";
import { useCategories } from "@/hooks/useCategories";

interface Service {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  city: string | null;
  is_visible: boolean;
  is_active: boolean;
  admin_note: string | null;
  views_count: number;
  user_id: string;
  created_at: string;
  provider?: {
    full_name: string | null;
  };
}

export default function AdminServices() {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    city: "",
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services", categoryFilter, visibilityFilter, search],
    queryFn: async () => {
      let query = supabase.from("services").select("*");

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (visibilityFilter !== "all") {
        query = query.eq("is_visible", visibilityFilter === "visible");
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Get provider info for each service
      const servicesWithProvider = await Promise.all(
        (data || []).map(async (service) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", service.user_id)
            .single();
          return { ...service, provider: profile };
        })
      );

      return servicesWithProvider as Service[];
    },
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from("services")
        .update({ is_visible: isVisible })
        .eq("id", id);
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
    onError: () => {
      toast.error("Failed to update visibility");
    },
  });

  const updateService = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Service> }) => {
      const { error } = await supabase
        .from("services")
        .update(data.updates)
        .eq("id", data.id);
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
    onError: () => {
      toast.error("Failed to update service");
    },
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
    onError: () => {
      toast.error("Failed to delete service");
    },
  });

  const saveAdminNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from("services")
        .update({ admin_note: note })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast.success("Note saved");
      setNoteOpen(false);
    },
    onError: () => {
      toast.error("Failed to save note");
    },
  });

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setEditForm({
      title: service.title,
      description: service.description || "",
      category: service.category,
      price: service.price,
      city: service.city || "",
    });
    setEditOpen(true);
  };

  const openNoteDialog = (service: Service) => {
    setSelectedService(service);
    setAdminNote(service.admin_note || "");
    setNoteOpen(true);
  };

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
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableHead>Provider</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium max-w-48 truncate">
                      {service.title}
                      {service.admin_note && (
                        <StickyNote className="inline ml-2 h-3 w-3 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.provider?.full_name || "N/A"}</TableCell>
                    <TableCell>${service.price}</TableCell>
                    <TableCell>{service.views_count}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {service.is_visible ? (
                          <Badge className="bg-green-500">Visible</Badge>
                        ) : (
                          <Badge variant="secondary">Hidden</Badge>
                        )}
                        {!service.is_active && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(service.created_at), "MMM d, yyyy")}
                    </TableCell>
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
                          {service.is_visible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openNoteDialog(service)}
                        >
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
                ))}
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
            <div>
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
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
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({ ...editForm, category: v })}
              >
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
              <Label>Price</Label>
              <Input
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedService) {
                  updateService.mutate({
                    id: selectedService.id,
                    updates: editForm,
                  });
                }
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
