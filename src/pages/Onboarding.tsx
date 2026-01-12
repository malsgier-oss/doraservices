import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LanguageToggle } from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import { Briefcase, PhoneCall, Search, ShieldCheck } from "lucide-react";
import doraLogo from "@/assets/dora-logo.png";
const ONBOARDING_DONE_KEY = "dora_onboarding_v1_done";
const ONBOARDING_INTENT_KEY = "dora_onboarding_intent"; // "user" | "provider"

type Intent = "user" | "provider";
export default function Onboarding() {
  const navigate = useNavigate();
  const {
    isRTL
  } = useLanguage();
  const {
    user
  } = useAuth();
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<Intent>("user");
  const steps = useMemo(() => [{
    icon: Search,
    title: isRTL ? "اكتشف خدمات قريبة منك" : "Find services near you",
    description: isRTL ? "ابحث حسب الفئة والمدينة — كهرباء، سباكة، تكييف…" : "Browse by category and city — electrician, plumbing, AC…"
  }, {
    icon: PhoneCall,
    title: isRTL ? "اتصل مباشرة" : "Call instantly",
    description: isRTL ? "لا حجوزات ولا تعقيد — افتح الخدمة واضغط اتصال." : "No booking friction — open a service and tap call."
  }, {
    icon: ShieldCheck,
    title: isRTL ? "اختر استخدامك" : "Choose your path",
    description: isRTL ? "هل تبحث عن خدمة أم تقدم خدمات؟" : "Are you looking for a service, or providing services?",
    isChoice: true as const
  }], [isRTL]);
  const current = steps[step];
  const Icon = current.icon;
  const markDoneAndGo = (selectedIntent?: Intent) => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, "1");
      localStorage.setItem(ONBOARDING_INTENT_KEY, selectedIntent || intent);
    } catch {
      // ignore
    }

    // App-first behavior:
    // - If logged in, send to Hub or Profile depending on intent.
    // - If not logged in and provider intent, send to auth (signup tab).
    const chosen = selectedIntent || intent;
    if (chosen === "provider") {
      if (user) {
        navigate("/profile?welcome=1", {
          replace: true
        });
      } else {
        navigate("/auth?tab=signup&intent=provider", {
          replace: true
        });
      }
      return;
    }
    navigate("/", {
      replace: true
    });
  };
  const handleSkip = () => markDoneAndGo("user");
  const handleNext = () => {
    if (step >= steps.length - 1) {
      markDoneAndGo();
      return;
    }
    setStep(s => Math.min(steps.length - 1, s + 1));
  };
  return <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <img alt="Dora" className="w-9 h-9 rounded-2xl object-cover" src="/lovable-uploads/27645179-4f96-4086-b8f0-29b8a75525e8.png" />
          <div className="leading-tight">
            <div className="font-semibold text-base">Dora</div>
            <div className="text-xs text-muted-foreground">dora.ly</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {isRTL ? "تخطي" : "Skip"}
          </Button>
        </div>
      </div>

      <div className="px-5 pt-4">
        <Progress value={(step + 1) / steps.length * 100} />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <Card className="w-full max-w-md rounded-3xl shadow-card border-border/60">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-8 w-8 text-primary" />
              </div>

              <div>
                <div className="text-xl font-bold">{current.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{current.description}</div>
              </div>

              {"isChoice" in current && current.isChoice ? <div className="w-full grid gap-3 mt-2">
                  <button type="button" onClick={() => setIntent("user")} className={cn("w-full rounded-2xl border px-4 py-4 text-left transition", intent === "user" ? "border-primary bg-primary/5" : "border-border bg-background")}>
                    <div className="flex items-center gap-3">
                      <Search className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">{isRTL ? "أبحث عن خدمة" : "I need a service"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? "تصفح واتصل مباشرة" : "Browse and call providers"}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button type="button" onClick={() => setIntent("provider")} className={cn("w-full rounded-2xl border px-4 py-4 text-left transition", intent === "provider" ? "border-primary bg-primary/5" : "border-border bg-background")}>
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">{isRTL ? "أقدم خدمات" : "I provide services"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? "أنشئ خدماتك واستقبل العملاء" : "Create listings and get calls"}
                        </div>
                      </div>
                    </div>
                  </button>
                </div> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-5 pb-7">
        <Button onClick={handleNext} className="w-full h-12 rounded-2xl text-base">
          {step >= steps.length - 1 ? isRTL ? "ابدأ" : "Get started" : isRTL ? "التالي" : "Next"}
        </Button>
      </div>
    </div>;
}
export { ONBOARDING_DONE_KEY, ONBOARDING_INTENT_KEY };