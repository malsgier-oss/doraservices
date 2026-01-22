import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, AlertTriangle, User, Store, Tag, Wrench } from "lucide-react";
import { useAdminReports, useReportMutations } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminReports() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; reportId: string | null }>({
    open: false,
    reportId: null,
  });
  const [resolutionNote, setResolutionNote] = useState("");

  const { data: reports, isLoading } = useAdminReports({ status: statusFilter });
  const { resolveReport, dismissReport } = useReportMutations();

  const handleResolve = () => {
    if (resolveDialog.reportId && resolutionNote) {
      resolveReport.mutate({ reportId: resolveDialog.reportId, note: resolutionNote });
      setResolveDialog({ open: false, reportId: null });
      setResolutionNote("");
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      resolved: { variant: "default", label: "Resolved" },
      dismissed: { variant: "secondary", label: "Dismissed" },
    };
    const { variant, label } = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getReportTypeIcon = (report: {
    reported_user_id: string | null;
    reported_business_id: string | null;
    reported_deal_id: string | null;
    reported_service_id: string | null;
  }) => {
    if (report.reported_service_id) return <Wrench className="h-4 w-4" />;
    if (report.reported_user_id) return <User className="h-4 w-4" />;
    if (report.reported_business_id) return <Store className="h-4 w-4" />;
    if (report.reported_deal_id) return <Tag className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getReportTarget = (report: {
    reported_user_id: string | null;
    reported_business_id: string | null;
    reported_deal_id: string | null;
    reported_service_id: string | null;
  }) => {
    if (report.reported_service_id) return "Service";
    if (report.reported_user_id) return "User";
    if (report.reported_business_id) return "Business";
    if (report.reported_deal_id) return "Deal";
    return "Unknown";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">User Reports</h1>
        <p className="text-muted-foreground mt-1">Review and resolve user-submitted reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))
            ) : reports?.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-muted-foreground">
                No reports found
              </div>
            ) : (
              reports?.map((report) => (
                <div key={report.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">
                        {getReportTypeIcon(report)}
                        <span className="capitalize truncate">{report.report_type}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getReportTarget(report)} • {format(new Date(report.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(report.status)}</div>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Reason:</span> {report.reason}
                  </div>

                  {report.status === "pending" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setResolveDialog({ open: true, reportId: report.id })}>
                        <Check className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button variant="secondary" onClick={() => dismissReport.mutate({ reportId: report.id })}>
                        <X className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                    </div>
                  ) : report.resolution_note ? (
                    <div className="text-sm text-muted-foreground">
                      {report.resolution_note}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(report)}
                          <span className="capitalize">{report.report_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getReportTarget(report)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setResolveDialog({ open: true, reportId: report.id })}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissReport.mutate({ reportId: report.id })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                        {report.status !== "pending" && report.resolution_note && (
                          <span className="text-sm text-muted-foreground">{report.resolution_note}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog({ open, reportId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Provide details about how this report was resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution Note</Label>
              <Textarea
                id="resolution"
                placeholder="Describe the action taken..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, reportId: null })}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNote}>
              Resolve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
