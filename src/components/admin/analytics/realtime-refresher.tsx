"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Kinetra CRM — realtime dashboard refresher (Phase 6).
 *
 * Subscribes to Postgres changes on public.leads via Supabase realtime
 * (added to the publication in migration 7). When leads are inserted or
 * updated, it debounces briefly and calls router.refresh(), re-running the
 * server-side aggregations so every KPI/chart updates live. RLS applies to
 * the subscription — only allowlisted admins receive events.
 */

const REFRESH_DEBOUNCE_MS = 2000;

export function RealtimeRefresher() {
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("kinetra-analytics-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            startTransition(() => {
              router.refresh();
            });
          }, REFRESH_DEBOUNCE_MS);
        },
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span
      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
      title={
        isLive
          ? "Connected — metrics refresh automatically when leads change"
          : "Live updates unavailable — refresh manually"
      }
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isLive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/40",
        )}
        aria-hidden="true"
      />
      {isLive ? "Live" : "Static"}
    </span>
  );
}