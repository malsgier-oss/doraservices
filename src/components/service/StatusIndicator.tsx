import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type Status = "pending" | "in_progress" | "completed";

interface StatusIndicatorProps {
  status: Status;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function StatusIndicator({ status, size = "md", showLabel = true }: StatusIndicatorProps) {
  const { t } = useLanguage();
  
  const statusConfig = {
    pending: {
      label: t.activity.pending,
      ringClass: "stroke-pending",
      dotClass: "bg-pending",
      progress: 25,
    },
    in_progress: {
      label: t.activity.inProgress,
      ringClass: "stroke-in-progress",
      dotClass: "bg-in-progress",
      progress: 60,
    },
    completed: {
      label: t.activity.completed,
      ringClass: "stroke-completed",
      dotClass: "bg-completed",
      progress: 100,
    },
  };

  const config = statusConfig[status];
  
  const sizes = {
    sm: { container: "w-8 h-8", stroke: 3, radius: 12 },
    md: { container: "w-12 h-12", stroke: 4, radius: 18 },
    lg: { container: "w-16 h-16", stroke: 5, radius: 26 },
  };
  
  const { container, stroke, radius } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (config.progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn("relative flex items-center justify-center", container)}>
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full progress-ring">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-500", config.ringClass)}
          />
        </svg>
        {/* Center dot */}
        <div className={cn("w-2 h-2 rounded-full", config.dotClass)} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
