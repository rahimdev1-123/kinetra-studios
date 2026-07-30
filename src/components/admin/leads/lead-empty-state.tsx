import Link from "next/link";
import { Inbox, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Kinetra CRM — leads empty state (Phase 3).
 *
 * Two variants:
 *  - no leads exist at all (fresh CRM)
 *  - no leads match the current search/filters (offers a one-click reset)
 */

interface LeadEmptyStateProps {
  hasFilters: boolean;
}

export function LeadEmptyState({ hasFilters }: LeadEmptyStateProps) {
  const Icon = hasFilters ? SearchX : Inbox;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
        <Icon
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-foreground">
        {hasFilters ? "No leads match your filters" : "No leads yet"}
      </h2>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try broadening the search, clearing a filter, or widening the date range."
          : "New inquiries from the public contact form will land here the moment they arrive."}
      </p>

      {hasFilters ? (
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/admin/leads">Clear all filters</Link>
        </Button>
      ) : (
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Standing by
        </p>
      )}
    </div>
  );
}