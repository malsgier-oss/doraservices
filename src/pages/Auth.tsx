import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Loader2, AlertCircle, Phone, MapPin } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { z } from "zod";
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";
import { useRegistrationEnabled } from "@/hooks/usePlatformSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isValidLibyanPhone } from "@/lib/phoneUtils";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

export default function Auth() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    signIn,
    signUp,
    loading: authLoading,
    profileLoading,
  } = useAuth();

  const { t, isRTL, language } = useLanguage();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const [isLoading, setIsLoading] = useState(false);
  const { isEnabled: registrationEnabled, isLoading: settingsLoading } =
    useRegistrationEnabled();

  const [loginData, setLoginData] = useState({ phone: "", password: "" });
  const [signupData, setSignupData] = useState({
    phone: "",
    password: "",
    fullName: "",
    cityId: "",
  });

  // ✅ Stable redirect: wait for profile to exist (AuthContext now ensures it)
  useEffect(() => {
    if (!user) return;

    // Wait while profile is being ensured/loaded
    if (profileLoading) return;

    // If still no profile after loading, do nothing (shouldn't happen often)
    if (!profile) return;

    if (profile.must_change_password) {
      navigate("/change-password");
      return;
    }

    if (!profile.is_verified) {
      navigate("/pending-verification");
      return;
    }

    navigate("/");
  }, [user, profile, profileLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.phone.trim()) {
      toast({
        title: isRTL ? "رقم الهاتف مطلوب" : "Phone required",
        description: isRTL
          ? "يرجى إدخال رقم الهاتف"
          : "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isValidLibyanPhone(loginData.phone)) {
      toast({
        title: isRTL ? "رقم هاتف غير صالح" : "Invalid phone",
        description: isRTL
          ? "يرجى إدخال رقم هاتف ليبي صحيح (09XXXXXXXX)"
          : "Please enter a valid Libyan phone number (09XXXXXXXX)",
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(loginData.password);
    if (!passwordResult.success) {
      toast({
        title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.phone, loginData.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: isRTL ? "فشل تسجيل الدخول" : "Login failed",
        description: isRTL
          ? "رقم الهاتف أو كلمة المرور غير صحيحة"
          : error.message || "Invalid phone or password",
        variant: "destructive",
      });
    } else {
      toast({
        title: isRTL ? "مرحباً بعودتك!" : "Welcome back!",
        description: isRTL
          ? "تم تسجيل الدخول بنجاح"
          : "You've successfully logged in.",
      });
      // Redirect handled by useEffect once profile arrives
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registrationEnabled) {
      toast({
        title: isRTL ? "التسجيل مغلق" : "Registration Disabled",
        description: isRTL
          ? "التسجيل مغلق حالياً. يرجى المحاولة لاحقاً."
          : "Registration is currently disabled. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    const nameResult = nameSchema.safeParse(signupData.fullName);
    if (!nameResult.success) {
      toast({
        title: isRTL ? "اسم غير صالح" : "Invalid name",
        description: nameResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!signupData.phone.trim()) {
      toast({
        title: isRTL ? "رقم الهاتف مطلوب" : "Phone required",
        description: isRTL
          ? "يرجى إدخال رقم الهاتف"
          : "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!isValidLibyanPhone(signupData.phone)) {
      toast({
        title: isRTL ? "رقم هاتف غير صالح" : "Invalid phone",
        description: isRTL
          ? "يرجى إدخال رقم هاتف ليبي (09XXXXXXXX)"
          : "Please enter a valid Libyan phone (09XXXXXXXX)",
        variant: "destructive",
      });
      return;
    }

    const passwordResult = passwordSchema.safeParse(signupData.password);
    if (!passwordResult.success) {
      toast({
        title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!signupData.cityId) {
      toast({
        title: isRTL ? "المدينة مطلوبة" : "City required",
        description: isRTL ? "يرجى اختيار مدينتك" : "Please select your city",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(
      signupData.phone,
      signupData.password,
      signupData.fullName,
      signupData.cityId
    );
    setIsLoading(false);

    if (error) {
      let message = error.message;

      if (message.toLowerCase().includes("already registered")) {
        message = isRTL
          ? "هذا الرقم مسجل بالفعل. يرجى تسجيل الدخول."
          : "This phone is already registered. Please sign in.";
      }

      // If email confirmation is enabled in Supabase, you might get "Email not confirmed"
      if (message.toLowerCase().includes("email not confirmed")) {
        message = isRTL
          ? "تم إنشاء الحساب، لكن لا يمكن تسجيل الدخول قبل التحقق. راجع الإعدادات أو قم بتعطيل تأكيد البريد في Supabase."
          : "Account created, but login is blocked until confirmation. Check Supabase auth settings (email confirmation).";
      }

      toast({
        title: isRTL ? "فشل إنشاء الحساب" : "Signup failed",
        description: message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isRTL ? "تم إنشاء الحساب!" : "Account created!",
      description: isRTL
        ? "تم إنشاء حسابك. إذا لم يتم تسجيل الدخول تلقائياً، حاول تسجيل الدخول الآن."
        : "Your account is created. If you weren’t logged in automatically, please try signing in now.",
    });

    // Your system uses admin verification flow
    navigate("/pending-verification");
  };

  // ✅ Include profileLoading in the global spinner so it doesn’t “flash”
  if (authLoading || profileLoading || settingsLoading || citiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Language Toggle */}
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img
          src={doraLogo}
          alt="Dora Logo"
          className="w-10 h-10 rounded-full object-cover"
        />
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
              <div
                className={cn(
                  "space-y-1 mb-6",
                  isRTL ? "text-right" : "text-left"
                )}
              >
                <CardTitle className="text-xl">
                  {isRTL ? "مرحباً بعودتك" : "Welcome back"}
                </CardTitle>
                <CardDescription>
                  {isRTL ? "أدخل رقم هاتفك وكلمة المرور" : "Enter your phone and password"}
                </CardDescription>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">
                    {isRTL ? "رقم الهاتف" : "Phone Number"}
                  </Label>
                  <div className="relative">
                    <Phone
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isRTL ? "right-3" : "left-3"
                      )}
                    />
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder="0912345678"
                      className={cn(isRTL ? "pr-10 text-left" : "pl-10")}
                      dir="ltr"
                      value={loginData.phone}
                      onChange={(e) =>
                        setLoginData({ ...loginData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isRTL ? "right-3" : "left-3"
                      )}
                    />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className={cn("text-sm", isRTL ? "text-right" : "text-left")}>
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    {t.auth.forgotPassword}
                  </Link>
                </div>

                <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.auth.login}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="mt-0">
              <div
                className={cn(
                  "space-y-1 mb-6",
                  isRTL ? "text-right" : "text-left"
                )}
              >
                <CardTitle className="text-xl">
                  {isRTL ? "إنشاء حساب" : "Create an account"}
                </CardTitle>
                <CardDescription>
                  {isRTL ? "انضم إلى دورة اليوم" : "Join Dora today"}
                </CardDescription>
              </div>

              {!registrationEnabled && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isRTL
                      ? "التسجيل مغلق حالياً. يرجى المحاولة لاحقاً."
                      : "Registration is currently disabled. Please try again later."}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t.auth.fullName}</Label>
                  <div className="relative">
                    <User
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isRTL ? "right-3" : "left-3"
                      )}
                    />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={isRTL ? "الاسم الكامل" : "Full Name"}
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={signupData.fullName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">
                    {isRTL ? "رقم الهاتف" : "Phone Number"}
                  </Label>
                  <div className="relative">
                    <Phone
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isRTL ? "right-3" : "left-3"
                      )}
                    />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="0912345678"
                      className={cn(isRTL ? "pr-10 text-left" : "pl-10")}
                      dir="ltr"
                      value={signupData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setSignupData({ ...signupData, phone: val });
                      }}
                      required
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground",
                        isRTL ? "right-3" : "left-3"
                      )}
                    />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className={cn(isRTL ? "pr-10" : "pl-10")}
                      value={signupData.password}
                      onChange={(e) =>
                        setSignupData({ ...signupData, password: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* City Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {isRTL ? "المدينة" : "City"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={signupData.cityId}
                    onValueChange={(value) =>
                      setSignupData({ ...signupData, cityId: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue
                        placeholder={isRTL ? "اختر مدينتك" : "Select your city"}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {cities?.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {language === "ar" && city.name_ar ? city.name_ar : city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={isLoading || !registrationEnabled}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t.auth.signup
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}