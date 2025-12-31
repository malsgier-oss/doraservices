import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ar } from "@/lib/i18n";

interface ServiceProviderCardProps {
  id: string;
  providerName: string;
  providerAvatar?: string;
  serviceTitle: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  onBook: () => void;
}

export function ServiceProviderCard({
  providerName,
  providerAvatar,
  serviceTitle,
  rating,
  reviewCount,
  hourlyRate,
  onBook,
}: ServiceProviderCardProps) {
  const initials = providerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-14 w-14 ring-2 ring-muted">
          <AvatarImage src={providerAvatar} alt={providerName} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{providerName}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
            {serviceTitle}
          </p>
          
          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <Star className="h-4 w-4 fill-star text-star" />
            <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">
              ({reviewCount} {ar.rating.reviews})
            </span>
          </div>
        </div>

        {/* Price & Book */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-left">
            <span className="text-xs text-muted-foreground">{ar.services.startingFrom}</span>
            <p className="font-bold text-foreground">
              {hourlyRate} {ar.common.sar}
              <span className="text-xs font-normal text-muted-foreground">
                {ar.services.perHour}
              </span>
            </p>
          </div>
          <Button 
            onClick={onBook} 
            size="sm" 
            className="rounded-full px-4"
          >
            {ar.services.bookService}
          </Button>
        </div>
      </div>
    </div>
  );
}
