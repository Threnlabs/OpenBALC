import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function ModuleCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-20 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-7 flex-1" />
          <Skeleton className="h-7 flex-1" />
        </div>
      </div>
    </div>
  );
}
