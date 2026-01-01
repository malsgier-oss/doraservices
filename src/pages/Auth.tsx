import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, User, Loader2, Briefcase, AlertCircle } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { z } from "zod";
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";
import { useRegistrationEnabled } from "@/hooks/usePlatformSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { isEnabled: registrationEnabled, isLoading: settingsLoading } = useRegistrationEnabled();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", fullName: "", isBusiness: false });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(loginData.email);
    if (!emailResult.success) {
      toast({ title: isRTL ? "بريد إلكتروني غير صالح" : "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(loginData.password);
    if (!passwordResult.success) {
      toast({ title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password", description: passwordResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (message.includes("Invalid login credentials")) {
        message = isRTL ? "البريد أو كلمة المرور غير صحيحة" : "Invalid email or password";
      }
      toast({ title: isRTL ? "فشل تسجيل الدخول" : "Login failed", description: message, variant: "destructive" });
    } else {
      toast({ title: isRTL ? "مرحباً بعودتك!" : "Welcome back!", description: isRTL ? "تم تسجيل الدخول بنجاح" : "You've successfully logged in." });
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if registration is enabled
    if (!registrationEnabled) {
      toast({ 
        title: isRTL ? "التسجيل مغلق" : "Registration Disabled", 
        description: isRTL ? "التسجيل مغلق حالياً. يرجى المحاولة لاحقاً." : "Registration is currently disabled. Please try again later.", 
        variant: "destructive" 
      });
      return;
    }
    
    const nameResult = nameSchema.safeParse(signupData.fullName);
    if (!nameResult.success) {
      toast({ title: isRTL ? "اسم غير صالح" : "Invalid name", description: nameResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const emailResult = emailSchema.safeParse(signupData.email);
    if (!emailResult.success) {
      toast({ title: isRTL ? "بريد إلكتروني غير صالح" : "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(signupData.password);
    if (!passwordResult.success) {
      toast({ title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password", description: passwordResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);

    if (error) {
      setIsLoading(false);
      let message = error.message;
      if (message.includes("already registered")) {
        message = isRTL ? "هذا البريد مسجل بالفعل" : "This email is already registered.";
      }
      toast({ title: isRTL ? "فشل إنشاء الحساب" : "Signup failed", description: message, variant: "destructive" });
      return;
    }

    if (signupData.isBusiness) {
      let attempts = 0;
      let user = null;
      
      while (attempts < 5 && !user) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data } = await supabase.auth.getUser();
        user = data.user;
        attempts++;
      }
      
      if (user) {
        await supabase.from("user_roles").insert({ user_id: user.id, role: "business" });
      }
    }

    setIsLoading(false);
    toast({ 
      title: isRTL ? "تم إنشاء الحساب!" : "Account created!", 
      description: signupData.isBusiness 
        ? (isRTL ? "مرحباً! أضف خدماتك الآن" : "Welcome! Add your services now")
        : (isRTL ? "مرحباً بك في دورة!" : "Welcome to Dora!") 
    });
    navigate(signupData.isBusiness ? "/create-service" : "/");
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Language Toggle */}
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img src={doraLogo} alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" />
        <span className="text-2xl font-bold text-foreground">{t.appName}</span>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader className="pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="signup">{t.auth.signup}</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-4">
            {/* Login Tab */}
            <TabsContent value="login" className="mt-0">
              <div className={cn("space-y-1 mb-6", isRTL ? "text-right" : "text-left")}>
                <CardTitle className="text-xl">{isRTL ? "مرحباً بعودتك" : "Welcome back"}</CardTitle>
                <CardDescription>{isRTL ? "أدخل بياناتك للدخول" : "Enter your credentials to access your account"}</CardDescription>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.auth.login}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="mt-0">
              <div className={cn("space-y-1 mb-6", isRTL ? "text-right" : "text-left")}>
                <CardTitle className="text-xl">{isRTL ? "إنشاء حساب" : "Create an account"}</CardTitle>
                <CardDescription>{isRTL ? "انضم إلى دورة اليوم" : "Join Dora today"}</CardDescription>
              </div>

              {/* Registration Disabled Alert */}
              {!registrationEnabled && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isRTL ? "التسجيل مغلق حالياً. يرجى المحاولة لاحقاً." : "Registration is currently disabled. Please try again later."}
                  </AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t.auth.fullName}</Label>
                  <div className="relative">
                    <User className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={isRTL ? "الاسم الكامل" : "John Doe"}
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Business Toggle */}
                <div className={cn("flex items-center gap-3 p-4 rounded-xl bg-muted border border-border", isRTL ? "flex-row-reverse" : "")}>
                  <Checkbox
                    id="is-business"
                    checked={signupData.isBusiness}
                    onCheckedChange={(checked) => 
                      setSignupData({ ...signupData, isBusiness: checked === true })
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="is-business" className="flex items-center gap-2 cursor-pointer">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">{t.profile.becomeProvider}</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL ? "أضف خدماتك واستقبل الطلبات" : "Add your services and receive requests"}
                    </p>
                  </div>
                </div>
                
                <Button type="submit" className="w-full rounded-full" disabled={isLoading || !registrationEnabled}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.auth.signup}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
