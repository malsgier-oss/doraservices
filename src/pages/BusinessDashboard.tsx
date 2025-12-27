import { useState } from "react";
import {
  BarChart3,
  Star,
  MessageSquare,
  Eye,
  TrendingUp,
  Settings,
  Edit2,
  Reply,
  Check,
  X,
  Camera,
  Save,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { businesses, reviews } from "@/data/mockData";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { ReviewResponseCard } from "@/components/dashboard/ReviewResponseCard";

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  
  // Using the first business as the owner's business
  const business = businesses[0];
  const businessReviews = reviews.filter((r) => r.businessId === "1");

  const [formData, setFormData] = useState({
    name: business.name,
    category: business.category,
    description: business.description,
    address: business.address,
    phone: business.phone,
    hours: business.hours,
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    reviewAlerts: true,
    weeklyReport: false,
    publicProfile: true,
  });

  const stats = [
    { label: "Total Views", value: "2,456", change: "+12%", icon: Eye },
    { label: "Reviews", value: "124", change: "+8", icon: MessageSquare },
    { label: "Avg Rating", value: "4.8", change: "+0.2", icon: Star },
    { label: "Engagement", value: "89%", change: "+5%", icon: TrendingUp },
  ];

  const handleSaveProfile = () => {
    setIsEditing(false);
    toast({
      title: "Profile updated",
      description: "Your business profile has been saved successfully.",
    });
  };

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-r from-primary/10 via-warm to-primary/5 py-8">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group">
              <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-card">
                <img
                  src={business.image}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <button className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <Camera className="h-6 w-6 text-background" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {business.name}
                </h1>
                <Badge className="bg-success text-success-foreground">
                  Verified Owner
                </Badge>
              </div>
              <p className="text-muted-foreground mb-2">{business.category}</p>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-star text-star" />
                <span className="font-medium">{business.rating}</span>
                <span className="text-muted-foreground">
                  ({business.reviewCount} reviews)
                </span>
              </div>
            </div>

            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Public Page
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="py-6 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="h-10 w-10 rounded-lg bg-warm flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-warm-foreground" />
                  </div>
                  <span className="text-xs font-medium text-success">
                    {stat.change}
                  </span>
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

      {/* Tabs */}
      <section className="py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-4 mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Reviews</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-1.5">
                <Edit2 className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="overview" className="animate-fade-in space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Views Over Time"
                  description="Daily page views for the last 7 days"
                  data={[
                    { name: "Mon", value: 320 },
                    { name: "Tue", value: 450 },
                    { name: "Wed", value: 380 },
                    { name: "Thu", value: 520 },
                    { name: "Fri", value: 610 },
                    { name: "Sat", value: 480 },
                    { name: "Sun", value: 390 },
                  ]}
                  color="hsl(var(--primary))"
                />
                <AnalyticsChart
                  title="Review Activity"
                  description="New reviews received per day"
                  data={[
                    { name: "Mon", value: 2 },
                    { name: "Tue", value: 5 },
                    { name: "Wed", value: 3 },
                    { name: "Thu", value: 4 },
                    { name: "Fri", value: 6 },
                    { name: "Sat", value: 8 },
                    { name: "Sun", value: 4 },
                  ]}
                  color="hsl(var(--success))"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-card rounded-2xl shadow-card p-6">
                <h3 className="font-display font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    { action: "New 5-star review", time: "2 hours ago", icon: Star },
                    { action: "Profile viewed 45 times", time: "Today", icon: Eye },
                    { action: "Responded to review", time: "Yesterday", icon: Reply },
                  ].map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-warm flex items-center justify-center">
                        <activity.icon className="h-4 w-4 text-warm-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Manage Reviews
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Respond to customer feedback
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    All Reviews
                  </Button>
                  <Button variant="ghost" size="sm">
                    Needs Response
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {businessReviews.map((review) => (
                  <ReviewResponseCard key={review.id} review={review} />
                ))}
                {businessReviews.length === 0 && (
                  <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="animate-fade-in">
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Business Profile
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Update your business information
                    </p>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button variant="warm" size="sm" onClick={handleSaveProfile}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Business Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      disabled={!isEditing}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        id="hours"
                        value={formData.hours}
                        onChange={(e) =>
                          setFormData({ ...formData, hours: e.target.value })
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="animate-fade-in">
              <div className="max-w-2xl">
                <h2 className="font-display text-xl font-semibold mb-2">
                  Dashboard Settings
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Manage your notifications and preferences
                </p>

                <div className="bg-card rounded-2xl shadow-card divide-y divide-border">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Email Notifications
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Review Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified of new reviews
                      </p>
                    </div>
                    <Switch
                      checked={settings.reviewAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, reviewAlerts: checked })
                      }
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Weekly Report</p>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly analytics summary
                      </p>
                    </div>
                    <Switch
                      checked={settings.weeklyReport}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, weeklyReport: checked })
                      }
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Public Profile</p>
                      <p className="text-sm text-muted-foreground">
                        Allow your business to be discovered
                      </p>
                    </div>
                    <Switch
                      checked={settings.publicProfile}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, publicProfile: checked })
                      }
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="warm"
                    onClick={() =>
                      toast({
                        title: "Settings saved",
                        description: "Your preferences have been updated.",
                      })
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default BusinessDashboard;
