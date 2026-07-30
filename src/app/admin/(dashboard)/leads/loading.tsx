import { Skeleton } from "@/components/ui/skeleton";
import {
  LeadsTableSkeleton,
  LeadsToolbarSkeleton,
} from "@/components/admin/leads/leads-skeleton";

/**
 * Kinetra CRM — /admin/leads route-level loading UI (Phase 3).
 * Shown on first navigation while the server component streams in.
 */

export default function LeadsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <LeadsToolbarSkeleton />
      <LeadsTableSkeleton />
    </div>
  );
}