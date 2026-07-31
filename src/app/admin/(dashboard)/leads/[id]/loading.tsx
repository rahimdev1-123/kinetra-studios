import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — /admin/leads/[id] loading UI (Phase 4).
 * Mirrors the detail workspace geometry while the server component streams.
 */

export default function LeadDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-16" />
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40 max-w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-6 h-24 w-full" />
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-6 h-20 w-full" />
            <Skeleton className="mt-3 h-20 w-full" />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-28" />
            <div className="mt-6 flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-9 w-[180px]" />
            </div>
            <Skeleton className="mt-4 h-8 w-36" />
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-3 w-32" />
            <div className="mt-6 flex flex-col gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}