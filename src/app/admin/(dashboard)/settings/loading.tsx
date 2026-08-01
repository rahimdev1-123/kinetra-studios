import { Skeleton } from "@/components/ui/skeleton";

/**
 * Kinetra CRM — /admin/settings route-level loading state (Phase 9).
 * Mirrors the page layout so navigation feels instant.
 */

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Tabs bar */}
      <Skeleton className="h-11 w-full" />

      {/* Section cards */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-6"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end border-t border-border pt-4">
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}