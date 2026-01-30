import { useMemo } from "react";
import { Lightbulb, Clock, Heart, TrendingUp, type LucideIcon } from "lucide-react";
import { HubSection } from "./HubSection";
import { ServiceGrid } from "./ServiceGrid";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  title: string;
  provider_name: string | null;
  provider_phone: string | null;
  allow_whatsapp?: boolean | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
  is_featured?: boolean | null;
  is_verified?: boolean | null;
  price?: number | null;
};

interface DiscoverySectionProps {
  type: "recommendations" | "recent" | "similar" | "trending";
  services: Service[];
  title?: string;
  icon?: LucideIcon;
  onServiceClick: (service: Service) => void;
  onCall: (service: Service) => void;
  onWhatsApp: (service: Service) => void;
  variant?: "compact" | "featured";
  columns?: 2 | 3 | 4;
  className?: string;
}

const DEFAULT_ICONS = {
  recommendations: Lightbulb,
  recent: Clock,
  similar: Heart,
  trending: TrendingUp,
};

export function DiscoverySection({
  type,
  services,
  title,
  icon: Icon,
  onServiceClick,
  onCall,
  onWhatsApp,
  variant = "compact",
  columns = 3,
  className,
}: DiscoverySectionProps) {
  const { language, isRTL } = useLanguage();

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const defaultTitles = {
    recommendations: t("مقترح لك", "For You"),
    recent: t("شاهدت مؤخراً", "Recently Viewed"),
    similar: t("خدمات مشابهة", "Similar Services"),
    trending: t("ترند الآن", "Trending Now"),
  };

  const sectionTitle = title || defaultTitles[type];
  const SectionIcon = Icon || DEFAULT_ICONS[type];

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <HubSection
      title={sectionTitle}
      icon={SectionIcon}
      className={cn("space-y-4", className)}
    >
      <ServiceGrid
        services={services}
        variant={variant}
        columns={columns}
        onServiceClick={onServiceClick}
        onCall={onCall}
        onWhatsApp={onWhatsApp}
      />
    </HubSection>
  );
}
