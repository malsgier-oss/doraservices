import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Star, StarOff, Play, Pause, Archive } from "lucide-react";
import { useAdminDeals, useDealMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminDeals() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: deals, isLoading } = useAdminDeals({
    status: statusFilter,
    search: search,
  });

  const { deactivateDeal, activateDeal, toggleFeaturedDeal, archiveDeal } = useDealMutations();

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "secondary", label: "Inactive" },
      expired: { variant: "outline", label: "Expired" },
      draft: { variant: "secondary", label: "Draft" },
      archived: { variant: "outline", label: "Archived" },
    };
    const s = status || "draft";
    const { variant, label } = config[s] || { variant: "secondary" as const, label: s };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Deals Moderation</h1>
        <p className="text-muted-foreground mt-1">Manage and moderate all platform deals</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : deals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No deals found
                    </TableCell>
                  </TableRow>
                ) : (
                  deals?.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {deal.businesses?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {deal.discount}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        {deal.featured ? (
                          <Star className="h-4 w-4 text-star fill-star" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {deal.expires_at
                          ? format(new Date(deal.expires_at), "MMM d, yyyy")
                          : "No expiry"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {deal.status === "active" ? (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  deactivateDeal.mutate(deal.id);
                                }}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : deal.status !== "archived" && deal.status !== "expired" ? (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  activateDeal.mutate(deal.id);
                                }}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                toggleFeaturedDeal.mutate({ dealId: deal.id, featured: !deal.featured });
                              }}
                            >
                              {deal.featured ? (
                                <>
                                  <StarOff className="h-4 w-4 mr-2" />
                                  Unfeature
                                </>
                              ) : (
                                <>
                                  <Star className="h-4 w-4 mr-2" />
                                  Feature
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {deal.status !== "archived" && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  archiveDeal.mutate(deal.id);
                                }}
                                className="text-destructive"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
