import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-xl bg-muted", className)}
      {...props}
    />
  );
}

/* Pre-built skeleton shapes */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border/40 bg-card p-6", className)}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="mt-3 h-3 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}

function SkeletonClothingCard({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border/40 bg-card", className)}>
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonClothingCard, SkeletonText };
