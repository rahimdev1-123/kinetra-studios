"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Kinetra CRM — /admin/leads error boundary (Phase 3).
 * Catches data-layer failures (network, database, misconfiguration) and
 * offers retry without losing the admin shell.
 */

interface LeadsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LeadsError({ error, reset }: LeadsErrorProps) {
  useEffect(() => {
    console.error("[admin/leads] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-destructive/40 bg-card/40 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
        <AlertTriangle
          className="h-5 w-5 text-destructive"
          aria-hidden="true"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Couldn&apos;t load leads
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Something went wrong while fetching the lead list. This is usually
          temporary — try again, and check the server logs
          {error.digest ? (
            <>
              {" "}
              (digest{" "}
              <code className="font-mono text-xs">{error.digest}</code>)
            </>
          ) : null}{" "}
          if it persists.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={reset} size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}