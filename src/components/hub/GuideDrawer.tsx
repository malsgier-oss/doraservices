import { memo } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export type GuideDrawerData = {
  id: string;
  title: string;
  bullets: string[];
};

type Props = {
  open: boolean;
  guide: GuideDrawerData | null;
  onOpenChange: (open: boolean) => void;
};

export const GuideDrawer = memo(function GuideDrawer({ open, guide, onOpenChange }: Props) {
  if (!guide) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-base">{guide.title}</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <ul className="space-y-2 text-sm">
            {(guide.bullets || []).slice(0, 6).map((b, idx) => (
              <li key={`${guide.id}-b-${idx}`} className="flex gap-2">
                <span className="mt-[2px]">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
});
