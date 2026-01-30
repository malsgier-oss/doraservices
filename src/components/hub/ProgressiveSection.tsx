import { useState, memo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { HUB_CARD_BASE, HUB_DIVIDER_LIGHT, HUB_SPACING_SM } from "@/components/hub/hubStyles";

interface ProgressiveSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  className?: string;
  showLabel?: string;
  hideLabel?: string;
}

const ProgressiveSectionContent = ({
  title,
  children,
  defaultExpanded = false,
  onExpand,
  className,
  showLabel,
  hideLabel,
}: ProgressiveSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpand?.(newState);
  };

  return (
    <div className={cn("space-y-0", className)}>
      {!isExpanded ? (
        <Button
          variant="outline"
          onClick={handleToggle}
          className={cn(
            HUB_CARD_BASE,
            "w-full justify-between py-5 px-4 font-semibold",
            "hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.16)]"
          )}
        >
          <span>{title}</span>
          <ChevronDown className="h-5 w-5 transition-transform" />
        </Button>
      ) : (
        <>
          <div className={cn(
            HUB_CARD_BASE,
            "px-4 py-5 border-b",
            HUB_DIVIDER_LIGHT,
            "flex items-center justify-between"
          )}>
            <h3 className="font-semibold text-base">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {hideLabel || t("إخفاء", "Hide")}
              <ChevronDown className="h-4 w-4 ml-1 transform rotate-180" />
            </Button>
          </div>
          <div className={cn(
            HUB_CARD_BASE,
            "px-4 py-5 -mt-[1px]",
            "rounded-t-none border-t-0"
          )}>
            <div className={HUB_SPACING_SM}>{children}</div>
          </div>
        </>
      )}
    </div>
  );
};

export const ProgressiveSection = memo(ProgressiveSectionContent);
