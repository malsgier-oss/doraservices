import { useState } from "react";
import { Edit2, Trash2, Pause, Play, Eye, MousePointer, MoreVertical, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Deal } from "@/hooks/useDeals";
import { format } from "date-fns";

interface DealsListProps {
  deals: Deal[];
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => Promise<void>;
  onToggleStatus: (deal: Deal) => Promise<void>;
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  scheduled: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground border-border",
  paused: "bg-warm text-warm-foreground border-warm-foreground/20",
};

const categoryLabels: Record<string, string> = {
  food: "Food & Dining",
  shopping: "Shopping",
  services: "Services",
  banking: "Banking",
  health: "Health & Beauty",
  entertainment: "Entertainment",
  travel: "Travel",
  other: "Other",
};

export function DealsList({ deals, onEdit, onDelete, onToggleStatus }: DealsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (dealToDelete) {
      await onDelete(dealToDelete);
      setDealToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  if (deals.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-card p-8 text-center">
        <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-semibold text-lg mb-2">No deals yet</h3>
        <p className="text-muted-foreground">
          Create your first deal to start attracting customers
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-card rounded-xl shadow-card p-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex gap-4">
              {/* Image */}
              {deal.image_url && (
                <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                  <img
                    src={deal.image_url}
                    alt={deal.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-foreground truncate">{deal.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {deal.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(deal)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleStatus(deal)}>
                        {deal.status === "active" ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDealToDelete(deal.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="outline" className={statusColors[deal.status || "draft"]}>
                    {deal.status || "draft"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {deal.discount}
                  </Badge>
                  {deal.category && (
                    <span className="text-xs text-muted-foreground">
                      {categoryLabels[deal.category] || deal.category}
                    </span>
                  )}
                </div>

                {/* Stats & Dates */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                  {deal.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(deal.start_date), "MMM d")} -{" "}
                        {deal.expires_at ? format(new Date(deal.expires_at), "MMM d") : "No end"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{deal.views_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-3 w-3" />
                    <span>{deal.clicks_count || 0}</span>
                  </div>
                  {deal.promo_code && (
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                      {deal.promo_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
