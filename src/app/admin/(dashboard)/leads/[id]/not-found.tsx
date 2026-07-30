import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Kinetra CRM — not-found UI for /admin/leads/[id] (Phase 3).
 * Rendered inside the admin shell when a lead id doesn't exist.
 */

export default function LeadNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
        <FileQuestion
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Lead not found
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This lead doesn&apos;t exist — it may have been deleted, or the
          link is stale.
        </p>
      </div>

      <Button asChild variant="outline" size="sm">
        <Link href="/admin/leads">Back to leads</Link>
      </Button>
    </div>
  );
}