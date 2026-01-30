import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import doraLogo from "@/assets/dora-logo.png";

export default function PendingConfirmation() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { user, profile, loading, profileLoading } = useAuth();

  useEffect(() => {
    // If not logged in, redirect to auth
    if (!loading && !profileLoading && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    // If verified, redirect to home
    if (profile && profile.is_verified === true) {
      navigate("/", { replace: true });
      return;
    }
  }, [user, profile, loading, profileLoading, navigate]);

  // Don't auto-redirect anymore - user must wait for admin verification
  // The page will stay until admin verifies them

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
            {isRTL ? "في انتظار التحقق من الحساب" : "Account Pending Verification"}
          </CardTitle>
          <CardDescription className="mt-2">
            {isRTL 
              ? "تم استلام طلب التسجيل. يرجى الانتظار حتى يقوم المسؤول بالتحقق من حسابك. سيتم إشعارك عند الموافقة على حسابك." 
              : "Your registration request has been received. Please wait for an admin to verify your account. You will be notified once your account is approved."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            {isRTL 
              ? "لا يمكنك تسجيل الدخول حتى يتم التحقق من حسابك من قبل المسؤول." 
              : "You cannot sign in until your account is verified by an admin."}
          </div>

          <Button className="w-full rounded-full" onClick={() => navigate("/auth", { replace: true })}>
            {isRTL ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
