import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBookings } from "@/hooks/useBookings";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
}

export function BookingDialog({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  providerId,
  providerName,
}: BookingDialogProps) {
  const { t, language, isRTL } = useLanguage();
  const { createBooking } = useBookings();
  const locale = language === "ar" ? arSA : enUS;
  
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState("morning");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error(isRTL ? "يرجى وصف احتياجاتك" : "Please describe your needs");
      return;
    }
    if (!date) {
      toast.error(isRTL ? "يرجى اختيار التاريخ" : "Please select a date");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await createBooking({
        service_id: serviceId,
        provider_id: providerId,
        description,
        scheduled_date: date,
        time_slot: timeSlot,
      });

      if (error) throw error;

      toast.success(t.booking.requestSent, {
        description: t.booking.requestSentDesc,
      });
      onOpenChange(false);
      setDescription("");
      setDate(undefined);
      setTimeSlot("morning");
    } catch (error) {
      toast.error(isRTL ? "حدث خطأ أثناء إرسال الطلب" : "Error submitting request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className={isRTL ? "text-right" : "text-left"}>{t.booking.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Service Info */}
          <div className={cn("bg-muted rounded-xl p-3", isRTL ? "text-right" : "text-left")}>
            <p className="font-semibold text-foreground">{serviceTitle}</p>
            <p className="text-sm text-muted-foreground">{providerName}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.booking.describeNeeds}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.booking.descriptionPlaceholder}
              className={cn("min-h-[100px] rounded-xl resize-none", isRTL ? "text-right" : "text-left")}
              dir={isRTL ? "rtl" : "ltr"}
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.booking.selectDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-xl",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className={cn(isRTL ? "ml-2" : "mr-2", "h-4 w-4")} />
                  {date ? format(date, "d MMMM yyyy", { locale }) : t.booking.selectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slot */}
          <div className="space-y-2">
            <Label className={cn(isRTL ? "text-right block" : "text-left block")}>{t.booking.preferredTime}</Label>
            <RadioGroup
              value={timeSlot}
              onValueChange={setTimeSlot}
              className="flex gap-3"
            >
              {[
                { value: "morning", label: t.booking.morning },
                { value: "afternoon", label: t.booking.afternoon },
                { value: "evening", label: t.booking.evening },
              ].map((slot) => (
                <label
                  key={slot.value}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors",
                    timeSlot === slot.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <RadioGroupItem value={slot.value} className="sr-only" />
                  <span className="text-sm font-medium">{slot.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-full"
            >
              {isSubmitting ? t.common.loading : t.booking.submitRequest}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              {t.booking.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
