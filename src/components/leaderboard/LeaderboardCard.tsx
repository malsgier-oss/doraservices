import { Trophy, Flame, MapPin, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LeaderboardUser, getLevelProgress, getRarityColor } from "@/data/gamificationData";
import { cn } from "@/lib/utils";

interface LeaderboardCardProps {
  user: LeaderboardUser;
  rank: number;
}

export function LeaderboardCard({ user, rank }: LeaderboardCardProps) {
  const { progress } = getLevelProgress(user.points);
  
  const getRankStyle = () => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 border-amber-500/40 ring-2 ring-amber-500/20';
    if (rank === 2) return 'bg-gradient-to-br from-slate-300/20 to-slate-500/20 border-slate-400/40';
    if (rank === 3) return 'bg-gradient-to-br from-orange-400/20 to-orange-600/20 border-orange-500/40';
    return 'bg-card border-border';
  };

  const getRankBadge = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Card className={cn(
      "p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      getRankStyle()
    )}>
      <div className="flex items-center gap-4">
        {/* Rank */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-lg",
          rank <= 3 ? "text-2xl" : "bg-muted text-muted-foreground"
        )}>
          {getRankBadge()}
        </div>

        {/* Avatar & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  Lv.{user.level}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {user.reviewCount}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.checkInCount}
                </span>
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="h-3 w-3" />
                  {user.streak} day streak
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Points */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-warm font-bold">
            <Trophy className="h-4 w-4" />
            <span>{user.points.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
      </div>

      {/* Level Progress */}
      <div className="mt-3">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {user.badges.slice(0, 5).map((badge) => (
            <span
              key={badge.id}
              className={cn(
                "text-sm px-2 py-0.5 rounded-full border",
                getRarityColor(badge.rarity)
              )}
              title={`${badge.name}: ${badge.description}`}
            >
              {badge.icon}
            </span>
          ))}
          {user.badges.length > 5 && (
            <span className="text-xs text-muted-foreground self-center">
              +{user.badges.length - 5} more
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
