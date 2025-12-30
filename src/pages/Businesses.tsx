import { useState } from "react";
import { Search, SlidersHorizontal, Grid3X3, Map } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { BusinessCard } from "@/components/business/BusinessCard";
import { BusinessMap } from "@/components/business/BusinessMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  "All",
  "Restaurants",
  "Cafes",
  "Retail",
  "Services",
  "Health & Fitness",
  "Entertainment",
];

const Businesses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Fetch businesses from database
  const { data: dbBusinesses = [], isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Transform database businesses to match BusinessCard props
  const businesses = dbBusinesses.map((business) => ({
    id: business.id,
    name: business.name,
    category: business.category,
    image: business.image_url || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
    rating: 4.5, // Default rating since we don't have reviews yet
    reviewCount: 0,
    address: business.location || "Location not specified",
    isOpen: true,
    featured: false,
    description: business.description,
    coordinates: { lng: -122.4194, lat: 37.7749 }, // Default coordinates
  }));

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      business.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      {/* Header */}
      <section className="bg-warm py-12">
        <div className="container">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Local Businesses
          </h1>
          <p className="text-muted-foreground mb-6">
            Discover and support businesses in your community
          </p>

          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-card border-0 shadow-card"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex bg-card rounded-lg p-1 shadow-card">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className="px-3"
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="h-10 px-4">
                <SlidersHorizontal className="h-5 w-5 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-border bg-card sticky top-16 z-40">
        <div className="container py-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Showing {filteredBusinesses.length} businesses
              </p>

              {viewMode === "map" ? (
                <BusinessMap businesses={filteredBusinesses} />
              ) : filteredBusinesses.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBusinesses.map((business, index) => (
                    <div
                      key={business.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <BusinessCard {...business} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">
                    No businesses found matching your criteria
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Businesses;
