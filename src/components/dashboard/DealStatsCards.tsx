import { Tag, Eye, Clock, FileText, Pause, MousePointer } from "lucide-react";

interface DealStats {
  active: number;
  expired: number;
  scheduled: number;
  draft: number;
  paused: number;
  totalViews: number;
  totalClicks: number;
}

interface DealStatsCardsProps {
  stats: DealStats;
}

export function DealStatsCards({ stats }: DealStatsCardsProps) {
  const cards = [
    {
      label: "Active Deals",
      value: stats.active,
      icon: Tag,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Expired",
      value: stats.expired,
      icon: Clock,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Scheduled",
      value: stats.scheduled,
      icon: FileText,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Drafts",
      value: stats.draft,
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "Total Views",
      value: stats.totalViews,
      icon: Eye,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Total Clicks",
      value: stats.totalClicks,
      icon: MousePointer,
      color: "text-warm-foreground",
      bg: "bg-warm",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-xl p-4 shadow-card"
        >
          <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
          <p className="text-xs text-muted-foreground">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
