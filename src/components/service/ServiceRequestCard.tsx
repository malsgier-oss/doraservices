import { Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "./StatusIndicator";
import { ar } from "@/lib/i18n";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

type Status = "pending" | "in_progress" | "completed";

interface ServiceRequestCardProps {
  id: string;
  serviceTitle: string;
  providerName: string;
  providerAvatar?: string;
  status: Status;
  scheduledDate?: Date;
  requestedDate: Date;
  onViewDetails?: () => void;
  onCancel?: () => void;
}

export function ServiceRequestCard({
  serviceTitle,
  providerName,
  providerAvatar,
  status,
  scheduledDate,
  requestedDate,
  onViewDetails,
  onCancel,
}: ServiceRequestCardProps) {
  const initials = providerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card animate-fade-in">
      <div className="flex gap-4">
        {/* Status */}
        <StatusIndicator status={status} size="md" showLabel={false} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{serviceTitle}</h3>
          
          {/* Provider */}
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={providerAvatar} alt={providerName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{providerName}</span>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {scheduledDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(scheduledDate, "d MMM yyyy", { locale: arSA })}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(requestedDate, "d MMM", { locale: arSA })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(status === "pending" || onViewDetails) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 rounded-full"
              onClick={onViewDetails}
            >
              {ar.activity.viewDetails}
            </Button>
          )}
          {status === "pending" && onCancel && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full text-destructive hover:text-destructive"
              onClick={onCancel}
            >
              {ar.activity.cancelRequest}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
