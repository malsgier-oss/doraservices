import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReports, ReportType } from "@/hooks/useReports";
import { cn } from "@/lib/utils";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: string;
  userId?: string;
  providerName?: string;
}

const REPORT_REASONS: { value: ReportType; labelEn: string; labelAr: string }[] = [
  { value: "spam", labelEn: "Spam or misleading", labelAr: "رسائل مزعجة أو مضللة" },
  { value: "inappropriate", labelEn: "Inappropriate content", labelAr: "محتوى غير لائق" },
  { value: "fraud", labelEn: "Fraud or scam", labelAr: "احتيال أو نصب" },
  { value: "service", labelEn: "Poor service quality", labelAr: "جودة خدمة سيئة" },
  { value: "other", labelEn: "Other", labelAr: "أخرى" },
];

export function ReportDialog({
  open,
  onOpenChange,
  serviceId,
  userId,
  providerName,
}: ReportDialogProps) {
  const { isRTL } = useLanguage();
  const { submitReport } = useReports();
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reportType) {
      setError(isRTL ? "يرجى اختيار سبب البلاغ" : "Please select a reason");
      return;
    }

    if (details.length < 10) {
      setError(isRTL ? "يرجى إضافة المزيد من التفاصيل" : "Please provide more details (min 10 characters)");
      return;
    }

    setError("");
    await submitReport.mutateAsync({
      reportType,
      reason: details,
      reportedServiceId: serviceId,
      reportedUserId: userId,
    });

    // Reset and close
    setReportType("");
    setDetails("");
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReportType("");
      setDetails("");
      setError("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isRTL ? "الإبلاغ عن مشكلة" : "Report an Issue"}
          </DialogTitle>
          <DialogDescription>
            {providerName 
              ? (isRTL ? `الإبلاغ عن ${providerName}` : `Report ${providerName}`)
              : (isRTL ? "أخبرنا بما حدث" : "Tell us what happened")
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label>{isRTL ? "سبب البلاغ" : "Reason for report"}</Label>
            <RadioGroup
              value={reportType}
              onValueChange={(v) => setReportType(v as ReportType)}
              className="space-y-2"
            >
              {REPORT_REASONS.map((reason) => (
                <div 
                  key={reason.value}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    reportType === reason.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    isRTL && "flex-row-reverse space-x-reverse"
                  )}
                  onClick={() => setReportType(reason.value)}
                >
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="flex-1 cursor-pointer">
                    {isRTL ? reason.labelAr : reason.labelEn}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Label htmlFor="report-details">
              {isRTL ? "تفاصيل إضافية" : "Additional details"}
            </Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={isRTL ? "اشرح ما حدث بالتفصيل..." : "Explain what happened in detail..."}
              className="min-h-[100px] resize-none rounded-xl"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-full"
            disabled={submitReport.isPending}
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            className="rounded-full"
            variant="destructive"
            disabled={submitReport.isPending || !reportType}
          >
            {submitReport.isPending 
              ? (isRTL ? "جاري الإرسال..." : "Submitting...") 
              : (isRTL ? "إرسال البلاغ" : "Submit Report")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
