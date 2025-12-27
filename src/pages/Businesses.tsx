import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { BusinessCard } from "@/components/business/BusinessCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { businesses, categories } from "@/data/mockData";

const Businesses = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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

          {/* Search */}
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
            <Button variant="outline" className="h-12 px-4">
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Filters
            </Button>
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

      {/* Business Grid */}
      <section className="py-12">
        <div className="container">
          <p className="text-sm text-muted-foreground mb-6">
            Showing {filteredBusinesses.length} businesses
          </p>

          {filteredBusinesses.length > 0 ? (
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
        </div>
      </section>
    </Layout>
  );
};

export default Businesses;
