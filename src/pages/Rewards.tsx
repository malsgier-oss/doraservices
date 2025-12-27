import { Gift, Star, Trophy, Zap, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { rewards } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const Rewards = () => {
  const userPoints = 125;
  const nextTier = 200;
  const progress = (userPoints / nextTier) * 100;

  const handleRedeem = (reward: (typeof rewards)[0]) => {
    if (userPoints >= reward.points) {
      toast({
        title: "Reward redeemed!",
        description: `You've redeemed "${reward.title}" from ${reward.business}.`,
      });
    } else {
      toast({
        title: "Not enough points",
        description: `You need ${reward.points - userPoints} more points for this reward.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-warm py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="container relative">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Trophy className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm font-medium text-primary-foreground">
                Silver Member
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">
              Your Rewards
            </h1>
            <p className="text-primary-foreground/80 mb-6">
              Earn points by writing reviews and engaging with local businesses
            </p>

            {/* Points Card */}
            <div className="bg-card rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Available Points
                  </p>
                  <p className="font-display text-4xl font-bold text-foreground">
                    {userPoints}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl gradient-warm flex items-center justify-center shadow-glow">
                  <Star className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progress to Gold
                  </span>
                  <span className="font-medium text-foreground">
                    {userPoints}/{nextTier}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Earn */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <h2 className="font-display text-xl font-semibold mb-6">
            Ways to Earn Points
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Star,
                title: "Write Reviews",
                points: "+25 pts",
                desc: "Share your experience",
              },
              {
                icon: Gift,
                title: "Visit Businesses",
                points: "+10 pts",
                desc: "Check in at local spots",
              },
              {
                icon: Zap,
                title: "Daily Activity",
                points: "+5 pts",
                desc: "Stay engaged daily",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-4 p-4 rounded-xl bg-card shadow-card"
              >
                <div className="h-12 w-12 rounded-xl bg-warm flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-warm-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <span className="text-sm font-semibold text-primary">
                      {item.points}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Available Rewards */}
      <section className="py-12">
        <div className="container">
          <h2 className="font-display text-xl font-semibold mb-6">
            Available Rewards
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewards.map((reward, index) => (
              <div
                key={reward.id}
                className="bg-card rounded-2xl overflow-hidden shadow-card animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                  <img
                    src={reward.image}
                    alt={reward.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="bg-foreground/80 text-background text-xs font-bold px-2 py-1 rounded-full">
                      {reward.points} pts
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {reward.business}
                  </p>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    {reward.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {reward.description}
                  </p>
                  <Button
                    variant={userPoints >= reward.points ? "warm" : "secondary"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleRedeem(reward)}
                  >
                    {userPoints >= reward.points ? "Redeem" : "Not Enough Points"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* History (placeholder) */}
      <section className="py-12 bg-secondary/30">
        <div className="container">
          <h2 className="font-display text-xl font-semibold mb-6">
            Recent Activity
          </h2>
          <div className="bg-card rounded-2xl shadow-card divide-y divide-border">
            {[
              { action: "Review posted", business: "Sunrise Bakery", points: "+25", date: "Today" },
              { action: "Check-in", business: "Fit Life Gym", points: "+10", date: "Yesterday" },
              { action: "Daily bonus", business: "", points: "+5", date: "2 days ago" },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">{activity.action}</p>
                  {activity.business && (
                    <p className="text-sm text-muted-foreground">{activity.business}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">{activity.points}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Rewards;
