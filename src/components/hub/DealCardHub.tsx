import { Tag } from "lucide-react";
import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBuySellCategoryLabel } from "./buySellCategoriesData";
import { HubItemCard } from "./HubItemCard";
import type { Deal } from "@/hooks/useDeals";

interface DealCardHubProps {
  deal: Deal;
  onClick?: () => void;
  isRTL?: boolean;
}

function DealCardHubContent({ deal, onClick, isRTL }: DealCardHubProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  if (!deal?.id) return null;

  const discountText =
    deal.discount_type === "percentage"
      ? `${deal.discount}% ${t("خصم", "OFF")}`
      : deal.discount_type === "fixed"
        ? `${deal.discount} ${t("د.ل", "LYD")} ${t("خصم", "OFF")}`
        : deal.discount || t("عرض", "Deal");
  const subtitle = getBuySellCategoryLabel(deal.category, language) ?? deal.title ?? "—";

  return (
    <HubItemCard
      imageUrl={deal.image_url ?? null}
      priceText={discountText}
      location="—"
      subtitle={subtitle}
      onClick={onClick}
      isRTL={isRTL}
      noImageNode={
        <div className="text-center">
          <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-muted-foreground/10 flex items-center justify-center">
            <Tag className="w-3 h-3 text-muted-foreground/60" />
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            {t("لا توجد صورة", "No photo")}
          </div>
        </div>
      }
    />
  );
}

export const DealCardHub = memo(DealCardHubContent);
