import { Eye, Phone, MessageCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StoreStats } from "@/types/store";
import { cn } from "@/lib/utils";

interface StoreStatsCardProps {
  stats: StoreStats;
  className?: string;
}

export function StoreStatsCard({ stats, className }: StoreStatsCardProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar" : "en").format(num);
  };

  const statCards = [
    {
      label: t("إجمالي المشاهدات", "Total Views"),
      value: formatNumber(stats.total_views),
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: t("إجمالي المكالمات", "Total Calls"),
      value: formatNumber(stats.total_calls),
      icon: Phone,
      color: "text-green-500",
    },
    {
      label: t("إجمالي واتساب", "Total WhatsApp"),
      value: formatNumber(stats.total_whatsapp),
      icon: MessageCircle,
      color: "text-emerald-500",
    },
    {
      label: t("الإعلانات النشطة", "Active Listings"),
      value: formatNumber(stats.active_listings_count),
      icon: Package,
      color: "text-purple-500",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <Icon className={cn("h-8 w-8", stat.color)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
