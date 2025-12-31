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
import { ar } from "@/lib/i18n";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTitle: string;
  providerName: string;
  onSubmit: (data: { description: string; date: Date; timeSlot: string }) => void;
}

export function BookingDialog({
  open,
  onOpenChange,
  serviceTitle,
  providerName,
  onSubmit,
}: BookingDialogProps) {
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState("morning");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("يرجى وصف احتياجاتك");
      return;
    }
    if (!date) {
      toast.error("يرجى اختيار التاريخ");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ description, date, timeSlot });
      toast.success(ar.booking.requestSent, {
        description: ar.booking.requestSentDesc,
      });
      onOpenChange(false);
      setDescription("");
      setDate(undefined);
      setTimeSlot("morning");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-right">{ar.booking.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Service Info */}
          <div className="bg-muted rounded-xl p-3 text-right">
            <p className="font-semibold text-foreground">{serviceTitle}</p>
            <p className="text-sm text-muted-foreground">{providerName}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-right block">{ar.booking.describeNeeds}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar.booking.descriptionPlaceholder}
              className="min-h-[100px] rounded-xl resize-none text-right"
              dir="rtl"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-right block">{ar.booking.selectDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-xl",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="ml-2 h-4 w-4" />
                  {date ? format(date, "d MMMM yyyy", { locale: arSA }) : ar.booking.selectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
            <Label className="text-right block">{ar.booking.preferredTime}</Label>
            <RadioGroup
              value={timeSlot}
              onValueChange={setTimeSlot}
              className="flex gap-3"
            >
              {[
                { value: "morning", label: ar.booking.morning },
                { value: "afternoon", label: ar.booking.afternoon },
                { value: "evening", label: ar.booking.evening },
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
              {isSubmitting ? ar.common.loading : ar.booking.submitRequest}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              {ar.booking.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
