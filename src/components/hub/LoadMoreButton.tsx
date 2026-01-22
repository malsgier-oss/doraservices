import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LoadMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  hasMore?: boolean;
  className?: string;
}

export function LoadMoreButton({ onClick, loading = false, hasMore = true, className }: LoadMoreButtonProps) {
  const { language, isRTL } = useLanguage();

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  if (!hasMore) {
    return (
      <div className={cn("text-center py-4 text-sm text-muted-foreground", className)}>
        {t("تم عرض جميع النتائج", "All results shown")}
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center py-4", className)} dir={isRTL ? "rtl" : "ltr"}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onClick}
        disabled={loading}
        className="min-w-[140px]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t("جاري التحميل...", "Loading...")}
          </>
        ) : (
          t("تحميل المزيد", "Load More")
        )}
      </Button>
    </div>
  );
}
