import { Link } from "react-router-dom";
import { Star, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BusinessCardProps {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  address: string;
  isOpen?: boolean;
  featured?: boolean;
}

export function BusinessCard({
  id,
  name,
  category,
  image,
  rating,
  reviewCount,
  address,
  isOpen = true,
  featured = false,
}: BusinessCardProps) {
  return (
    <Link
      to={`/businesses/${id}`}
      className={`group block rounded-2xl bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 ${
        featured ? "ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {featured && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
            Featured
          </Badge>
        )}
        <div className="absolute top-3 right-3">
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className={isOpen ? "bg-success text-success-foreground" : ""}
          >
            <Clock className="h-3 w-3 mr-1" />
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{category}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-4 w-4 fill-star text-star" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({reviewCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      </div>
    </Link>
  );
}
