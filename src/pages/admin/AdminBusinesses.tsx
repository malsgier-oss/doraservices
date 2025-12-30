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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, MoreHorizontal, Star, StarOff, Check, X, AlertTriangle } from "lucide-react";
import { useAdminBusinesses, useBusinessMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminBusinesses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authFilter, setAuthFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "approve" | "reject" | "suspend" | null;
    businessId: string | null;
  }>({ open: false, type: null, businessId: null });
  const [actionNote, setActionNote] = useState("");

  const { data: businesses, isLoading } = useAdminBusinesses({
    status: statusFilter,
    authorization: authFilter,
    search: search,
  });

  const { authorizeBusiness, suspendBusiness, reactivateBusiness, toggleFeaturedBusiness } = useBusinessMutations();

  const handleAction = () => {
    if (!actionDialog.businessId || !actionDialog.type) return;

    if (actionDialog.type === "approve") {
      authorizeBusiness.mutate({ businessId: actionDialog.businessId, status: "approved", note: actionNote });
    } else if (actionDialog.type === "reject") {
      authorizeBusiness.mutate({ businessId: actionDialog.businessId, status: "rejected", note: actionNote });
    } else if (actionDialog.type === "suspend") {
      suspendBusiness.mutate({ businessId: actionDialog.businessId, reason: actionNote });
    }

    setActionDialog({ open: false, type: null, businessId: null });
    setActionNote("");
  };

  const getAuthBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "secondary",
      suspended: "destructive",
      archived: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Business Management</h1>
        <p className="text-muted-foreground mt-1">Manage business authorizations and operations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={authFilter} onValueChange={setAuthFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Authorization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Authorization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : businesses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses?.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell className="text-muted-foreground">{business.category}</TableCell>
                      <TableCell>{getAuthBadge(business.authorization_status)}</TableCell>
                      <TableCell>{getStatusBadge(business.operational_status)}</TableCell>
                      <TableCell>
                        {business.featured ? (
                          <Star className="h-4 w-4 text-star fill-star" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(business.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {business.authorization_status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ open: true, type: "approve", businessId: business.id })}
                                  className="text-success"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ open: true, type: "reject", businessId: business.id })}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => toggleFeaturedBusiness.mutate({ businessId: business.id, featured: !business.featured })}
                            >
                              {business.featured ? (
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
                            {business.operational_status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => setActionDialog({ open: true, type: "suspend", businessId: business.id })}
                                className="text-destructive"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            ) : business.operational_status === "suspended" ? (
                              <DropdownMenuItem onClick={() => reactivateBusiness.mutate(business.id)}>
                                Reactivate
                              </DropdownMenuItem>
                            ) : null}
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

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, type: null, businessId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" && "Approve Business"}
              {actionDialog.type === "reject" && "Reject Business"}
              {actionDialog.type === "suspend" && "Suspend Business"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "approve" && "Add an optional note for this approval."}
              {actionDialog.type === "reject" && "Please provide a reason for rejection."}
              {actionDialog.type === "suspend" && "Please provide a reason for suspension."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Enter note..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null, businessId: null })}>
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={actionDialog.type !== "approve" && !actionNote}
            >
              {actionDialog.type === "approve" && "Approve"}
              {actionDialog.type === "reject" && "Reject"}
              {actionDialog.type === "suspend" && "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
