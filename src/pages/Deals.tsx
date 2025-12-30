import { useState, useEffect } from "react";
import { Search, Tag, Sparkles, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DatabaseDeal {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  discount: string;
  category: string | null;
  discount_type: string | null;
  expires_at: string | null;
  start_date: string | null;
  promo_code: string | null;
  image_url: string | null;
  views_count: number | null;
  clicks_count: number | null;
  status: string | null;
  business?: {
    name: string;
    image_url: string | null;
  };
}

const CATEGORIES = [
  "All",
  "Food & Dining",
  "Shopping",
  "Services",
  "Banking",
  "Health & Beauty",
  "Entertainment",
  "Travel",
];

const categoryMap: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  services: "Services",
  banking: "Banking",
  health: "Health & Beauty",
  entertainment: "Entertainment",
  travel: "Travel",
  other: "Other",
};

export default function Deals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [deals, setDeals] = useState<DatabaseDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          business:businesses(name, image_url)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching deals:", error);
      } else {
        setDeals(data || []);
      }
      setLoading(false);
    };

    fetchDeals();
  }, []);

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deal.business?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const dealCategory = categoryMap[deal.category || ""] || deal.category || "";
    const matchesCategory =
      selectedCategory === "All" || dealCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleClaim = async (deal: DatabaseDeal) => {
    // Increment clicks count
    await supabase
      .from("deals")
      .update({ clicks_count: (deal.clicks_count || 0) + 1 })
      .eq("id", deal.id);

    toast({
      title: "Deal Claimed!",
      description: `You've claimed "${deal.title}" from ${deal.business?.name || "this business"}. ${deal.promo_code ? `Use code: ${deal.promo_code}` : "Show this at checkout."}`,
    });
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <Layout>
      <PageTransition>
        <div className="container py-6 md:py-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-6 w-6 text-warm" />
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Deals & Offers
              </h1>
            </div>
            <p className="text-muted-foreground">
              Exclusive discounts from local businesses in your community
            </p>
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{deals.length}</p>
              <p className="text-xs text-muted-foreground">Active Deals</p>
            </div>
            <div className="text-center border-x border-border/50">
              <p className="text-2xl font-bold text-warm">
                {deals.reduce((acc, d) => acc + (d.views_count || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {deals.reduce((acc, d) => acc + (d.clicks_count || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Claims</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals or businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "gradient-warm text-primary-foreground shrink-0"
                    : "shrink-0"
                }
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDeals.map((deal) => {
                const daysLeft = getDaysUntilExpiry(deal.expires_at);
                return (
                  <Card
                    key={deal.id}
                    className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50"
                  >
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={deal.image_url || deal.business?.image_url || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400"}
                        alt={deal.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />

                      {/* Discount Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-warm text-warm-foreground font-bold text-sm px-3 py-1">
                          {deal.discount}
                        </Badge>
                      </div>

                      {/* Promo Code Badge */}
                      {deal.promo_code && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="gap-1 font-mono">
                            {deal.promo_code}
                          </Badge>
                        </div>
                      )}

                      {/* Business Name */}
                      <div className="absolute bottom-3 left-3">
                        <p className="text-sm font-medium text-foreground">
                          {deal.business?.name || "Business"}
                        </p>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {deal.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {deal.description || "Check out this amazing deal!"}
                        </p>
                      </div>

                      {/* Category */}
                      {deal.category && (
                        <Badge variant="outline" className="text-xs">
                          {categoryMap[deal.category] || deal.category}
                        </Badge>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {daysLeft !== null && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {daysLeft > 0 ? `${daysLeft}d left` : "Expires today"}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {deal.clicks_count || 0} claimed
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleClaim(deal)}
                        className="w-full gradient-warm text-primary-foreground"
                        size="sm"
                      >
                        Claim Deal
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {deals.length === 0
                  ? "No deals available yet. Check back soon!"
                  : "No deals found matching your criteria"}
              </p>
            </div>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
}
