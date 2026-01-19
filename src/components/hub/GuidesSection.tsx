import { memo } from "react";
import { BookOpen } from "lucide-react";

export type GuideCard = {
  id: string;
  title: string;
  summaryLines: string[];
};

type Props = {
  title: string;
  guides: GuideCard[];
  isRTL?: boolean;
  onOpenGuide: (guideId: string) => void;
};

export const GuidesSection = memo(function GuidesSection({ title, guides, isRTL, onOpenGuide }: Props) {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="space-y-2" id="guides">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">{title}</div>
        <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>

      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" as any }}
      >
        {guides.map((g) => (
          <button
            key={g.id}
            type="button"
            className="shrink-0 w-[78%] md:w-[50%] rounded-2xl border bg-muted/20 p-3 text-left hover:bg-muted/30 transition"
            style={{ scrollSnapAlign: "start" }}
            onClick={() => onOpenGuide(g.id)}
          >
            <div className="font-semibold text-sm line-clamp-1">{g.title}</div>
            <div className="mt-1 text-xs text-muted-foreground space-y-1">
              {(g.summaryLines || []).slice(0, 2).map((ln, idx) => (
                <div key={`${g.id}-s-${idx}`} className="line-clamp-1">
                  {ln}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
