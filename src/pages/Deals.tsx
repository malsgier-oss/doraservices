import { useState } from "react";
import { Search, Tag, Sparkles, Filter } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealCard } from "@/components/deals/DealCard";
import { deals, dealCategories } from "@/data/dealsData";

export default function Deals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch = 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      selectedCategory === "All" || deal.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const exclusiveDeals = filteredDeals.filter((deal) => deal.isExclusive);
  const regularDeals = filteredDeals.filter((deal) => !deal.isExclusive);

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
              <p className="text-2xl font-bold text-warm">{exclusiveDeals.length}</p>
              <p className="text-xs text-muted-foreground">Exclusive</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {deals.reduce((acc, d) => acc + d.claimedCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Claims Today</p>
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
            {dealCategories.map((category) => (
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

          {/* Tabs */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="all" className="data-[state=active]:bg-card">
                All Deals
              </TabsTrigger>
              <TabsTrigger value="exclusive" className="data-[state=active]:bg-card">
                <Sparkles className="h-4 w-4 mr-1" />
                Exclusive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredDeals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No deals found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="exclusive" className="space-y-4">
              <div className="p-4 rounded-xl bg-warm/10 border border-warm/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-warm" />
                  <h3 className="font-semibold text-foreground">Member Exclusive</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  These special deals require points to claim. Earn points by reviewing businesses and engaging with the community!
                </p>
              </div>

              {exclusiveDeals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exclusiveDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No exclusive deals available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </Layout>
  );
}
