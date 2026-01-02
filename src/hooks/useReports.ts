import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ReportType = "service" | "user" | "spam" | "inappropriate" | "fraud" | "other";

interface SubmitReportParams {
  reportType: ReportType;
  reason: string;
  reportedServiceId?: string;
  reportedUserId?: string;
  callLogId?: string;
}

export function useReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const submitReport = useMutation({
    mutationFn: async (params: SubmitReportParams) => {
      if (!user) throw new Error("Must be logged in to report");

      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        report_type: params.reportType,
        reason: params.reason,
        reported_service_id: params.reportedServiceId || null,
        reported_user_id: params.reportedUserId || null,
        call_log_id: params.callLogId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("Report submitted. Thank you for helping keep our community safe.");
    },
    onError: (error) => {
      toast.error(`Failed to submit report: ${error.message}`);
    },
  });

  return { submitReport };
}
