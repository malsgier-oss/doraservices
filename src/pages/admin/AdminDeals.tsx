import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, StarOff, Archive, Ban, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useAdminDeals, useDealMutations } from "@/hooks/useAdmin";

export default function AdminDeals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: deals, isLoading } = useAdminDeals({
    status: statusFilter,
    search,
  });
  const { activateDeal, deactivateDeal, toggleFeaturedDeal, archiveDeal } = useDealMutations();

  const statusBadge = (status: string | null) => {
    const s = (status || "active").toLowerCase();
    if (s === "active") return <Badge className="bg-green-500">Active</Badge>;
    if (s === "inactive") return <Badge variant="secondary">Inactive</Badge>;
    if (s === "archived") return <Badge variant="outline">Archived</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Deals</h1>
        <p className="text-muted-foreground mt-1">Manage business deals (activate, feature, archive)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>All Deals</span>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
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
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
          ) : !deals || deals.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-muted-foreground">No deals found</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {deals.map((deal) => {
                  const isFeatured = !!deal.featured;
                  const st = (deal.status || "active").toLowerCase();
                  const businessName = deal.businesses?.name || "—";
                  return (
                    <div key={deal.id} className="rounded-xl border p-4 space-y-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{deal.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {businessName} • {format(new Date(deal.created_at), "MMM d, yyyy")}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(deal.status)}
                        <Badge
                          variant={isFeatured ? "default" : "outline"}
                          className={isFeatured ? "bg-yellow-500 text-black" : ""}
                        >
                          {isFeatured ? <Star className="h-3 w-3 fill-black text-black" /> : <StarOff className="h-3 w-3" />}
                          <span className="ml-1">{isFeatured ? "Featured" : "Not featured"}</span>
                        </Badge>
                        {deal.expires_at ? <Badge variant="secondary">Expires {format(new Date(deal.expires_at), "MMM d, yyyy")}</Badge> : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {st === "active" ? (
                          <Button
                            variant="secondary"
                            onClick={() => deactivateDeal.mutate(deal.id)}
                            disabled={deactivateDeal.isPending}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Deactivate
                          </Button>
                        ) : st === "inactive" ? (
                          <Button
                            variant="outline"
                            onClick={() => activateDeal.mutate(deal.id)}
                            disabled={activateDeal.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Activate
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            —
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => toggleFeaturedDeal.mutate({ dealId: deal.id, featured: !isFeatured })}
                          disabled={toggleFeaturedDeal.isPending}
                        >
                          {isFeatured ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                          {isFeatured ? "Unfeature" : "Feature"}
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => archiveDeal.mutate(deal.id)}
                          disabled={archiveDeal.isPending}
                          className="col-span-2"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-md border">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal) => {
                      const isFeatured = !!deal.featured;
                      const st = (deal.status || "active").toLowerCase();
                      return (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium max-w-[320px] truncate">{deal.title}</TableCell>
                          <TableCell className="text-muted-foreground">{deal.businesses?.name || "—"}</TableCell>
                          <TableCell>{statusBadge(deal.status)}</TableCell>
                          <TableCell>
                            {isFeatured ? <Star className="h-4 w-4 text-star fill-star" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {deal.expires_at ? format(new Date(deal.expires_at), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(deal.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-2">
                              {st === "active" ? (
                                <Button size="sm" variant="secondary" onClick={() => deactivateDeal.mutate(deal.id)} disabled={deactivateDeal.isPending}>
                                  Deactivate
                                </Button>
                              ) : st === "inactive" ? (
                                <Button size="sm" variant="outline" onClick={() => activateDeal.mutate(deal.id)} disabled={activateDeal.isPending}>
                                  Activate
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleFeaturedDeal.mutate({ dealId: deal.id, featured: !isFeatured })}
                                disabled={toggleFeaturedDeal.isPending}
                              >
                                {isFeatured ? "Unfeature" : "Feature"}
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => archiveDeal.mutate(deal.id)} disabled={archiveDeal.isPending}>
                                Archive
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

