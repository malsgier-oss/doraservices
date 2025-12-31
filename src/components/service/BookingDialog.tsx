import { useState } from "react";
import { Phone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleBook = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await createBooking({
        service_id: serviceId,
        provider_id: providerId,
        description: "Direct booking",
        scheduled_date: new Date(),
        time_slot: "flexible",
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
    onOpenChange(false);
  };

  const handleCall = () => {
    if (providerPhone) {
      window.location.href = `tel:${providerPhone}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className={cn("text-center", isRTL ? "text-right" : "text-left")}>
            {isBooked ? t.booking.requestSent : t.booking.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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
              {/* Booking Confirmation */}
              <div className="flex gap-3">
                <Button
                  onClick={handleBook}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full"
                >
                  {isSubmitting ? t.common.loading : t.common.confirm}
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
