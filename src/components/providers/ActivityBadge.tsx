import { cn } from "@/lib/utils";

type Props = {
  /** ISO date string or null */
  lastActivityAt?: string | null;
  className?: string;
  rtl?: boolean;
};

function bucketActivity(lastActivityAt?: string | null): "today" | "week" | "none" {
  if (!lastActivityAt) return "none";
  const dt = new Date(lastActivityAt);
  if (Number.isNaN(dt.getTime())) return "none";

  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return "today";
  if (diffDays <= 7) return "week";
  return "none";
}

/**
 * A small, honest "alive" signal.
 * - Buckets only (today / this week)
 * - No exact timestamps
 */
export function ActivityBadge({ lastActivityAt, className, rtl }: Props) {
  const bucket = bucketActivity(lastActivityAt);
  if (bucket === "none") return null;

  const isToday = bucket === "today";
  const label = rtl ? (isToday ? "نشط اليوم" : "نشط هذا الأسبوع") : isToday ? "Active today" : "Active this week";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        "bg-background/60 backdrop-blur",
        isToday ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700",
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isToday ? "bg-emerald-500" : "bg-amber-500",
          // soft pulse for "today" only
          isToday && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
