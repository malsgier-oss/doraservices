import { useState } from "react";
import {
  MapPin,
  Calendar,
  Star,
  Settings,
  Edit2,
  Award,
  MessageSquare,
  Bookmark,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { BusinessCard } from "@/components/business/BusinessCard";
import { reviews, businesses } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("reviews");

  const userProfile = {
    name: "Alex Morgan",
    initials: "AM",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    location: "Downtown District",
    memberSince: "March 2023",
    points: 125,
    reviewCount: 15,
    tier: "Silver",
  };

  const userReviews = reviews.slice(0, 2);
  const savedBusinesses = businesses.slice(0, 3);

  return (
    <Layout>
      {/* Profile Header */}
      <section className="bg-warm py-12">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-card shadow-lg">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
              <AvatarFallback className="text-2xl font-display font-bold bg-primary text-primary-foreground">
                {userProfile.initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {userProfile.name}
                </h1>
                <Badge className="w-fit mx-auto sm:mx-0 bg-primary text-primary-foreground">
                  <Award className="h-3 w-3 mr-1" />
                  {userProfile.tier} Member
                </Badge>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {userProfile.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {userProfile.memberSince}
                </span>
              </div>

              <div className="flex justify-center sm:justify-start gap-6">
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-foreground">
                    {userProfile.points}
                  </p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-foreground">
                    {userProfile.reviewCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" />
                Edit Profile
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto mb-8">
              <TabsTrigger value="reviews" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Reviews
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-1.5">
                <Bookmark className="h-4 w-4" />
                Saved
              </TabsTrigger>
              <TabsTrigger value="badges" className="flex items-center gap-1.5">
                <Star className="h-4 w-4" />
                Badges
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="animate-fade-in">
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Your Reviews
                </h2>
                {userReviews.map((review) => (
                  <ReviewCard key={review.id} {...review} />
                ))}
                {userReviews.length === 0 && (
                  <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      You haven't written any reviews yet
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="saved" className="animate-fade-in">
              <h2 className="font-display text-lg font-semibold mb-4">
                Saved Businesses
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedBusinesses.map((business) => (
                  <BusinessCard key={business.id} {...business} />
                ))}
              </div>
              {savedBusinesses.length === 0 && (
                <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                  <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No saved businesses yet
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="animate-fade-in">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-lg font-semibold mb-4">
                  Your Badges
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { name: "First Review", icon: MessageSquare, earned: true },
                    { name: "Local Expert", icon: Star, earned: true },
                    { name: "Community Helper", icon: Award, earned: false },
                  ].map((badge) => (
                    <div
                      key={badge.name}
                      className={`p-6 rounded-2xl text-center shadow-card ${
                        badge.earned
                          ? "bg-card"
                          : "bg-muted/50 opacity-60"
                      }`}
                    >
                      <div
                        className={`h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
                          badge.earned
                            ? "gradient-warm"
                            : "bg-muted"
                        }`}
                      >
                        <badge.icon
                          className={`h-6 w-6 ${
                            badge.earned
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <p className="font-medium text-foreground">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {badge.earned ? "Earned" : "Locked"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Profile;
