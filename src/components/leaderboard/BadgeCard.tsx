import { Card } from "@/components/ui/card";
import { Badge as BadgeType, getRarityColor } from "@/data/gamificationData";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface BadgeCardProps {
  badge: BadgeType;
  unlocked?: boolean;
}

export function BadgeCard({ badge, unlocked = false }: BadgeCardProps) {
  return (
    <Card className={cn(
      "p-4 text-center transition-all duration-300 relative overflow-hidden",
      unlocked 
        ? "hover:shadow-lg hover:-translate-y-0.5" 
        : "opacity-50 grayscale"
    )}>
      {!unlocked && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      <div className="text-4xl mb-2">{badge.icon}</div>
      <h4 className="font-semibold text-sm text-foreground">{badge.name}</h4>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
      <span className={cn(
        "inline-block mt-2 text-xs px-2 py-0.5 rounded-full border capitalize",
        getRarityColor(badge.rarity)
      )}>
        {badge.rarity}
      </span>
    </Card>
  );
}
