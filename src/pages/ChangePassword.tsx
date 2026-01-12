import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function ChangePassword() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordResult = passwordSchema.safeParse(formData.newPassword);
    if (!passwordResult.success) {
      toast({
        title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: isRTL ? "كلمات المرور غير متطابقة" : "Passwords don't match",
        description: isRTL ? "يرجى التأكد من تطابق كلمات المرور" : "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (authError) throw authError;

      // NOTE:
      // Some older builds used a profiles.must_change_password column.
      // Your DB does NOT have it, so we must not update it.
      // Password gating should be handled by Auth only (or add the column later if desired).

      await refreshProfile?.();

      toast({
        title: isRTL ? "تم تغيير كلمة المرور" : "Password changed",
        description: isRTL ? "تم تحديث كلمة المرور بنجاح" : "Your password has been updated successfully",
      });

      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: error?.message || (isRTL ? "حدث خطأ أثناء تغيير كلمة المرور" : "Error changing password"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">{isRTL ? "تغيير كلمة المرور" : "Change Password"}</CardTitle>
          <CardDescription>
            {isRTL ? "يرجى إنشاء كلمة مرور جديدة لحسابك" : "Please create a new password for your account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{isRTL ? "كلمة المرور الجديدة" : "New Password"}</Label>
              <div className="relative">
                <Lock
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                    isRTL ? "right-3" : "left-3",
                  )}
                />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  className={cn(isRTL ? "pr-10" : "pl-10")}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{isRTL ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
              <div className="relative">
                <Lock
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                    isRTL ? "right-3" : "left-3",
                  )}
                />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className={cn(isRTL ? "pr-10" : "pl-10")}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isRTL ? "تغيير كلمة المرور" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
