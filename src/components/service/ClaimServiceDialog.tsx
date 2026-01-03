import { useState } from "react";
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClaimServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    title: string;
    provider_phone: string;
  } | null;
  onClaimSuccess?: () => void;
}

export function ClaimServiceDialog({ 
  open, 
  onOpenChange, 
  service,
  onClaimSuccess 
}: ClaimServiceDialogProps) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [phoneInput, setPhoneInput] = useState("");
  const [step, setStep] = useState<"verify" | "success" | "error">("verify");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerifyPhone = async () => {
    if (!user || !service) return;

    // Normalize phone numbers for comparison (remove spaces, dashes, etc.)
    const normalizePhone = (phone: string) => 
      phone.replace(/[\s\-()]/g, "").replace(/^(\+|00)/, "");

    const inputNormalized = normalizePhone(phoneInput);
    const servicePhoneNormalized = normalizePhone(service.provider_phone);

    // Check if the last 9 digits match (handles country code variations)
    const inputLast9 = inputNormalized.slice(-9);
    const serviceLast9 = servicePhoneNormalized.slice(-9);

    if (inputLast9 !== serviceLast9) {
      setStep("error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the service to claim it
      const { error: serviceError } = await supabase
        .from("services")
        .update({ 
          user_id: user.id,
          // Keep the original provider info as backup
        })
        .eq("id", service.id)
        .is("user_id", null); // Only claim if not already claimed

      if (serviceError) {
        console.error("Error claiming service:", serviceError);
        toast.error(isRTL ? "حدث خطأ أثناء المطالبة بالخدمة" : "Error claiming service");
        return;
      }

      // Update profile to provider status if needed
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ provider_status: "approved" })
        .eq("user_id", user.id)
        .in("provider_status", ["pending", null]);

      if (profileError) {
        console.error("Error updating profile:", profileError);
      }

      setStep("success");
      toast.success(isRTL ? "تم المطالبة بالخدمة بنجاح" : "Service claimed successfully");
      onClaimSuccess?.();

    } catch (error) {
      console.error("Error:", error);
      toast.error(isRTL ? "حدث خطأ" : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPhoneInput("");
    setStep("verify");
    onOpenChange(false);
  };

  if (!service) return null;

  // Mask phone for display (show last 4 digits)
  const maskedPhone = service.provider_phone 
    ? `***${service.provider_phone.slice(-4)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                {isRTL ? "المطالبة بهذه الخدمة" : "Claim This Service"}
              </DialogTitle>
              <DialogDescription>
                {isRTL 
                  ? "للمطالبة بهذه الخدمة، أدخل رقم الهاتف المسجل للتحقق من ملكيتك."
                  : "To claim this service, enter the registered phone number to verify ownership."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {isRTL ? "الخدمة:" : "Service:"}
                </p>
                <p className="font-semibold text-foreground">{service.title}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isRTL ? "رقم الهاتف المسجل ينتهي بـ:" : "Registered phone ends with:"} {maskedPhone}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {isRTL ? "أدخل رقم الهاتف الكامل" : "Enter the full phone number"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder={isRTL ? "05xxxxxxxx" : "05xxxxxxxx"}
                  className={cn("h-12", isRTL ? "text-right" : "text-left")}
                  dir="ltr"
                />
              </div>

              <Button 
                onClick={handleVerifyPhone} 
                className="w-full" 
                disabled={!phoneInput.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isRTL ? "جاري التحقق..." : "Verifying..."}
                  </>
                ) : (
                  isRTL ? "تحقق وطالب بالخدمة" : "Verify & Claim Service"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle>
              {isRTL ? "تم بنجاح!" : "Success!"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "تم ربط هذه الخدمة بحسابك. يمكنك الآن إدارتها من صفحة ملفك الشخصي."
                : "This service is now linked to your account. You can manage it from your profile page."
              }
            </DialogDescription>
            <Button onClick={handleClose} className="mt-4">
              {isRTL ? "حسناً" : "Got it"}
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle>
              {isRTL ? "رقم الهاتف غير صحيح" : "Phone Number Mismatch"}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? "الرقم الذي أدخلته لا يتطابق مع الرقم المسجل لهذه الخدمة. يرجى المحاولة مرة أخرى."
                : "The number you entered doesn't match the registered number for this service. Please try again."
              }
            </DialogDescription>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" onClick={handleClose}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={() => { setStep("verify"); setPhoneInput(""); }}>
                {isRTL ? "حاول مرة أخرى" : "Try Again"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
