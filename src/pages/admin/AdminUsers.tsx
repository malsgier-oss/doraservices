import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  Search,
  MoreHorizontal,
  Shield,
  Store,
  User,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
} from "lucide-react";
import { useAdminUsers, useUserMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useCities } from "@/hooks/useCities";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });
  const [suspendReason, setSuspendReason] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const { data: users, isLoading } = useAdminUsers({
    status: statusFilter,
    role: roleFilter,
    search: search,
  });
  const { data: cities } = useCities();

  const { suspendUser, reactivateUser, archiveUser, deleteUser, changeUserRole, verifyUser, unverifyUser } =
    useUserMutations();

  const getCityName = (cityId: string | null) => {
    if (!cityId) return "-";
    const city = cities?.find((c) => c.id === cityId);
    return city?.name || cityId;
  };

  const handleSuspend = () => {
    if (suspendDialog.userId && suspendReason) {
      suspendUser.mutate({ userId: suspendDialog.userId, reason: suspendReason });
      setSuspendDialog({ open: false, userId: null });
      setSuspendReason("");
    }
  };

  const handleDelete = () => {
    if (!deleteDialog.userId) return;
    deleteUser.mutate(deleteDialog.userId);
    setDeleteDialog({ open: false, userId: null });
    setDeleteConfirm("");
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map((role) => {
      const config: Record<
        string,
        { icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
      > = {
        admin: { icon: Shield, variant: "destructive" },
        provider: { icon: Store, variant: "default" },
        user: { icon: User, variant: "secondary" },
      };
      const { icon: Icon, variant } = config[role] || { icon: User, variant: "secondary" as const };
      return (
        <Badge key={role} variant={variant} className="gap-1">
          <Icon className="h-3 w-3" />
          {role === "provider" ? "business" : role}
        </Badge>
      );
    });
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
        <h1 className="text-3xl font-display font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage all platform users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="provider">Business</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Provider Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || "Unnamed User"}</TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center gap-1 text-sm font-mono">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getCityName(user.city_id)}</TableCell>
                      <TableCell>
                        {user.roles.includes("provider") ? (
                          (user.provider_status || "pending").toLowerCase() === "approved" ? (
                            <Badge variant="default" className="bg-green-600 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1">
                              <XCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary">—</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">{getRoleBadges(user.roles)}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.status === "active" ? (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSuspendDialog({ open: true, userId: user.user_id });
                                }}
                                className="text-destructive"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : user.status === "suspended" ? (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  reactivateUser.mutate(user.user_id);
                                }}
                              >
                                Reactivate User
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            {user.roles.includes("provider") && (
                              (user.provider_status || "pending").toLowerCase() !== "approved" ? (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    verifyUser.mutate(user.user_id);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Provider
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    unverifyUser.mutate(user.user_id);
                                  }}
                                  className="text-yellow-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Set Provider to Pending
                                </DropdownMenuItem>
                              )
                            )}
                            <DropdownMenuSeparator />
                            {!user.roles.includes("provider") && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  changeUserRole.mutate({ userId: user.user_id, role: "provider", action: "add" });
                                }}
                              >
                                <Store className="h-4 w-4 mr-2" />
                                Add Business Role
                              </DropdownMenuItem>
                            )}
                            {user.roles.includes("provider") && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  changeUserRole.mutate({ userId: user.user_id, role: "provider", action: "remove" });
                                }}
                              >
                                Remove Business Role
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {user.status !== "archived" && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  archiveUser.mutate(user.user_id);
                                }}
                                className="text-destructive"
                              >
                                Archive User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setDeleteDialog({ open: true, userId: user.user_id });
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
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

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, userId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Please provide a reason for suspending this user. This action can be reversed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter suspension reason..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, userId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={!suspendReason}>
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          setDeleteDialog({ open, userId: null });
          setDeleteConfirm("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This permanently deletes the user account and removes their data. Type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Confirmation</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialog({ open: false, userId: null });
                setDeleteConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== "DELETE" || deleteUser.isPending}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
