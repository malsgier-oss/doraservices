import { memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onBrowseClick?: () => void;
  onCreateClick?: () => void;
  featuredTitle?: string;
  featuredDescription?: string;
  className?: string;
}

const HeroSectionContent = ({
  onBrowseClick,
  onCreateClick,
  featuredTitle,
  featuredDescription,
  className,
}: HeroSectionProps) => {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden relative",
        "bg-gradient-to-br from-primary/15 via-primary/8 to-transparent",
        "border border-primary/20",
        "shadow-[0_8px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        "p-6 md:p-8 lg:p-10",
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Decorative background elements with enhanced design */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none opacity-50" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none opacity-50" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none opacity-30 transform -translate-y-1/2" />

      {/* Content */}
      <div className="relative space-y-5 md:space-y-6">
        {/* Icon and title */}
        <div className="flex items-center gap-4 mb-2">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            {featuredTitle || t("استكشف العروض الجديدة", "Discover New Deals")}
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
          {featuredDescription ||
            t(
              "اختر من بين آلاف الإعلانات والعروض الحصرية المتاحة اليوم",
              "Choose from thousands of listings and exclusive deals available today"
            )}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 pt-3">
          <Button
            onClick={onBrowseClick}
            size="lg"
            className="gap-2 font-semibold shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:shadow-[0_6px_16px_rgba(15,23,42,0.2)]"
          >
            {t("استكشف الكل", "Browse All")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={onCreateClick}
            variant="outline"
            size="lg"
            className="font-semibold hover:bg-muted/80"
          >
            {t("نشر إعلان جديد", "Create Listing")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const HeroSection = memo(HeroSectionContent);
