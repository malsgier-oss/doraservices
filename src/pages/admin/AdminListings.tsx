import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Trash2, Archive, CheckCircle, Eye, Copy } from "lucide-react";
import { format } from "date-fns";
import { useCities } from "@/hooks/useCities";

type ListingStatus = "draft" | "active" | "sold" | "archived";

type ListingRow = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category: string;
  price: number | null;
  currency: string;
  city_id: string | null;
  location?: string | null;
  status: ListingStatus;
  archived_at: string | null;
  created_at: string;
};

export default function AdminListings() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ListingRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: cities } = useCities();

  const cityNameById = useMemo(() => {
    const map = new Map<string, string>();
    (cities || []).forEach((c) => map.set(c.id, c.name_ar || c.name));
    return map;
  }, [cities]);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["admin-listings", statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("id,user_id,title,description,category,price,currency,city_id,location,status,archived_at,created_at");

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const q = (search || "").trim();
      if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

      const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data || []) as ListingRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ListingStatus }) => {
      const updates: any = { status };
      if (status === "archived") updates.archived_at = new Date().toISOString();
      if (status !== "archived") updates.archived_at = null;
      const { error } = await supabase.from("listings").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update listing"),
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      // Admin hard delete: requires either (a) DB RLS policy for admin delete or (b) Edge Function service role.
      // We prefer the Edge Function because it bypasses RLS and is consistent with other admin operations.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // Try Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke("admin", {
          body: { action: "deleteListing", listingId: id },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (error) throw error;
        if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
          throw new Error(String((data as Record<string, unknown>).error));
        }
        return;
      } catch (e) {
        // Fallback: attempt direct delete (works if admin delete policy exists)
        const { error } = await supabase.from("listings").delete().eq("id", id);
        if (!error) return;

        // Final fallback: archive (always allowed for admins via UPDATE policy)
        await supabase.from("listings").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", id);
        throw new Error(
          "Hard delete was blocked by permissions. The listing was archived instead.",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      toast.success("Listing deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete listing"),
  });

  const statusBadge = (s: ListingStatus) => {
    if (s === "active") return <Badge className="bg-green-500">Active</Badge>;
    if (s === "sold") return <Badge variant="secondary">Sold</Badge>;
    if (s === "archived") return <Badge variant="outline">Archived</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  const cityLabel = (cityId: string | null) => {
    if (!cityId) return "—";
    return cityNameById.get(cityId) || cityId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Listings</h1>
        <p className="text-muted-foreground mt-1">Moderate user listings (status + deletion)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>All Listings</span>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-muted-foreground">No listings found</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {listings.map((l) => (
                  <div key={l.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {l.category} • {cityLabel(l.city_id)} • {format(new Date(l.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="shrink-0 h-10"
                        onClick={() => {
                          setSelected(l);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </div>

                    {l.description ? (
                      <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {l.description}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(l.status)}
                      <Badge variant="outline">
                        {l.price == null ? "—" : `${l.price} ${l.currency || ""}`.trim()}
                      </Badge>
                      {l.location ? (
                        <Badge variant="secondary" className="truncate max-w-[240px]">
                          {l.location}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                      <div className="text-xs text-muted-foreground">User ID</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="font-mono text-xs text-muted-foreground truncate" title={l.user_id}>
                          {l.user_id}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(l.user_id);
                              toast.success("Copied");
                            } catch {
                              toast.error("Copy failed");
                            }
                          }}
                          aria-label="Copy user id"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-11"
                        onClick={() => updateStatus.mutate({ id: l.id, status: "active" })}
                        disabled={updateStatus.isPending || l.status === "active"}
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Mark Active
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11"
                        onClick={() => updateStatus.mutate({ id: l.id, status: "sold" })}
                        disabled={updateStatus.isPending || l.status === "sold"}
                      >
                        Mark Sold
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-11"
                        onClick={() => updateStatus.mutate({ id: l.id, status: "archived" })}
                        disabled={updateStatus.isPending || l.status === "archived"}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-11"
                        onClick={() => {
                          if (confirm("Delete this listing?")) deleteListing.mutate(l.id);
                        }}
                        disabled={deleteListing.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-md border">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium max-w-[320px] truncate">{l.title}</TableCell>
                        <TableCell className="text-muted-foreground">{l.category}</TableCell>
                        <TableCell className="text-muted-foreground">{cityLabel(l.city_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{l.price == null ? "—" : `${l.price} ${l.currency || ""}`.trim()}</TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(l.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: l.id, status: "active" })} disabled={updateStatus.isPending || l.status === "active"}>
                              Active
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: l.id, status: "sold" })} disabled={updateStatus.isPending || l.status === "sold"}>
                              Sold
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: l.id, status: "archived" })} disabled={updateStatus.isPending || l.status === "archived"}>
                              Archive
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this listing?")) deleteListing.mutate(l.id); }} disabled={deleteListing.isPending}>
                              Delete
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listing details</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="font-medium">{selected.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div>{statusBadge(selected.status)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="text-sm">
                    {selected.price == null ? "—" : `${selected.price} ${selected.currency || ""}`.trim()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">City</div>
                  <div className="text-sm">{cityLabel(selected.city_id)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Category</div>
                  <div className="text-sm">{selected.category}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.location || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description || "—"}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Listing ID</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-muted-foreground truncate" title={selected.id}>
                    {selected.id}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selected.id);
                        toast.success("Copied");
                      } catch {
                        toast.error("Copy failed");
                      }
                    }}
                    aria-label="Copy listing id"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

