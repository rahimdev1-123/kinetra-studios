import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — /admin/notifications route-level loading state (Phase 8).
 * Mirrors the page layout so navigation feels instant.
 */

export default function NotificationsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 flex-1 basis-64" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/40">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}