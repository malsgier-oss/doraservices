import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Target, Zap, TrendingUp } from "lucide-react";
import { LeaderboardCard } from "@/components/leaderboard/LeaderboardCard";
import { BadgeCard } from "@/components/leaderboard/BadgeCard";
import { leaderboardUsers, badges, getLevelProgress } from "@/data/gamificationData";
import { Progress } from "@/components/ui/progress";

// Mock current user data
const currentUser = {
  id: 'current',
  name: 'You',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
  points: 1250,
  level: 4,
  badges: [badges[0], badges[1]],
  reviewCount: 6,
  checkInCount: 18,
  streak: 3,
  rank: 15,
};

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'alltime'>('week');
  const { progress, current, next } = getLevelProgress(currentUser.points);
  const unlockedBadgeIds = currentUser.badges.map(b => b.id);

  return (
    <Layout>
      <div className="container py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Compete with your community and earn rewards
          </p>
        </div>

        {/* Your Stats Card */}
        <Card className="p-6 gradient-warm text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Your Progress</h2>
            <span className="flex items-center gap-1 bg-background/20 px-3 py-1 rounded-full text-sm">
              <Trophy className="h-4 w-4" />
              Rank #{currentUser.rank}
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{currentUser.points.toLocaleString()}</div>
              <div className="text-sm opacity-80">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Lv.{currentUser.level}</div>
              <div className="text-sm opacity-80">Current Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentUser.badges.length}</div>
              <div className="text-sm opacity-80">Badges Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                <Zap className="h-5 w-5" />
                {currentUser.streak}
              </div>
              <div className="text-sm opacity-80">Day Streak</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {currentUser.level}</span>
              <span>{currentUser.points - current} / {next - current} XP to Level {currentUser.level + 1}</span>
            </div>
            <Progress value={progress} className="h-2 bg-background/20" />
          </div>
        </Card>

        {/* How to Earn Points */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-lg">✍️</span>
              <div>
                <div className="font-medium">Write Review</div>
                <div className="text-muted-foreground">+50 pts</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-lg">📍</span>
              <div>
                <div className="font-medium">Check In</div>
                <div className="text-muted-foreground">+10 pts</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-lg">❤️</span>
              <div>
                <div className="font-medium">Get a Like</div>
                <div className="text-muted-foreground">+5 pts</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <span className="text-lg">🔥</span>
              <div>
                <div className="font-medium">Daily Streak</div>
                <div className="text-muted-foreground">+25 pts/day</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="rankings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-4">
            {/* Timeframe Filter */}
            <div className="flex gap-2">
              {(['week', 'month', 'alltime'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Leaderboard List */}
            <div className="space-y-3">
              {leaderboardUsers.map((user, index) => (
                <LeaderboardCard key={user.id} user={user} rank={index + 1} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Collect badges by completing achievements. You've unlocked {currentUser.badges.length} of {badges.length} badges.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {badges.map((badge) => (
                <BadgeCard 
                  key={badge.id} 
                  badge={badge} 
                  unlocked={unlockedBadgeIds.includes(badge.id)} 
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
