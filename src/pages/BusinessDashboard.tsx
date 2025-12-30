import { useState, useEffect } from "react";
import {
  BarChart3,
  Plus,
  Loader2,
  Store,
  Tag,
  MessageSquare,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { DealStatsCards } from "@/components/dashboard/DealStatsCards";
import { DealForm } from "@/components/dashboard/DealForm";
import { DealsList } from "@/components/dashboard/DealsList";
import { BusinessProfileForm } from "@/components/dashboard/BusinessProfileForm";
import { useBusiness } from "@/hooks/useBusiness";
import { useDeals, Deal, DealFormData } from "@/hooks/useDeals";
import { usePosts } from "@/hooks/usePosts";

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { business, loading: businessLoading, createBusiness, updateBusiness } = useBusiness();
  const { deals, loading: dealsLoading, stats, createDeal, updateDeal, deleteDeal } = useDeals(business?.id);
  const { createPost } = usePosts();

  const [showDealForm, setShowDealForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveBusiness = async (formData: {
    name: string;
    category: string;
    location: string;
    description: string;
    image_url: string;
  }) => {
    setIsSubmitting(true);
    if (business) {
      const { error } = await updateBusiness(formData);
      if (error) {
        toast({ title: "Error", description: "Failed to update business", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Business updated successfully" });
      }
    } else {
      const { error } = await createBusiness(formData);
      if (error) {
        toast({ title: "Error", description: "Failed to create business", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Business created successfully" });
      }
    }
    setIsSubmitting(false);
  };

  const handleDealSubmit = async (data: DealFormData, isDraft: boolean) => {
    setIsSubmitting(true);
    
    if (editingDeal) {
      const { error } = await updateDeal(editingDeal.id, data);
      if (error) {
        toast({ title: "Error", description: "Failed to update deal", variant: "destructive" });
      } else {
        toast({ title: "Success", description: isDraft ? "Draft saved" : "Deal updated" });
        setShowDealForm(false);
        setEditingDeal(null);
      }
    } else {
      const { error } = await createDeal(data);
      if (error) {
        toast({ title: "Error", description: "Failed to create deal", variant: "destructive" });
      } else {
        toast({ title: "Success", description: isDraft ? "Draft saved" : "Deal published" });
        setShowDealForm(false);
      }
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (deal: Deal) => {
    const newStatus = deal.status === "active" ? "paused" : "active";
    const { error } = await updateDeal(deal.id, { status: newStatus });
    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Deal ${newStatus}` });
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    const { error } = await deleteDeal(dealId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete deal", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Deal deleted" });
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsSubmitting(true);
    const { error } = await createPost({ 
      content: postContent, 
      business_id: business?.id 
    });
    if (error) {
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Post shared to community" });
      setPostContent("");
    }
    setIsSubmitting(false);
  };

  if (businessLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-r from-primary/10 via-warm to-primary/5 py-6 sm:py-8">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {business?.image_url ? (
                <img
                  src={business.image_url}
                  alt={business.name}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-warm flex items-center justify-center">
                  <Store className="h-7 w-7 sm:h-8 sm:w-8 text-warm-foreground" />
                </div>
              )}
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  {business?.name || "Business Dashboard"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {business ? business.category : "Set up your business profile"}
                </p>
              </div>
            </div>
            {business && (
              <Badge className="self-start sm:ml-auto bg-success text-success-foreground">
                Active
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-6 sm:py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full max-w-xl grid grid-cols-4 mb-6 sm:mb-8">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="deals" className="text-xs sm:text-sm">
                <Tag className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Deals</span>
              </TabsTrigger>
              <TabsTrigger value="posts" className="text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Posts</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <DealStatsCards stats={stats} />

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Views Over Time"
                  description="Daily deal views"
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
                  title="Clicks Over Time"
                  description="Deal interactions"
                  data={[
                    { name: "Mon", value: 45 },
                    { name: "Tue", value: 68 },
                    { name: "Wed", value: 52 },
                    { name: "Thu", value: 87 },
                    { name: "Fri", value: 95 },
                    { name: "Sat", value: 120 },
                    { name: "Sun", value: 78 },
                  ]}
                  color="hsl(var(--success))"
                />
              </div>

              {/* Quick Actions */}
              {!business && (
                <div className="bg-warm rounded-2xl p-6 text-center">
                  <Store className="h-12 w-12 mx-auto text-warm-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">Welcome!</h3>
                  <p className="text-muted-foreground mb-4">
                    Set up your business profile to start creating deals
                  </p>
                  <Button onClick={() => setActiveTab("settings")}>
                    Get Started
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Deals Tab */}
            <TabsContent value="deals" className="space-y-6">
              {!business ? (
                <div className="bg-card rounded-2xl shadow-card p-8 text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">No Business Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your business profile first to start adding deals
                  </p>
                  <Button onClick={() => setActiveTab("settings")}>
                    Create Business
                  </Button>
                </div>
              ) : showDealForm || editingDeal ? (
                <DealForm
                  deal={editingDeal}
                  businessId={business.id}
                  onSubmit={handleDealSubmit}
                  onCancel={() => {
                    setShowDealForm(false);
                    setEditingDeal(null);
                  }}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold">Your Deals</h2>
                      <p className="text-sm text-muted-foreground">
                        Manage your promotions and offers
                      </p>
                    </div>
                    <Button onClick={() => setShowDealForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deal
                    </Button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {["all", "active", "scheduled", "paused", "draft", "expired"].map((filter) => (
                      <Badge
                        key={filter}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted capitalize"
                      >
                        {filter}
                      </Badge>
                    ))}
                  </div>

                  <DealsList
                    deals={deals}
                    onEdit={(deal) => setEditingDeal(deal)}
                    onDelete={handleDeleteDeal}
                    onToggleStatus={handleToggleStatus}
                  />
                </>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="max-w-2xl">
              <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
                <div>
                  <h3 className="font-display font-semibold text-lg">Share to Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Post updates, news, or announcements
                  </p>
                </div>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share news, updates, or promotions with the community..."
                  rows={4}
                />
                <Button 
                  onClick={handleCreatePost} 
                  disabled={isSubmitting || !postContent.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Post to Feed
                </Button>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="max-w-2xl">
              <BusinessProfileForm
                business={business}
                onSubmit={handleSaveBusiness}
                isSubmitting={isSubmitting}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default BusinessDashboard;
