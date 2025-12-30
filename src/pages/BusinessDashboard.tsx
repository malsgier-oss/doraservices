import { useState } from "react";
import {
  BarChart3,
  Star,
  MessageSquare,
  Eye,
  TrendingUp,
  Settings,
  Edit2,
  Save,
  Plus,
  Tag,
  Trash2,
  Loader2,
  Store,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { useBusiness } from "@/hooks/useBusiness";
import { useDeals } from "@/hooks/useDeals";
import { usePosts } from "@/hooks/usePosts";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";

const BusinessDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { business, loading: businessLoading, createBusiness, updateBusiness } = useBusiness();
  const { deals, loading: dealsLoading, createDeal, deleteDeal } = useDeals(business?.id);
  const { createPost } = usePosts();
  const { profile } = useProfile();

  const [businessForm, setBusinessForm] = useState({
    name: "",
    category: "",
    location: "",
    description: "",
    image_url: "",
  });

  const [dealForm, setDealForm] = useState({
    title: "",
    discount: "",
    description: "",
    expires_at: "",
  });

  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveBusiness = async () => {
    setIsSubmitting(true);
    if (business) {
      const { error } = await updateBusiness(businessForm);
      if (error) {
        toast({ title: "Error", description: "Failed to update business", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Business updated successfully" });
      }
    } else {
      const { error } = await createBusiness(businessForm);
      if (error) {
        toast({ title: "Error", description: "Failed to create business", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Business created successfully" });
      }
    }
    setIsSubmitting(false);
  };

  const handleCreateDeal = async () => {
    if (!business) {
      toast({ title: "Error", description: "Create a business first", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await createDeal({
      ...dealForm,
      business_id: business.id,
      expires_at: dealForm.expires_at || undefined,
    });
    if (error) {
      toast({ title: "Error", description: "Failed to create deal", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Deal created successfully" });
      setDealForm({ title: "", discount: "", description: "", expires_at: "" });
    }
    setIsSubmitting(false);
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

  // Initialize form with existing business data
  useState(() => {
    if (business) {
      setBusinessForm({
        name: business.name,
        category: business.category,
        location: business.location || "",
        description: business.description || "",
        image_url: business.image_url || "",
      });
    }
  });

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
      <section className="bg-gradient-to-r from-primary/10 via-warm to-primary/5 py-8">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-warm flex items-center justify-center">
              <Store className="h-8 w-8 text-warm-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {business?.name || "Business Dashboard"}
              </h1>
              <p className="text-muted-foreground">
                {business ? business.category : "Set up your business profile"}
              </p>
            </div>
            {business && (
              <Badge className="ml-auto bg-success text-success-foreground">Active</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-4 mb-8">
              <TabsTrigger value="overview">Analytics</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Views Over Time"
                  description="Daily page views"
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
                  title="Deals Claimed"
                  description="Deals redeemed per day"
                  data={[
                    { name: "Mon", value: 5 },
                    { name: "Tue", value: 8 },
                    { name: "Wed", value: 12 },
                    { name: "Thu", value: 7 },
                    { name: "Fri", value: 15 },
                    { name: "Sat", value: 20 },
                    { name: "Sun", value: 10 },
                  ]}
                  color="hsl(var(--success))"
                />
              </div>
            </TabsContent>

            {/* Business Profile Tab */}
            <TabsContent value="business" className="max-w-2xl">
              <div className="bg-card rounded-2xl shadow-card p-6 space-y-6">
                <h2 className="font-display text-xl font-semibold">
                  {business ? "Edit Business" : "Create Your Business"}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={businessForm.name}
                      onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                      placeholder="My Business"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={businessForm.category}
                      onChange={(e) => setBusinessForm({ ...businessForm, category: e.target.value })}
                      placeholder="Restaurant, Retail, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={businessForm.location}
                    onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={businessForm.description}
                    onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                    placeholder="Tell customers about your business..."
                    rows={3}
                  />
                </div>
                <Button variant="warm" onClick={handleSaveBusiness} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {business ? "Update Business" : "Create Business"}
                </Button>
              </div>
            </TabsContent>

            {/* Deals Tab */}
            <TabsContent value="deals" className="space-y-6">
              <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
                <h3 className="font-display font-semibold">Create New Deal</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={dealForm.title}
                      onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                      placeholder="Summer Sale"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      value={dealForm.discount}
                      onChange={(e) => setDealForm({ ...dealForm, discount: e.target.value })}
                      placeholder="20% OFF"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={dealForm.description}
                    onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
                    placeholder="Deal details..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={dealForm.expires_at}
                    onChange={(e) => setDealForm({ ...dealForm, expires_at: e.target.value })}
                  />
                </div>
                <Button variant="warm" onClick={handleCreateDeal} disabled={isSubmitting || !business}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Deal
                </Button>
              </div>

              {/* Existing Deals */}
              <div className="space-y-4">
                <h3 className="font-display font-semibold">Your Deals</h3>
                {deals.length > 0 ? (
                  deals.map((deal) => (
                    <div key={deal.id} className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-sm text-muted-foreground">{deal.discount}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteDeal(deal.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No deals yet</p>
                )}
              </div>
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="max-w-2xl">
              <div className="bg-card rounded-2xl shadow-card p-6 space-y-4">
                <h3 className="font-display font-semibold">Share to Community</h3>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share news, updates, or promotions..."
                  rows={4}
                />
                <Button variant="warm" onClick={handleCreatePost} disabled={isSubmitting || !postContent.trim()}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Post to Feed
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default BusinessDashboard;
