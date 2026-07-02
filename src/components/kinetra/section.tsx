import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionMarker — the timeline label that opens each section
 * (e.g. `00:24 WORK`). Mono type, timecode in highlight.
 */
export function SectionMarker({
  tc,
  label,
  className,
}: {
  tc: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "kin-mono flex items-center gap-3 text-xs uppercase text-ash",
        className,
      )}
    >
      <span className="text-highlight tabular-nums">{tc}</span>
      <span className="h-px w-8 bg-ash/40" aria-hidden />
      <span className="text-print/80">{label}</span>
    </div>
  );
}

/**
 * Section — standard section wrapper. Carries the timeline anchor
 * (`id` + `data-tc` seconds) that the scrubber reads to map scroll
 * position onto reel time.
 */
export function Section({
  id,
  tc,
  label,
  seconds,
  children,
  className,
  innerClassName,
}: {
  id: string;
  tc: string;
  label: string;
  seconds: number;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section
      id={id}
      data-tc={seconds}
      className={cn("relative scroll-mt-20 py-20 sm:py-28", className)}
    >
      <div
        className={cn(
          "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8",
          innerClassName,
        )}
      >
        <SectionMarker tc={tc} label={label} className="mb-10 sm:mb-14" />
        {children}
      </div>
    </section>
  );
}
