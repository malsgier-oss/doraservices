import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Phone, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";
import { normalizePhone, isValidLibyanPhone } from "@/lib/phoneUtils";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast({
        title: isRTL ? "رقم الهاتف مطلوب" : "Phone required",
        description: isRTL ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isValidLibyanPhone(phone)) {
      toast({
        title: isRTL ? "رقم هاتف غير صالح" : "Invalid phone",
        description: isRTL ? "يرجى إدخال رقم هاتف ليبي صحيح" : "Please enter a valid Libyan phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhone(phone);

      // Look up profile to get user_id and city_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, city_id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      // Create password reset request
      const { error } = await supabase
        .from("password_reset_requests")
        .insert({
          phone: normalizedPhone,
          user_id: profile?.user_id || null,
          city_id: profile?.city_id || null,
          status: "pending",
        });

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error("Error creating reset request:", error);
      // Show success message anyway to not leak whether phone exists
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="absolute top-4 left-4">
          <LanguageToggle />
        </div>

        <div className="flex items-center gap-2 mb-8">
          <img src={doraLogo} alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" />
          <span className="text-2xl font-bold text-foreground">{t.appName}</span>
        </div>

        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">
              {isRTL ? "تم إرسال الطلب" : "Request Submitted"}
            </CardTitle>
            <CardDescription className="mt-2">
              {isRTL 
                ? "إذا كان هذا الرقم مسجلاً، سنتواصل معك قريباً لإعادة تعيين كلمة المرور."
                : "If this number is registered, we will contact you soon to reset your password."
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button 
              className="w-full rounded-full"
              onClick={() => navigate("/auth")}
            >
              {isRTL ? "العودة لتسجيل الدخول" : "Back to Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      <div className="flex items-center gap-2 mb-8">
        <img src={doraLogo} alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-2xl font-bold text-foreground">{t.appName}</span>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader>
          <Link 
            to="/auth" 
            className={cn(
              "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4",
              isRTL && "flex-row-reverse"
            )}
          >
            <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
            {isRTL ? "العودة" : "Back"}
          </Link>
          <CardTitle className="text-xl">
            {isRTL ? "نسيت كلمة المرور؟" : "Forgot Password?"}
          </CardTitle>
          <CardDescription>
            {isRTL 
              ? "أدخل رقم هاتفك وسنتواصل معك لإعادة تعيين كلمة المرور"
              : "Enter your phone number and we'll contact you to reset your password"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{isRTL ? "رقم الهاتف" : "Phone Number"}</Label>
              <div className="relative">
                <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0912345678"
                  className={cn(isRTL ? "pr-10 text-left" : "pl-10")}
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? "إرسال الطلب" : "Submit Request")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
