import { Tag, Clock } from "lucide-react";
import { memo } from "react";
import { HUB_CARD_BASE } from "./hubStyles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Deal } from "@/hooks/useDeals";

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  isRTL?: boolean;
}

const DealCardContent = ({ deal, onClick, isRTL }: DealCardProps) => {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  // Safety check
  if (!deal || !deal.id) {
    return null;
  }

  const daysRemaining = deal.expires_at
    ? Math.ceil((new Date(deal.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const discountText =
    deal.discount_type === "percentage"
      ? `${deal.discount}% ${t("خصم", "OFF")}`
      : deal.discount_type === "fixed"
        ? `${deal.discount} ${t("د.ل", "LYD")} ${t("خصم", "OFF")}`
        : deal.discount || t("عرض", "Deal");

  return (
    <button
      onClick={onClick}
      className={cn(
        HUB_CARD_BASE,
        "bg-card overflow-hidden p-0 transition-transform active:scale-[0.99] touch-manipulation text-left",
        onClick && "cursor-pointer"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Image */}
      {deal.image_url && (
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          <img
            src={deal.image_url}
            alt={deal.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {deal.featured && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
              {isRTL ? "مميز" : "FEATURED"}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Discount badge */}
        <div className="flex items-center gap-2">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            {discountText}
          </div>
          {daysRemaining !== null && daysRemaining > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{isRTL ? `${daysRemaining} يوم` : `${daysRemaining}d left`}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2">{deal.title}</h3>

        {/* Description */}
        {deal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
        )}

        {/* Promo code */}
        {deal.promo_code && (
          <div className="flex items-center gap-2 pt-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-primary">{deal.promo_code}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export const DealCard = memo(DealCardContent);
