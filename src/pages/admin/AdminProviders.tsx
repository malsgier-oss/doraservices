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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface Provider {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  provider_status: string | null;
  status: string;
  created_at: string;
  services_count?: number;
}

export default function AdminProviders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerStatusFilter, setProviderStatusFilter] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers", statusFilter, providerStatusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .not("provider_status", "is", null);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (providerStatusFilter !== "all") {
        query = query.eq("provider_status", providerStatusFilter);
      }
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Get services count for each provider
      const providersWithCount = await Promise.all(
        (data || []).map(async (provider) => {
          const { count } = await supabase
            .from("services")
            .select("*", { count: "exact", head: true })
            .eq("user_id", provider.user_id);
          return { ...provider, services_count: count || 0 };
        })
      );

      return providersWithCount as Provider[];
    },
  });

  const updateProviderStatus = useMutation({
    mutationFn: async ({ userId, providerStatus, providerName }: { userId: string; providerStatus: string; providerName?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ provider_status: providerStatus })
        .eq("user_id", userId);
      if (error) throw error;

      // Send notification to provider
      const title = providerStatus === "approved" 
        ? "Provider Application Approved! 🎉" 
        : "Provider Application Update";
      const content = providerStatus === "approved"
        ? "Congratulations! Your provider application has been approved. You can now offer your services on the platform."
        : "Your provider application status has been updated. Please contact support if you have questions.";
      
      await supabase.rpc("create_user_notification", {
        p_user_id: userId,
        p_title: title,
        p_content: content,
      });

      // Log admin action
      await supabase.rpc("log_admin_action", {
        p_action: `provider_${providerStatus}`,
        p_target_type: "provider",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Provider status updated");
    },
    onError: () => {
      toast.error("Failed to update provider status");
    },
  });

  const updateAccountStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "suspended") {
        updateData.suspended_at = new Date().toISOString();
      } else {
        updateData.suspended_at = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: `provider_${status}`,
        p_target_type: "provider",
        p_target_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Account status updated");
    },
    onError: () => {
      toast.error("Failed to update account status");
    },
  });

  const getProviderStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Service Providers</h1>
        <p className="text-muted-foreground">Manage service provider applications and accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Providers</span>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search providers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={providerStatusFilter} onValueChange={setProviderStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Provider Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Account Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
          ) : providers?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No providers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Provider Status</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers?.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      {provider.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{provider.phone || "N/A"}</TableCell>
                    <TableCell>{provider.city || "N/A"}</TableCell>
                    <TableCell>{provider.services_count}</TableCell>
                    <TableCell>{getProviderStatusBadge(provider.provider_status)}</TableCell>
                    <TableCell>{getAccountStatusBadge(provider.status)}</TableCell>
                    <TableCell>
                      {format(new Date(provider.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProvider(provider);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {provider.provider_status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() =>
                                updateProviderStatus.mutate({
                                  userId: provider.user_id,
                                  providerStatus: "approved",
                                })
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() =>
                                updateProviderStatus.mutate({
                                  userId: provider.user_id,
                                  providerStatus: "rejected",
                                })
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {provider.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-orange-500"
                            onClick={() =>
                              updateAccountStatus.mutate({
                                userId: provider.user_id,
                                status: "suspended",
                              })
                            }
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {provider.status === "suspended" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500"
                            onClick={() =>
                              updateAccountStatus.mutate({
                                userId: provider.user_id,
                                status: "active",
                              })
                            }
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provider Details</DialogTitle>
          </DialogHeader>
          {selectedProvider && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedProvider.full_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedProvider.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{selectedProvider.city || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Services</p>
                  <p className="font-medium">{selectedProvider.services_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider Status</p>
                  {getProviderStatusBadge(selectedProvider.provider_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  {getAccountStatusBadge(selectedProvider.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {format(new Date(selectedProvider.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}
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
