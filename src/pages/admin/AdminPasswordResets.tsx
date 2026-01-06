import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { Phone, CheckCircle, XCircle, Clock, Key, MessageSquare } from "lucide-react";

type ResetRequest = {
  id: string;
  phone: string;
  user_id: string | null;
  city_id: string | null;
  status: string;
  created_at: string;
  handled_by: string | null;
  handled_at: string | null;
  notes: string | null;
  city?: { name: string } | null;
};

const AdminPasswordResets = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ResetRequest | null>(null);
  const [dialogType, setDialogType] = useState<"notes" | "password" | null>(null);
  const [notes, setNotes] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["password-reset-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("password_reset_requests")
        .select("*, city:cities(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ResetRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("password_reset_requests")
        .update({
          status,
          notes: notes || null,
          handled_by: user?.id,
          handled_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password-reset-requests"] });
      toast.success("Request updated successfully");
      setSelectedRequest(null);
      setDialogType(null);
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to update request: " + error.message);
    },
  });

  const setTempPasswordMutation = useMutation({
    mutationFn: async ({ phone, password, requestId }: { phone: string; password: string; requestId: string }) => {
      const { data, error } = await supabase.functions.invoke("admin", {
        body: {
          action: "set_temp_password",
          phone,
          password,
          requestId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["password-reset-requests"] });
      toast.success("Temporary password set successfully");
      setSelectedRequest(null);
      setDialogType(null);
      setTempPassword("");
    },
    onError: (error) => {
      toast.error("Failed to set password: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "contacted":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><MessageSquare className="w-3 h-3 mr-1" />Contacted</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSetPassword = () => {
    if (!selectedRequest || !tempPassword) return;
    setTempPasswordMutation.mutate({
      phone: selectedRequest.phone,
      password: tempPassword,
      requestId: selectedRequest.id,
    });
  };

  const handleUpdateNotes = (status: string) => {
    if (!selectedRequest) return;
    updateStatusMutation.mutate({
      id: selectedRequest.id,
      status,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Password Reset Requests</h1>
        <p className="text-muted-foreground">Manage user password reset requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset Requests</CardTitle>
          <CardDescription>Review and process password reset requests from users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : requests?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No password reset requests</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {request.phone}
                      </div>
                    </TableCell>
                    <TableCell>{request.city?.name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{format(new Date(request.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{request.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setDialogType("notes");
                                setNotes(request.notes || "");
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setDialogType("password");
                                setTempPassword("");
                              }}
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Set Password
                            </Button>
                          </>
                        )}
                        {request.status === "contacted" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setDialogType("password");
                              setTempPassword("");
                            }}
                          >
                            <Key className="w-4 h-4 mr-1" />
                            Set Password
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

      {/* Notes Dialog */}
      <Dialog open={dialogType === "notes"} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>
              Mark this request as contacted and add notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Phone: {selectedRequest?.phone}</p>
            </div>
            <Textarea
              placeholder="Add notes about the contact attempt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleUpdateNotes("rejected")}>
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button onClick={() => handleUpdateNotes("contacted")}>
              <MessageSquare className="w-4 h-4 mr-1" />
              Mark Contacted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={dialogType === "password"} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Temporary Password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {selectedRequest?.phone}. The user will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Enter temporary password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Minimum 6 characters. Share this password securely with the user.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetPassword} 
              disabled={tempPassword.length < 6 || setTempPasswordMutation.isPending}
            >
              <Key className="w-4 h-4 mr-1" />
              {setTempPasswordMutation.isPending ? "Setting..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPasswordResets;
