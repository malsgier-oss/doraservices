import { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useSubcategories } from "@/hooks/useSubcategories";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";

type Category = {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
};

type SubcategoryRow = {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
};

export type CategoryBrowseSheetSelect = (subcat: {
  id: string;
  name: string;
  name_ar?: string | null;
  icon: LucideIcon;
  color: string | null;
}) => void;

export function CategoryBrowseSheet({
  open,
  onOpenChange,
  category,
  iconMap,
  onSelectSubcategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  iconMap: Record<string, LucideIcon>;
  onSelectSubcategory: CategoryBrowseSheetSelect;
}) {
  const categoryId = category?.id;
  const { data: subcats, isLoading, error } = useSubcategories(categoryId || undefined);

  const list = useMemo(() => {
    return (subcats || [])
      .filter((s) => (s as any).is_active !== false)
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)) as unknown as SubcategoryRow[];
  }, [subcats]);

  if (!category) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[70dvh] max-h-[70dvh] flex flex-col overflow-hidden mt-0">
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-11 w-11 rounded-full bg-muted flex items-center justify-center">
            <X className="h-5 w-5 text-muted-foreground" />
          </DrawerClose>

          <div className="flex flex-col items-center pt-2">
            <DrawerTitle className="text-xl font-bold text-foreground">{category.name_ar || category.name}</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">اختر خدمة</p>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-muted-foreground">تعذر تحميل الخدمات. حاول مرة أخرى</div>
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🧩</div>
                <div className="text-muted-foreground">لا توجد خدمات داخل هذا القسم بعد</div>
              </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                {list.map((s) => {
                  const Icon = iconMap[s.icon] || Wrench;
                  return (
                    <button
                      key={s.id}
                        className={`${HUB_CARD_BASE} bg-card min-h-[96px] p-4 flex items-center gap-4 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.99] touch-manipulation`}
                      onClick={() => onSelectSubcategory({ id: s.id, name: s.name, name_ar: s.name_ar, icon: Icon, color: s.color })}
                    >
                      <div
                          className="h-14 w-14 rounded-full flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: (s.color || "#888") + "1f" }}
                      >
                          <Icon className="h-7 w-7 text-foreground" strokeWidth={2.1} />
                      </div>
                      <div className="min-w-0 text-right">
                          <div className="text-[15px] font-semibold truncate">{s.name_ar || s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{category.name_ar || category.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4">
              <Button variant="secondary" className="w-full h-11" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
