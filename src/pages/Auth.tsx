import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCities } from "@/hooks/useCities";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import doraLogo from "@/assets/dora-logo.png";
import { cleanPhoneForStorage, isValidLibyanPhone } from "@/lib/phoneUtils";

type TabKey = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { requestOtp, verifyOtp, updateProfileBasics } = useAuth();
  const { data: cities = [], isLoading: citiesLoading } = useCities();

  const redirectTo = useMemo(() => {
    const state = location.state as any;
    return state?.from?.pathname || "/";
  }, [location.state]);

  const [tab, setTab] = useState<TabKey>("signin");

  // Sign in
  const [inPhone, setInPhone] = useState("");
  const [inCode, setInCode] = useState("");
  const [inStep, setInStep] = useState<"phone" | "code">("phone");

  // Sign up
  const [upName, setUpName] = useState("");
  const [upPhone, setUpPhone] = useState("");
  const [upCityId, setUpCityId] = useState<string>("");
  const [upCode, setUpCode] = useState("");
  const [upStep, setUpStep] = useState<"details" | "code">("details");

  const [busy, setBusy] = useState(false);

  const getCityName = (cityId: string) => {
    const found = cities.find((c: any) => String(c.id) === String(cityId));
    // Support both Arabic/English labels if present
    return (language === "ar" ? found?.name_ar : found?.name_en) || found?.name || "";
  };

  const validatePhone = (phone: string) => {
    const cleaned = cleanPhoneForStorage(phone);
    if (!isValidLibyanPhone(cleaned)) return { ok: false, cleaned };
    return { ok: true, cleaned };
  };

  const handleSendSignInCode = async () => {
    const v = validatePhone(inPhone);
    if (!v.ok) {
      toast({ title: "Invalid phone", description: "Use format 09XXXXXXXX", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { error } = await requestOtp(v.cleaned);
    setBusy(false);

    if (error) {
      toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Code sent", description: "Check SMS for your Dora code." });
    setInStep("code");
  };

  const handleVerifySignIn = async () => {
    const v = validatePhone(inPhone);
    if (!v.ok) {
      toast({ title: "Invalid phone", description: "Use format 09XXXXXXXX", variant: "destructive" });
      return;
    }
    if (!inCode.trim()) {
      toast({ title: "Enter the code", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { error } = await verifyOtp(v.cleaned, inCode.trim());
    setBusy(false);

    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleSendSignUpCode = async () => {
    const v = validatePhone(upPhone);
    if (!v.ok) {
      toast({ title: "Invalid phone", description: "Use format 09XXXXXXXX", variant: "destructive" });
      return;
    }
    if (!upName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (!upCityId) {
      toast({ title: "City required", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { error } = await requestOtp(v.cleaned);
    setBusy(false);

    if (error) {
      toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Code sent", description: "Check SMS for your Dora code." });
    setUpStep("code");
  };

  const handleVerifySignUp = async () => {
    const v = validatePhone(upPhone);
    if (!v.ok) {
      toast({ title: "Invalid phone", description: "Use format 09XXXXXXXX", variant: "destructive" });
      return;
    }
    if (!upCode.trim()) {
      toast({ title: "Enter the code", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { error } = await verifyOtp(v.cleaned, upCode.trim());
    if (error) {
      setBusy(false);
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return;
    }

    // Fill profile basics right after the first successful verification
    const cityName = getCityName(upCityId);
    const { error: profileErr } = await updateProfileBasics({
      fullName: upName.trim(),
      phone: v.cleaned,
      cityId: upCityId,
      cityName,
      // For general users, ensure provider_status is not set here.
    });
    setBusy(false);

    if (profileErr) {
      // Session exists, but profile couldn't be updated. Let user proceed.
      toast({ title: "Signed up", description: "Account created, but profile update failed." });
    } else {
      toast({ title: "Signed up", description: "Welcome to Dora!" });
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={doraLogo} alt="Dora" className="h-9 w-9 rounded-xl" />
            <div className="font-semibold text-lg">Dora</div>
          </div>
          <LanguageToggle />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tab === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>
              {tab === "signin"
                ? "Sign in with your phone via SMS code."
                : "Sign up with your phone. We'll verify by SMS code."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-phone">Phone</Label>
                  <Input
                    id="signin-phone"
                    placeholder="09XXXXXXXX"
                    value={inPhone}
                    onChange={(e) => setInPhone(e.target.value)}
                    disabled={busy || inStep === "code"}
                    inputMode="tel"
                  />
                </div>

                {inStep === "code" && (
                  <div className="space-y-2">
                    <Label htmlFor="signin-code">Code</Label>
                    <Input
                      id="signin-code"
                      placeholder="123456"
                      value={inCode}
                      onChange={(e) => setInCode(e.target.value)}
                      disabled={busy}
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      className="text-sm underline opacity-80"
                      onClick={() => {
                        setInStep("phone");
                        setInCode("");
                      }}
                      disabled={busy}
                    >
                      Change phone
                    </button>
                  </div>
                )}

                {inStep === "phone" ? (
                  <Button className="w-full" onClick={handleSendSignInCode} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleVerifySignIn} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="signup" className="mt-4 space-y-4">
                {upStep === "details" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input
                        id="signup-name"
                        placeholder="Your name"
                        value={upName}
                        onChange={(e) => setUpName(e.target.value)}
                        disabled={busy}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-phone">Phone</Label>
                      <Input
                        id="signup-phone"
                        placeholder="09XXXXXXXX"
                        value={upPhone}
                        onChange={(e) => setUpPhone(e.target.value)}
                        disabled={busy}
                        inputMode="tel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>City</Label>
                      <Select value={upCityId} onValueChange={setUpCityId} disabled={busy || citiesLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={citiesLoading ? "Loading..." : "Select city"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {(language === "ar" ? c.name_ar : c.name_en) || c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" onClick={handleSendSignUpCode} disabled={busy || citiesLoading}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signup-code">Code</Label>
                      <Input
                        id="signup-code"
                        placeholder="123456"
                        value={upCode}
                        onChange={(e) => setUpCode(e.target.value)}
                        disabled={busy}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="text-sm underline opacity-80"
                        onClick={() => {
                          setUpStep("details");
                          setUpCode("");
                        }}
                        disabled={busy}
                      >
                        Back
                      </button>
                    </div>

                    <Button className="w-full" onClick={handleVerifySignUp} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & create account"}
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
