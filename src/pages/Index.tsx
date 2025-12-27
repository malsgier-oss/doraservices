import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Users, Gift, TrendingUp } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { BusinessCard } from "@/components/business/BusinessCard";
import { CommunityPost } from "@/components/community/CommunityPost";
import { Button } from "@/components/ui/button";
import { businesses, communityPosts } from "@/data/mockData";

const Index = () => {
  const featuredBusinesses = businesses.filter((b) => b.featured);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm via-background to-background py-16 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-card mb-6">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
              <span className="text-sm font-medium text-muted-foreground">
                1,234 active community members
              </span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Discover Your{" "}
              <span className="text-gradient">Local Community</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              Connect with local businesses, share experiences, and earn rewards 
              by being an active member of The Circle.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/businesses">
                <Button variant="warm" size="lg">
                  <MapPin className="h-5 w-5" />
                  Explore Businesses
                </Button>
              </Link>
              <Link to="/community">
                <Button variant="outline" size="lg">
                  Join the Community
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: MapPin, label: "Local Businesses", value: "150+" },
              { icon: Users, label: "Community Members", value: "1,234" },
              { icon: Gift, label: "Rewards Claimed", value: "5,000+" },
              { icon: TrendingUp, label: "Reviews Posted", value: "10K+" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 rounded-xl bg-card shadow-card animate-fade-in"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-warm mb-3">
                  <stat.icon className="h-5 w-5 text-warm-foreground" />
                </div>
                <p className="font-display text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Featured Businesses
              </h2>
              <p className="text-muted-foreground">
                Top-rated places loved by our community
              </p>
            </div>
            <Link to="/businesses">
              <Button variant="ghost">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBusinesses.map((business, index) => (
              <div
                key={business.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <BusinessCard {...business} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Posts */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Community Feed
              </h2>
              <p className="text-muted-foreground">
                See what your neighbors are sharing
              </p>
            </div>
            <Link to="/community">
              <Button variant="ghost">
                See More
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {communityPosts.slice(0, 2).map((post, index) => (
              <div
                key={post.id}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CommunityPost {...post} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <div className="relative rounded-3xl gradient-warm p-8 sm:p-12 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
                Start Earning Rewards Today
              </h2>
              <p className="text-primary-foreground/90 mb-6">
                Write reviews, support local businesses, and unlock exclusive 
                perks as a Circle member.
              </p>
              <Link to="/rewards">
                <Button variant="secondary" size="lg">
                  <Gift className="h-5 w-5" />
                  View Rewards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
