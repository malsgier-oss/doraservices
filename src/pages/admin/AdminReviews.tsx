import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Eye, EyeOff, Flag, Trash2, Star } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  content: string | null;
  rating: number;
  is_flagged: boolean;
  admin_hidden: boolean;
  created_at: string;
  user_id: string | null;
  reviewer_key?: string | null;
  service_id: string;
  provider_id: string;
  service?: { title: string };
  reviewer?: { full_name: string | null };
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", ratingFilter, statusFilter, search],
    queryFn: async () => {
      let query = supabase.from("service_reviews").select("*");

      if (ratingFilter !== "all") {
        query = query.eq("rating", parseInt(ratingFilter));
      }
      if (statusFilter === "flagged") {
        query = query.eq("is_flagged", true);
      } else if (statusFilter === "hidden") {
        query = query.eq("admin_hidden", true);
      }
      if (search) {
        query = query.ilike("content", `%${search}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Get related info
      const reviewsWithInfo = await Promise.all(
        (data || []).map(async (review) => {
          const servicePromise = supabase
            .from("services")
            .select("title")
            .eq("id", review.service_id)
            .single();

          const reviewerPromise = review.user_id
            ? supabase.from("profiles").select("full_name").eq("user_id", review.user_id).single()
            : Promise.resolve({ data: null as any });

          const [{ data: service }, { data: reviewer }] = await Promise.all([servicePromise, reviewerPromise]);

          return { ...review, service, reviewer };
        })
      );

      return reviewsWithInfo as Review[];
    },
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, isFlagged }: { id: string; isFlagged: boolean }) => {
      const { error } = await supabase
        .from("service_reviews")
        .update({ is_flagged: isFlagged })
        .eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: isFlagged ? "review_flagged" : "review_unflagged",
        p_target_type: "review",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review flag updated");
    },
    onError: () => {
      toast.error("Failed to update flag");
    },
  });

  const toggleHidden = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const { error } = await supabase
        .from("service_reviews")
        .update({ admin_hidden: isHidden })
        .eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: isHidden ? "review_hidden" : "review_shown",
        p_target_type: "review",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review visibility updated");
    },
    onError: () => {
      toast.error("Failed to update visibility");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_reviews").delete().eq("id", id);
      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "review_deleted",
        p_target_type: "review",
        p_target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Reviews</h1>
        <p className="text-muted-foreground">Moderate service reviews</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <span>All Reviews</span>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : reviews?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews?.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium max-w-32 truncate">
                      {review.service?.title || "N/A"}
                    </TableCell>
                    <TableCell>{review.reviewer?.full_name || "Anonymous"}</TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {review.content || <span className="text-muted-foreground">No content</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {review.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                        {review.admin_hidden && <Badge variant="secondary">Hidden</Badge>}
                        {!review.is_flagged && !review.admin_hidden && (
                          <Badge className="bg-green-500">Visible</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedReview(review);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={review.is_flagged ? "text-orange-500" : ""}
                          onClick={() =>
                            toggleFlag.mutate({ id: review.id, isFlagged: !review.is_flagged })
                          }
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            toggleHidden.mutate({ id: review.id, isHidden: !review.admin_hidden })
                          }
                        >
                          {review.admin_hidden ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this review?")) {
                              deleteReview.mutate(review.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="font-medium">{selectedReview.service?.title || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reviewer</p>
                <p className="font-medium">{selectedReview.reviewer?.full_name || "Anonymous"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                {renderStars(selectedReview.rating)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Content</p>
                <p className="font-medium whitespace-pre-wrap">
                  {selectedReview.content || "No content"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(selectedReview.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedReview.is_flagged && <Badge variant="destructive">Flagged</Badge>}
                {selectedReview.admin_hidden && <Badge variant="secondary">Hidden</Badge>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
