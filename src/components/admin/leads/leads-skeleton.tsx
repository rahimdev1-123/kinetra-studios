import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — loading skeletons for the leads list (Phase 3).
 *
 * LeadsTableSkeleton mirrors the table card geometry and is used both by
 * the route-level loading.tsx and as the Suspense fallback while a new
 * search/filter/page combination streams in.
 */

const SKELETON_ROWS = 8;

export function LeadsTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-hidden="true"
    >
      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="hidden h-3 w-40 md:block" />
        <Skeleton className="hidden h-3 w-24 lg:block" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>

      {/* Body rows */}
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-24 lg:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function LeadsToolbarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
      <Skeleton className="h-9 w-full max-w-sm" />
      <Skeleton className="h-9 w-[130px]" />
      <Skeleton className="h-9 w-[150px]" />
      <Skeleton className="h-9 w-[130px]" />
      <Skeleton className="h-9 w-[120px]" />
      <Skeleton className="h-9 w-[120px]" />
    </div>
  );
}