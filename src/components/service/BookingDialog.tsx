import { useState } from "react";
import { Phone, Check, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBookings } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  providerPhone?: string;
}

export function BookingDialog({
  open,
  onOpenChange,
  serviceId,
  serviceTitle,
  providerId,
  providerName,
  providerPhone,
}: BookingDialogProps) {
  const { t, isRTL } = useLanguage();
  const { createBooking } = useBookings();
  
  const [isBooked, setIsBooked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("morning");
  const [description, setDescription] = useState("");

  const timeSlots = [
    { id: "morning", label: t.booking.morning },
    { id: "afternoon", label: t.booking.afternoon },
    { id: "evening", label: t.booking.evening },
  ];

  const handleBook = async () => {
    if (!selectedDate) {
      toast.error(isRTL ? "يرجى اختيار التاريخ" : "Please select a date");
      return;
    }
    if (!description.trim()) {
      toast.error(isRTL ? "يرجى وصف احتياجاتك" : "Please describe your needs");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await createBooking({
        service_id: serviceId,
        provider_id: providerId,
        description: description.trim(),
        scheduled_date: selectedDate,
        time_slot: selectedTimeSlot,
      });

      if (error) throw error;

      setIsBooked(true);
      toast.success(t.booking.requestSent, {
        description: t.booking.requestSentDesc,
      });
    } catch (error) {
      toast.error(isRTL ? "حدث خطأ أثناء الحجز" : "Error creating booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsBooked(false);
    setSelectedDate(undefined);
    setSelectedTimeSlot("morning");
    setDescription("");
    onOpenChange(false);
  };

  const handleCall = () => {
    if (providerPhone) {
      window.location.href = `tel:${providerPhone}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={cn("text-center", isRTL ? "text-right" : "text-left")}>
            {isBooked ? t.booking.requestSent : t.booking.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2" dir={isRTL ? "rtl" : "ltr"}>
          {/* Service Info */}
          <div className={cn("bg-muted rounded-xl p-4 text-center")}>
            <p className="font-semibold text-foreground text-lg">{serviceTitle}</p>
            <p className="text-sm text-muted-foreground mt-1">{providerName}</p>
          </div>

          {isBooked ? (
            <>
              {/* Success State */}
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-success" />
                </div>
              </div>
              
              <p className="text-center text-muted-foreground text-sm">
                {t.booking.requestSentDesc}
              </p>

              {/* Phone Number */}
              {providerPhone ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="text-center text-sm text-muted-foreground mb-2">
                    {t.booking.callProvider}
                  </p>
                  <Button 
                    onClick={handleCall}
                    className="w-full rounded-full"
                    size="lg"
                  >
                    <Phone className="h-5 w-5" />
                    <span className={isRTL ? "mr-2" : "ml-2"} dir="ltr">
                      {providerPhone}
                    </span>
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  {t.booking.noPhone}
                </p>
              )}

              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full rounded-full"
              >
                {t.booking.close}
              </Button>
            </>
          ) : (
            <>
              {/* Description */}
              <div className="space-y-2">
                <Label>{t.booking.describeNeeds}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.booking.descriptionPlaceholder}
                  className="min-h-[80px] rounded-xl resize-none"
                  dir={isRTL ? "rtl" : "ltr"}
                />
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <Label>{t.booking.selectDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-xl h-12",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, "PPP") : (isRTL ? "اختر التاريخ" : "Pick a date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-2">
                <Label>{t.booking.preferredTime}</Label>
                <div className="flex gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedTimeSlot(slot.id)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors",
                        selectedTimeSlot === slot.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBook}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full"
                >
                  {isSubmitting ? t.common.loading : t.booking.submitRequest}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  {t.booking.cancel}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
