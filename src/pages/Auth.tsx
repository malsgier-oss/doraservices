import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCities } from "@/hooks/useCities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Loader2, AlertCircle, Phone, MapPin } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { z } from "zod";
import { cn } from "@/lib/utils";
import doraLogo from "@/assets/dora-logo.png";
import { useRegistrationEnabled } from "@/hooks/usePlatformSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isValidLibyanPhone, cleanPhoneForStorage } from "@/lib/phoneUtils";
import { MobileNav } from "@/components/layout/MobileNav";
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");
export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    profile,
    signIn,
    signUp,
    loading: authLoading,
    profileLoading
  } = useAuth();
  const {
    t,
    isRTL,
    language
  } = useLanguage();
  const {
    data: cities,
    isLoading: citiesLoading
  } = useCities();
  const {
    isEnabled: registrationEnabled,
    isLoading: settingsLoading
  } = useRegistrationEnabled();
  const [isLoading, setIsLoading] = useState(false);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialTab = (query.get("tab") || "login").toLowerCase();
  const [tab, setTab] = useState<"login" | "signup">(initialTab === "signup" ? "signup" : "login");
  const initialIntent = (query.get("intent") || "").toLowerCase();
  const [isProviderSignup, setIsProviderSignup] = useState(initialIntent === "provider");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Keep tab in sync with URL changes (e.g., onboarding intent opens signup)
  useEffect(() => {
    const t = (query.get("tab") || "login").toLowerCase();
    setTab(t === "signup" ? "signup" : "login");
  }, [query]);
  // Keep provider toggle in sync with URL intent changes.
  useEffect(() => {
    const intent = (query.get("intent") || "").toLowerCase();
    setIsProviderSignup(intent === "provider");
    setAgreedToTerms(false);
  }, [query]);
  const [loginData, setLoginData] = useState({
    phone: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    phone: "",
    password: "",
    fullName: "",
    cityId: ""
  });

  // Dora P0 (Libya): we operate in Tripoli only for now.
  // Auto-select Tripoli on signup when cities are available.
  useEffect(() => {
    if (!cities || cities.length === 0) return;
    if (signupData.cityId) return;

    const tripoli =
      cities.find(c => (c.name || "").toLowerCase() === "tripoli") ||
      cities.find(c => (c.name_ar || "").trim() === "طرابلس") ||
      cities.find(c => (c.name || "").toLowerCase().includes("tripoli")) ||
      cities.find(c => (c.name_ar || "").includes("طرابلس")) ||
      null;

    if (tripoli?.id) {
      setSignupData(prev => ({
        ...prev,
        cityId: tripoli.id
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  // If already logged in, route them appropriately
  useEffect(() => {
    if (!user) return;
    if (profileLoading) return;
    if (!profile) return;

    navigate("/", {
      replace: true
    });
  }, [user, profile, profileLoading, navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = cleanPhoneForStorage(loginData.phone);
    if (!cleanedPhone) {
      toast({
        title: isRTL ? "رقم الهاتف مطلوب" : "Phone required",
        description: isRTL ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number",
        variant: "destructive"
      });
      return;
    }
    if (!isValidLibyanPhone(cleanedPhone)) {
      toast({
        title: isRTL ? "رقم هاتف غير صالح" : "Invalid phone",
        description: isRTL ? "يرجى إدخال رقم هاتف ليبي صحيح (09XXXXXXXX)" : "Please enter a valid Libyan phone number (09XXXXXXXX)",
        variant: "destructive"
      });
      return;
    }
    const passwordResult = passwordSchema.safeParse(loginData.password);
    if (!passwordResult.success) {
      toast({
        title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signIn(cleanedPhone, loginData.password);
    setIsLoading(false);
    if (error) {
      toast({
        title: isRTL ? "فشل تسجيل الدخول" : "Login failed",
        description: isRTL ? "رقم الهاتف أو كلمة المرور غير صحيحة" : error.message,
        variant: "destructive"
      });
      return;
    }
    toast({
      title: isRTL ? "مرحباً بعودتك!" : "Welcome back!",
      description: isRTL ? "تم تسجيل الدخول بنجاح" : "You've successfully logged in."
    });

    // Navigation handled by the useEffect once profile loads
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast({
        title: isRTL ? "اسم غير صالح" : "Invalid name",
        description: nameResult.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    const cleanedPhone = cleanPhoneForStorage(signupData.phone);
    if (!cleanedPhone) {
      toast({
        title: isRTL ? "رقم الهاتف مطلوب" : "Phone required",
        description: isRTL ? "يرجى إدخال رقم الهاتف" : "Please enter your phone number",
        variant: "destructive"
      });
      return;
    }
    if (!isValidLibyanPhone(cleanedPhone)) {
      toast({
        title: isRTL ? "رقم هاتف غير صالح" : "Invalid phone",
        description: isRTL ? "يرجى إدخال رقم هاتف ليبي (09XXXXXXXX)" : "Please enter a valid Libyan phone (09XXXXXXXX)",
        variant: "destructive"
      });
      return;
    }
    const passwordResult = passwordSchema.safeParse(signupData.password);
    if (!passwordResult.success) {
      toast({
        title: isRTL ? "كلمة مرور غير صالحة" : "Invalid password",
        description: passwordResult.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }
    if (!signupData.cityId) {
      toast({
        title: isRTL ? "المدينة مطلوبة" : "City required",
        description: isRTL ? "يرجى اختيار مدينتك" : "Please select your city",
        variant: "destructive"
      });
      return;
    }
    if (isProviderSignup && !agreedToTerms) {
      toast({
        title: isRTL ? "موافقة مطلوبة" : "Agreement required",
        description: isRTL ? "يرجى الموافقة على شروط الاستخدام للمتابعة." : "Please agree to the Terms of Use to continue.",
        variant: "destructive"
      });
      return;
    }
    const selectedCity = cities?.find(c => c.id === signupData.cityId);
    const cityName = language === "ar" ? selectedCity?.name_ar || selectedCity?.name || "" : selectedCity?.name || selectedCity?.name_ar || "";
    setIsLoading(true);
    const {
      error
    } = await signUp(cleanedPhone, signupData.password, signupData.fullName, signupData.cityId, cityName, isProviderSignup ? "provider" : "user");
    setIsLoading(false);
    if (error) {
      const lower = error.message.toLowerCase();
      let message = error.message;
      if (lower.includes("already registered") || lower.includes("user already registered")) {
        message = isRTL ? "هذا الرقم مسجل بالفعل. يرجى تسجيل الدخول." : "This phone is already registered. Please sign in.";
      }
      toast({
        title: isRTL ? "فشل إنشاء الحساب" : "Signup failed",
        description: message,
        variant: "destructive"
      });
      return;
    }
    toast({
      title: isRTL ? "تم إنشاء الحساب!" : "Account created!",
      description: isRTL ? "سنتواصل معك قريباً لتأكيد الحساب." : "We will contact you soon to confirm."
    });
    navigate("/pending-confirmation", { replace: true });
  };
  if (authLoading || profileLoading || settingsLoading || citiesLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-4 left-4">
        <LanguageToggle />
      </div>

      <div className="flex items-center gap-2 mb-8">
        <img alt="Dora Logo" className="w-10 h-10 rounded-full object-cover" src="/lovable-uploads/ef9f88ab-853c-4896-b495-4d8c567ed68a.png" />
        <span className="text-2xl font-bold text-foreground">{t.appName}</span>
      </div>

      <Card className="w-full max-w-md shadow-card rounded-3xl">
        <Tabs value={tab} onValueChange={v => setTab(v === "signup" ? "signup" : "login")} className="w-full">
          <CardHeader className="pb-2">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-muted">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="signup">{t.auth.signup}</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            <TabsContent value="login" className="mt-0">
              <div className={cn("space-y-1 mb-6", isRTL ? "text-right" : "text-left")}>
                <CardTitle className="text-xl">{isRTL ? "مرحباً بعودتك" : "Welcome back"}</CardTitle>
                <CardDescription>
                  {isRTL ? "أدخل رقم هاتفك وكلمة المرور" : "Enter your phone and password"}
                </CardDescription>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-phone">{isRTL ? "رقم الهاتف" : "Phone Number"}</Label>
                  <div className="relative">
                    <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input id="login-phone" type="tel" inputMode="numeric" placeholder="0912345678" className={cn("h-12 rounded-2xl", isRTL ? "pr-10 text-left" : "pl-10")} dir="ltr" value={loginData.phone} onChange={e => setLoginData({
                    ...loginData,
                    phone: e.target.value
                  })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input id="login-password" type="password" placeholder="••••••••" className={cn("h-12 rounded-2xl", isRTL ? "pr-10" : "pl-10")} value={loginData.password} onChange={e => setLoginData({
                    ...loginData,
                    password: e.target.value
                  })} required />
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

            <TabsContent value="signup" className="mt-0">
              <div className={cn("space-y-1 mb-6", isRTL ? "text-right" : "text-left")}>
                <CardTitle className="text-xl">{isRTL ? "إنشاء حساب" : "Create an account"}</CardTitle>
                <CardDescription>{isRTL ? "انضم إلى دورة اليوم" : "Join Dora today"}</CardDescription>
              </div>

              {!registrationEnabled && <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isRTL ? "التسجيل مغلق حالياً. يرجى المحاولة لاحقاً." : "Registration is currently disabled. Please try again later."}
                  </AlertDescription>
                </Alert>}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3">
                  <div className={cn("space-y-0.5", isRTL ? "text-right" : "text-left")}>
                    <div className="font-medium">{isRTL ? "حساب مزود خدمة" : "Provider account"}</div>
                    <div className="text-xs text-muted-foreground">
                      {isRTL ? "فعّل هذا إذا كنت تقدم خدمات" : "Enable this if you provide services"}
                    </div>
                  </div>
                  <Switch
                    checked={isProviderSignup}
                    onCheckedChange={(v) => {
                      setIsProviderSignup(v);
                      if (!v) setAgreedToTerms(false);
                    }}
                    aria-label={isRTL ? "تفعيل حساب مزود خدمة" : "Enable provider account"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t.auth.fullName}</Label>
                  <div className="relative">
                    <User className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input id="signup-name" type="text" placeholder={isRTL ? "الاسم الكامل" : "Full Name"} className={cn("h-12 rounded-2xl", isRTL ? "pr-10" : "pl-10")} value={signupData.fullName} onChange={e => setSignupData({
                    ...signupData,
                    fullName: e.target.value
                  })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{isRTL ? "رقم الهاتف" : "Phone Number"}</Label>
                  <div className="relative">
                    <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input id="signup-phone" type="tel" inputMode="numeric" placeholder="0912345678" className={cn("h-12 rounded-2xl", isRTL ? "pr-10 text-left" : "pl-10")} dir="ltr" value={signupData.phone} onChange={e => {
                    const val = e.target.value.replace(/[^\d+]/g, "").slice(0, 20);
                    setSignupData({
                      ...signupData,
                      phone: val
                    });
                  }} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <div className="relative">
                    <Lock className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                    <Input id="signup-password" type="password" placeholder="••••••••" className={cn("h-12 rounded-2xl", isRTL ? "pr-10" : "pl-10")} value={signupData.password} onChange={e => setSignupData({
                    ...signupData,
                    password: e.target.value
                  })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {isRTL ? "المدينة" : "City"} <span className="text-destructive">*</span>
                  </Label>

                  <Select value={signupData.cityId} onValueChange={value => setSignupData({
                  ...signupData,
                  cityId: value
                })}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder={isRTL ? "اختر مدينتك" : "Select your city"} />
                    </SelectTrigger>

                    <SelectContent position="popper" sideOffset={8} avoidCollisions className="z-[9999] bg-popover border border-border shadow-lg">
                      {cities?.map(city => <SelectItem key={city.id} value={city.id}>
                          {language === "ar" && city.name_ar ? city.name_ar : city.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "عذراً، نحن نعمل في طرابلس فقط حالياً." : "Sorry, we are operating in Tripoli only at the moment."}
                  </p>
                </div>

                {isProviderSignup && (
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <Checkbox
                      id="provider-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(v) => setAgreedToTerms(Boolean(v))}
                      className="mt-1"
                    />
                    <Label htmlFor="provider-terms" className={cn("text-sm leading-5", isRTL ? "text-right" : "text-left")}>
                      {isRTL ? (
                        <>
                          أوافق على{" "}
                          <Link to="/terms" className="text-primary hover:underline">
                            شروط الاستخدام
                          </Link>
                          .
                        </>
                      ) : (
                        <>
                          I agree to the{" "}
                          <Link to="/terms" className="text-primary hover:underline">
                            Terms of Use
                          </Link>
                          .
                        </>
                      )}
                    </Label>
                  </div>
                )}

                <Button type="submit" className="w-full rounded-full" disabled={isLoading || !registrationEnabled}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.auth.signup}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      <MobileNav />
    </div>;
}
