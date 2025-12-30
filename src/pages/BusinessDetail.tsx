import { useParams, Link } from "react-router-dom";
import {
  Star,
  MapPin,
  Phone,
  Clock,
  Share2,
  Heart,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { reviews } from "@/data/mockData";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [newReview, setNewReview] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [saved, setSaved] = useState(false);

  // Fetch business from database
  const {
    data: business,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["business", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Transform to match expected format
      return {
        id: data.id,
        name: data.name,
        category: data.category,
        image:
          data.image_url ||
          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
        rating: 4.5,
        reviewCount: 0,
        address: data.location || "Location not specified",
        isOpen: true,
        featured: false,
        description: data.description || "No description available.",
        phone: "Contact not available",
        hours: "Hours not specified",
      };
    },
    enabled: !!id,
  });

  const businessReviews = reviews.filter((r) => r.businessId === id);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">
            Couldn’t load this business
          </h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Link to="/businesses">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!business) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">
            Business not found
          </h1>
          <Link to="/businesses">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const handleSubmitReview = () => {
    if (newReview && selectedRating > 0) {
      toast({
        title: "Review submitted!",
        description: "Thank you for sharing your experience.",
      });
      setNewReview("");
      setSelectedRating(0);
    } else {
      toast({
        title: "Please complete your review",
        description: "Add a rating and write your review before submitting.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        <img
          src={business.image}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <Link to="/businesses">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              setSaved(!saved);
              toast({
                title: saved ? "Removed from saved" : "Saved!",
              });
            }}
          >
            <Heart
              className={`h-5 w-5 ${saved ? "fill-destructive text-destructive" : ""}`}
            />
          </Button>
          <Button variant="secondary" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-1">
                    {business.name}
                  </h1>
                  <p className="text-muted-foreground">{business.category}</p>
                </div>
                <div className="flex items-center gap-2 bg-warm px-3 py-2 rounded-lg">
                  <Star className="h-5 w-5 fill-star text-star" />
                  <span className="font-display font-bold text-foreground">
                    {business.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({business.reviewCount})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={business.isOpen ? "default" : "secondary"}
                  className={
                    business.isOpen ? "bg-success text-success-foreground" : ""
                  }
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {business.isOpen ? "Open Now" : "Closed"}
                </Badge>
                {business.featured && (
                  <Badge className="bg-primary text-primary-foreground">
                    Featured
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-2xl p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed">
                {business.description}
              </p>
            </div>

            {/* Write Review */}
            <div className="bg-card rounded-2xl p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold mb-4">
                Write a Review
              </h2>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedRating(i + 1)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        i < selectedRating
                          ? "fill-star text-star"
                          : "text-muted"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {selectedRating > 0 && `${selectedRating} star${selectedRating > 1 ? "s" : ""}`}
                </span>
              </div>
              <Textarea
                placeholder="Share your experience..."
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                className="mb-4 min-h-[100px]"
              />
              <Button onClick={handleSubmitReview} variant="warm">
                <MessageSquare className="h-4 w-4" />
                Submit Review
              </Button>
            </div>

            {/* Reviews */}
            <div>
              <h2 className="font-display text-xl font-semibold mb-4">
                Reviews ({businessReviews.length})
              </h2>
              <div className="space-y-4">
                {businessReviews.map((review) => (
                  <ReviewCard key={review.id} {...review} />
                ))}
                {businessReviews.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No reviews yet. Be the first to review!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-6 shadow-card sticky top-24">
              <h3 className="font-display font-semibold mb-4">
                Contact & Hours
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {business.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      {business.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Hours</p>
                    <p className="text-sm text-muted-foreground">
                      {business.hours}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <Button className="w-full" variant="warm" size="lg">
                  Get Directions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BusinessDetail;
