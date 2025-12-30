import { Clock, Users, Sparkles, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Deal } from "@/data/dealsData";
import { toast } from "@/hooks/use-toast";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const daysUntilExpiry = Math.ceil(
    (new Date(deal.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  const claimPercentage = deal.maxClaims 
    ? (deal.claimedCount / deal.maxClaims) * 100 
    : null;

  const handleClaim = () => {
    toast({
      title: "Deal Claimed!",
      description: `You've claimed "${deal.title}" from ${deal.businessName}. Show this at checkout.`,
    });
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
      <div className="relative h-32 overflow-hidden">
        <img
          src={deal.businessImage}
          alt={deal.businessName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        
        {/* Discount Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-warm text-warm-foreground font-bold text-sm px-3 py-1">
            {deal.discount}
          </Badge>
        </div>
        
        {/* Exclusive Badge */}
        {deal.isExclusive && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Exclusive
            </Badge>
          </div>
        )}
        
        {/* Business Name */}
        <div className="absolute bottom-3 left-3">
          <p className="text-sm font-medium text-foreground">{deal.businessName}</p>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{deal.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {deal.description}
          </p>
        </div>

        {/* Price Display */}
        {deal.originalPrice && deal.discountedPrice && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground line-through text-sm">
              ${deal.originalPrice}
            </span>
            <span className="text-warm font-bold">
              ${deal.discountedPrice.toFixed(2)}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {daysUntilExpiry > 0 ? `${daysUntilExpiry}d left` : "Expires today"}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {deal.claimedCount} claimed
          </div>
        </div>

        {/* Claims Progress */}
        {claimPercentage !== null && (
          <div className="space-y-1">
            <Progress value={claimPercentage} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-right">
              {deal.maxClaims! - deal.claimedCount} remaining
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={handleClaim}
          className="w-full gradient-warm text-primary-foreground"
          size="sm"
        >
          {deal.pointsCost ? (
            <span className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Claim for {deal.pointsCost} pts
            </span>
          ) : (
            "Claim Deal"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
