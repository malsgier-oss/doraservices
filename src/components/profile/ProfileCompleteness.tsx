import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Phone, 
  FileText, 
  Image as ImageIcon, 
  MapPin, 
  Briefcase,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileCompletenessProps {
  profile: {
    full_name?: string | null;
    phone?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    city?: string | null;
  } | null;
  hasServices: boolean;
  className?: string;
}

interface CompletenessCheck {
  key: string;
  label: string;
  labelAr: string;
  weight: number;
  icon: typeof User;
}

const checks: CompletenessCheck[] = [
  { key: 'full_name', label: 'Full Name', labelAr: 'الاسم الكامل', weight: 20, icon: User },
  { key: 'phone', label: 'Phone Number', labelAr: 'رقم الهاتف', weight: 25, icon: Phone },
  { key: 'bio', label: 'Bio', labelAr: 'نبذة', weight: 15, icon: FileText },
  { key: 'avatar_url', label: 'Profile Photo', labelAr: 'صورة شخصية', weight: 15, icon: ImageIcon },
  { key: 'city', label: 'City', labelAr: 'المدينة', weight: 15, icon: MapPin },
];

export function calculateProfileCompleteness(
  profile: ProfileCompletenessProps['profile'], 
  hasServices: boolean
): { percentage: number; missing: CompletenessCheck[]; completed: CompletenessCheck[] } {
  if (!profile) return { percentage: 0, missing: checks, completed: [] };

  let percentage = 0;
  const missing: CompletenessCheck[] = [];
  const completed: CompletenessCheck[] = [];

  checks.forEach(check => {
    const value = profile[check.key as keyof typeof profile];
    if (value && String(value).trim()) {
      percentage += check.weight;
      completed.push(check);
    } else {
      missing.push(check);
    }
  });

  // Service bonus
  const serviceCheck: CompletenessCheck = { 
    key: 'service', 
    label: 'At least 1 service', 
    labelAr: 'خدمة واحدة على الأقل',
    weight: 10, 
    icon: Briefcase 
  };
  
  if (hasServices) {
    percentage += 10;
    completed.push(serviceCheck);
  } else {
    missing.push(serviceCheck);
  }

  return { percentage: Math.min(100, percentage), missing, completed };
}

export function ProfileCompleteness({ profile, hasServices, className }: ProfileCompletenessProps) {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { percentage, missing, completed } = calculateProfileCompleteness(profile, hasServices);

  if (percentage === 100) {
    return (
      <div className={cn("bg-green-50 border border-green-200 rounded-2xl p-4", className)}>
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">
            {isRTL ? "ملفك الشخصي مكتمل! 🎉" : "Your profile is complete! 🎉"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-2xl p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {isRTL ? "اكتمال الملف الشخصي" : "Profile Completeness"}
        </span>
        <span className={cn(
          "text-sm font-bold",
          percentage >= 80 ? "text-green-600" : percentage >= 50 ? "text-orange-500" : "text-red-500"
        )}>
          {percentage}%
        </span>
      </div>
      
      <Progress value={percentage} className="h-2 mb-4" />
      
      {/* Missing items */}
      {missing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isRTL ? "أضف لتحسين ظهورك:" : "Add to improve your visibility:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.slice(0, 3).map(item => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.key}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => {
                    if (item.key === 'service') {
                      navigate("/create-service");
                    } else {
                      // Trigger edit mode - scroll to top
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {isRTL ? item.labelAr : item.label}
                </Button>
              );
            })}
            {missing.length > 3 && (
              <span className="text-xs text-muted-foreground self-center">
                +{missing.length - 3} {isRTL ? "أخرى" : "more"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
