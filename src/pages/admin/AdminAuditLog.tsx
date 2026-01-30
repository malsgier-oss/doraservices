import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditLog } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminAuditLog() {
  const { data: logs, isLoading } = useAuditLog();

  const getActionBadge = (action: string) => {
    const destructiveActions = ["suspend", "delete", "archive", "deactivate", "reject"];
    const isDestructive = destructiveActions.some((a) => action.includes(a));
    
    return (
      <Badge variant={isDestructive ? "destructive" : "secondary"}>
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Track all admin actions on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            ) : logs?.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-muted-foreground">
                No audit log entries yet
              </div>
            ) : (
              logs?.map((log) => (
                <div key={log.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action)}
                        <Badge variant="outline" className="capitalize">
                          {log.target_type}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono truncate" title={log.target_id || ""}>
                        {log.target_id || "-"}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </div>
                  </div>
                  {log.details ? (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {JSON.stringify(log.details)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">-</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No audit log entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {log.target_type}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.target_id ? log.target_id.slice(0, 8) + "..." : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
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
