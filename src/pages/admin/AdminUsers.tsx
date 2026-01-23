import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkMode, setBulkMode] = useState<"soft" | "hard">("soft");
  const [bulkConfirm, setBulkConfirm] = useState("");

  const { data: users, isLoading } = useAdminUsers({
    status: statusFilter,
    role: roleFilter,
    search: search,
  });
  const { data: cities } = useCities();

  const {
    suspendUser,
    reactivateUser,
    archiveUser,
    deleteUser,
    softDeleteUser,
    bulkSoftDeleteUsers,
    bulkDeleteUsers,
    changeUserRole,
    verifyUser,
    unverifyUser,
  } =
    useUserMutations();

  const visibleUserIds = useMemo(() => (users || []).map((u) => u.user_id), [users]);
  const selectedIds = useMemo(
    () => visibleUserIds.filter((id) => selected[id]),
    [selected, visibleUserIds],
  );

  const allSelected = selectedIds.length > 0 && selectedIds.length === visibleUserIds.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < visibleUserIds.length;

  const toggleSelectAll = (checked: boolean) => {
    if (!users) return;
    const next: Record<string, boolean> = {};
    if (checked) {
      for (const u of users) next[u.user_id] = true;
    }
    setSelected(next);
  };

  const toggleSelectOne = (userId: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [userId]: checked }));
  };

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

  const handleSoftDelete = () => {
    if (!deleteDialog.userId) return;
    softDeleteUser.mutate(deleteDialog.userId);
    setDeleteDialog({ open: false, userId: null });
    setDeleteConfirm("");
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (bulkConfirm !== "DELETE") return;

    if (bulkMode === "hard") {
      bulkDeleteUsers.mutate(selectedIds, {
        onSuccess: () => {
          setSelected({});
        },
      });
    } else {
      bulkSoftDeleteUsers.mutate(selectedIds, {
        onSuccess: () => {
          setSelected({});
        },
      });
    }

    setBulkDeleteDialog(false);
    setBulkConfirm("");
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
              <SelectTrigger className="w-full sm:w-[150px]">
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
              <SelectTrigger className="w-full sm:w-[150px]">
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

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="mb-4 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="text-sm">
                <span className="font-medium">Selected:</span> {selectedIds.length}
                {someSelected ? " (partial)" : ""}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelected({})}
                  disabled={bulkDeleteUsers.isPending || bulkSoftDeleteUsers.isPending}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setBulkConfirm("");
                    setBulkMode("soft");
                    setBulkDeleteDialog(true);
                  }}
                  disabled={bulkDeleteUsers.isPending || bulkSoftDeleteUsers.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected
                </Button>
              </div>
            </div>
          )}

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))
            ) : users?.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              users?.map((user) => (
                <div key={user.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        checked={!!selected[user.user_id]}
                        onCheckedChange={(v) => toggleSelectOne(user.user_id, Boolean(v))}
                        aria-label={`Select ${user.full_name || "user"}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{user.full_name || "Unnamed User"}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {user.phone ? (
                            <a className="inline-flex items-center gap-1 underline-offset-4 hover:underline" href={`tel:${user.phone}`}>
                              <Phone className="h-3 w-3" />
                              <span className="font-mono">{user.phone}</span>
                            </a>
                          ) : (
                            <span>-</span>
                          )}
                          <span className="px-2">•</span>
                          <span>{getCityName(user.city_id)}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0">
                          Actions
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
                        {/* User Verification (for all users, not just providers) */}
                        {!user.roles.includes("admin") && (
                          (user.is_verified === true ? (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                unverifyUser.mutate(user.user_id);
                              }}
                              className="text-yellow-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Unverify User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                verifyUser.mutate(user.user_id);
                              }}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify User
                            </DropdownMenuItem>
                          ))
                        )}
                        <DropdownMenuSeparator />
                        {user.roles.includes("provider") &&
                          ((user.provider_status || "pending").toLowerCase() !== "approved" ? (
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
                          ))}
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
                        {!user.roles.includes("admin") && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              changeUserRole.mutate({ userId: user.user_id, role: "admin", action: "add" });
                            }}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Add Admin Role
                          </DropdownMenuItem>
                        )}
                        {user.roles.includes("admin") && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              changeUserRole.mutate({ userId: user.user_id, role: "admin", action: "remove" });
                            }}
                          >
                            Remove Admin Role
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
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 flex-wrap">{getRoleBadges(user.roles)}</div>
                    {getStatusBadge(user.status)}
                    {/* User Verification Status */}
                    {!user.roles.includes("admin") && (
                      user.is_verified === true ? (
                        <Badge variant="default" className="bg-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600 gap-1">
                          <XCircle className="h-3 w-3" />
                          Pending Verification
                        </Badge>
                      )
                    )}
                    {user.roles.includes("provider") ? (
                      (user.provider_status || "pending").toLowerCase() === "approved" ? (
                        <Badge variant="default" className="bg-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Provider Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600 gap-1">
                          <XCircle className="h-3 w-3" />
                          Provider Pending
                        </Badge>
                      )
                    ) : null}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Joined: {format(new Date(user.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Verification</TableHead>
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
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
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
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[user.user_id]}
                          onCheckedChange={(v) => toggleSelectOne(user.user_id, Boolean(v))}
                          aria-label={`Select ${user.full_name || "user"}`}
                        />
                      </TableCell>
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
                        {!user.roles.includes("admin") ? (
                          user.is_verified === true ? (
                            <Badge variant="default" className="bg-green-600 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600 gap-1">
                              <XCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                      </TableCell>
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
                            {/* User Verification (for all users, not just providers) */}
                            {!user.roles.includes("admin") && (
                              (user.is_verified === true ? (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    unverifyUser.mutate(user.user_id);
                                  }}
                                  className="text-yellow-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Unverify User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    verifyUser.mutate(user.user_id);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Verify User
                                </DropdownMenuItem>
                              ))
                            )}
                            <DropdownMenuSeparator />
                            {user.roles.includes("provider") &&
                              ((user.provider_status || "pending").toLowerCase() !== "approved" ? (
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
                              ))}
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
                            {!user.roles.includes("admin") && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  changeUserRole.mutate({ userId: user.user_id, role: "admin", action: "add" });
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Add Admin Role
                              </DropdownMenuItem>
                            )}
                            {user.roles.includes("admin") && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  changeUserRole.mutate({ userId: user.user_id, role: "admin", action: "remove" });
                                }}
                              >
                                Remove Admin Role
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
              Type DELETE to confirm. "Soft delete" hides the user & their services (safer). "Hard delete" also deletes the auth account via Edge Function.
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
              onClick={handleSoftDelete}
              disabled={deleteConfirm !== "DELETE" || softDeleteUser.isPending}
            >
              Soft delete
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirm !== "DELETE" || deleteUser.isPending}
            >
              Hard delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog
        open={bulkDeleteDialog}
        onOpenChange={(open) => {
          setBulkDeleteDialog(open);
          if (!open) {
            setBulkConfirm("");
            setBulkMode("soft");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected users</DialogTitle>
            <DialogDescription>
              You selected <b>{selectedIds.length}</b> users. Choose mode, then type DELETE.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={bulkMode} onValueChange={(v) => setBulkMode(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Soft delete (recommended)</SelectItem>
                  <SelectItem value="hard">Hard delete (Edge Function)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Soft delete hides profiles & services. Hard delete requires the "admin" Edge Function to be deployed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-delete-confirm">Confirmation</Label>
              <Input
                id="bulk-delete-confirm"
                value={bulkConfirm}
                onChange={(e) => setBulkConfirm(e.target.value)}
                placeholder="Type DELETE"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkConfirm !== "DELETE" || bulkDeleteUsers.isPending || bulkSoftDeleteUsers.isPending}
            >
              Delete {selectedIds.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
