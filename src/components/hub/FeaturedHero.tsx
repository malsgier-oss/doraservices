import { memo, useEffect, useRef, useState } from "react";
import { Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type BannerItem = {
  id: string;
  title_ar?: string | null;
  subtitle_ar?: string | null;
  cta_text_ar?: string | null;
  target_type?: "none" | "category" | "subcategory" | "shelf";
  target_category_id?: string | null;
  target_subcategory_id?: string | null;
  target_shelf_id?: string | null;
};

type FeaturedHeroProps = {
  banners: BannerItem[];
  publicUrlsById: Record<string, string | undefined>;
  allSubcategories: any[];
  iconMap: Record<string, LucideIcon>;
  onOpenCategory: (categoryId: string) => void;
  onOpenSubcategory: (sc: { id: string; name: string; name_ar: string | null; icon: LucideIcon; color: string | null }) => void;
  onScrollToShelf: (shelfId: string) => void;
  language: "ar" | "en";
  isRTL?: boolean;
  fallbackTitle: string;
  fallbackCta: string;
};

const FeaturedHero = memo(function FeaturedHero({
  banners,
  publicUrlsById,
  allSubcategories,
  iconMap,
  onOpenCategory,
  onOpenSubcategory,
  onScrollToShelf,
  language,
  isRTL,
  fallbackTitle,
  fallbackCta,
}: FeaturedHeroProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const pauseUntilRef = useRef<number>(0);
  const scrollRafRef = useRef<number | null>(null);
  const programmaticRef = useRef(false);

  const interactedRef = useRef(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);

  const markInteracted = () => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      setAutoplayEnabled(true);
    }
    pauseUntilRef.current = Date.now() + 6000;
  };

  useEffect(() => {
    if (banners.length === 0) return;
    setIndex((i) => Math.min(i, banners.length - 1));
  }, [banners.length]);

  useEffect(() => {
    if (!autoplayEnabled) return;
    if (banners.length <= 1) return;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() < pauseUntilRef.current) return;
      setIndex((i) => (i + 1) % banners.length);
    }, 5200);

    return () => window.clearInterval(id);
  }, [autoplayEnabled, banners.length]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const child = el.children.item(index) as HTMLElement | null;
    if (!child) return;

    programmaticRef.current = true;
    const timeout = window.setTimeout(() => {
      programmaticRef.current = false;
    }, 650);

    child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    return () => window.clearTimeout(timeout);
  }, [index]);

  const handleScroll = () => {
    markInteracted();
    if (programmaticRef.current) return;
    if (scrollRafRef.current) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = rowRef.current;
      if (!el) return;

      const containerRect = el.getBoundingClientRect();
      const targetX = (containerRect.left + containerRect.right) / 2;

      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children.item(i) as HTMLElement | null;
        if (!child) continue;
        const r = child.getBoundingClientRect();
        const anchorX = (r.left + r.right) / 2;
        const dist = Math.abs(anchorX - targetX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      setIndex(bestIdx);
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  if (!banners || banners.length === 0) return null;

  const getText = (banner: BannerItem, key: "title" | "subtitle" | "cta_text") => {
    const anyBanner = banner as any;
    const ar = anyBanner[`${key}_ar`] ?? anyBanner[key];
    const en = anyBanner[`${key}_en`];
    if (language === "ar") return String(ar || en || "");
    return String(en || ar || "");
  };

  return (
    <div className="space-y-2">
      <div
        ref={rowRef}
        dir="ltr"
        className="flex w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" as any, touchAction: "pan-x pan-y" }}
        onScroll={handleScroll}
        onPointerDown={markInteracted}
        onTouchStart={markInteracted}
        onWheel={markInteracted}
      >
        {banners.map((banner, idx) => {
          const url = publicUrlsById[banner.id];
          const bannerTitle = getText(banner, "title") || fallbackTitle;
          const bannerSubtitle = getText(banner, "subtitle");
          const bannerCta = getText(banner, "cta_text") || fallbackCta;
          const targetType = banner.target_type || "none";
          const clickable = targetType !== "none";

          const handleAction = () => {
            if (targetType === "category" && banner.target_category_id) {
              onOpenCategory(banner.target_category_id);
              return;
            }
            if (targetType === "subcategory" && banner.target_subcategory_id) {
              const sc = (allSubcategories || []).find((s) => s.id === banner.target_subcategory_id);
              if (!sc) return;
              const Icon = iconMap[sc.icon] || Wrench;
              onOpenSubcategory({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color });
              return;
            }
            if (targetType === "shelf" && banner.target_shelf_id) {
              onScrollToShelf(banner.target_shelf_id);
            }
          };

          const card = (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted">
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <div
                  className="space-y-1 rounded-2xl bg-black/35 px-4 py-3 text-white"
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  <div className="text-base font-semibold line-clamp-1">{bannerTitle}</div>
                  {bannerSubtitle ? (
                    <div className="text-sm text-white/80 line-clamp-1">{bannerSubtitle}</div>
                  ) : null}
                  {clickable ? (
                    <div className="pt-2">
                      <span className="inline-flex h-9 items-center rounded-full bg-white/90 px-4 text-sm font-semibold text-foreground">
                        {bannerCta}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );

          return clickable ? (
            <button
              key={banner.id}
              type="button"
              className="shrink-0 w-full snap-center transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              style={{ scrollSnapAlign: "center" }}
              onClick={handleAction}
            >
              {card}
            </button>
          ) : (
            <div key={banner.id} className="shrink-0 w-full snap-center" style={{ scrollSnapAlign: "center" }}>
              {card}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              aria-label={`Banner ${i + 1}`}
              className={`h-2 w-2 rounded-full transition ${i === index ? "bg-foreground" : "bg-muted-foreground/30"}`}
              onClick={() => {
                markInteracted();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export { FeaturedHero };
