import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import doraLogo from "@/assets/dora-logo.png";

export default function PendingConfirmation() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  useEffect(() => {
    const t = setTimeout(() => {
      navigate("/", { replace: true });
    }, 8000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      <div className="flex items-center gap-2 mb-8">
        <img src={doraLogo} alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-2xl font-bold text-foreground">Dora</span>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {isRTL ? "تم استلام طلب التسجيل" : "Signup received"}
          </CardTitle>
          <CardDescription className="mt-2">
            {isRTL ? "سنتواصل معك قريباً لتأكيد الحساب." : "We will contact you soon to confirm."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            {isRTL ? "سيتم تحويلك إلى الصفحة الرئيسية خلال ثوانٍ." : "You’ll be redirected to the Hub in a few seconds."}
          </div>

          <Button className="w-full rounded-full" onClick={() => navigate("/", { replace: true })}>
            {isRTL ? "الذهاب إلى الصفحة الرئيسية" : "Go to Hub"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

