import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — /admin/analytics loading UI (Phase 6).
 * Mirrors the dashboard geometry while server aggregations stream in.
 */

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[120px]" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="ml-auto h-9 w-[130px]" />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Trend */}
      <div className="rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-[260px] w-full" />
      </div>

      {/* Chart pairs */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-[260px] w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-[220px] w-full" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-3 w-28" />
          <div className="mt-4 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}