import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Star,
  Settings,
  Edit2,
  Award,
  MessageSquare,
  Bookmark,
  Save,
  X,
  Loader2,
  Building2,
  LogOut,
  LayoutDashboard,
  Tag,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { BusinessCard } from "@/components/business/BusinessCard";
import { reviews, businesses } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("reviews");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { isBusiness, loading: roleLoading, upgradeToBusiness } = useUserRole();

  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    avatar_url: "",
  });

  // Update form data when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    const { error } = await updateProfile({
      full_name: formData.full_name || null,
      bio: formData.bio || null,
      avatar_url: formData.avatar_url || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      setIsEditing(false);
    }
  };

  const handleUpgradeToBusiness = async () => {
    setIsUpgrading(true);
    const { error } = await upgradeToBusiness();
    setIsUpgrading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to upgrade to business account",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Business!",
        description: "You now have access to the business dashboard.",
      });
      navigate("/dashboard");
    }
  };

  const userReviews = reviews.slice(0, 2);
  const savedBusinesses = businesses.slice(0, 3);

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : "Recently";

  return (
    <Layout>
      {/* Profile Header */}
      <section className="bg-warm py-12">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-card shadow-lg">
              <AvatarImage src={profile?.avatar_url || ""} alt={displayName} />
              <AvatarFallback className="text-2xl font-display font-bold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      value={formData.avatar_url}
                      onChange={(e) =>
                        setFormData({ ...formData, avatar_url: e.target.value })
                      }
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="warm" size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                    <h1 className="font-display text-2xl font-bold text-foreground">
                      {displayName}
                    </h1>
                    <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                      <Badge className="w-fit bg-primary text-primary-foreground">
                        <Award className="h-3 w-3 mr-1" />
                        {profile?.tier || "Explorer"} Member
                      </Badge>
                      {isBusiness && (
                        <Badge variant="outline" className="w-fit border-primary text-primary">
                          <Building2 className="h-3 w-3 mr-1" />
                          Business Account
                        </Badge>
                      )}
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="text-muted-foreground mb-3 max-w-md">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since {memberSince}
                    </span>
                  </div>

                  <div className="flex justify-center sm:justify-start gap-6">
                    <div className="text-center">
                      <p className="font-display text-xl font-bold text-foreground">
                        {profile?.points || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-xl font-bold text-foreground">
                        {userReviews.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isEditing && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Business Dashboard Link */}
                {isBusiness && (
                  <Button 
                    variant="warm" 
                    size="sm" 
                    onClick={() => navigate("/dashboard")}
                    className="gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                )}

                {/* Become a Business CTA - only for non-business users */}
                {!isBusiness && (
                  <Button 
                    variant="warm" 
                    size="sm" 
                    onClick={handleUpgradeToBusiness}
                    disabled={isUpgrading}
                    className="gap-2"
                  >
                    {isUpgrading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    Become a Business
                  </Button>
                )}

                {/* Sign Out */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
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
