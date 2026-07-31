import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — dashboard Suspense fallbacks (Phase 7).
 * Each skeleton mirrors the geometry of the widget it stands in for, so the
 * streamed dashboard doesn't shift layout as sections resolve.
 */

export function KpiGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-3 h-3 w-36 max-w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartTilesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-6 md:col-span-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-[180px] w-full" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-[180px] w-full" />
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <Skeleton className="h-3 w-32" />
      <div className="mt-5 flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}