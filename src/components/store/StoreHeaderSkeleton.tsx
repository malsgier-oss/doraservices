import { Skeleton } from "@/components/ui/skeleton";

export function StoreHeaderSkeleton() {
  return (
    <div className="relative">
      <Skeleton className="w-full" style={{ aspectRatio: "16/9" }} />
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>
      <div className="pt-16 pb-6 px-4 space-y-4">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
        <div className="flex gap-3 justify-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}
