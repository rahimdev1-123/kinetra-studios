"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { SERVICES, SERVICES_FOOTNOTE } from "@/lib/site-data";
import { scrollToSection } from "./timeline-scrubber";
import { cn } from "@/lib/utils";

/**
 * Services — 00:52 SERVICES
 * Three package cards (Starter / Pro / Premium). Pro is featured.
 */
export function Services() {
  return (
    <Section
      id="services"
      tc="00:52"
      label="SERVICES"
      seconds={52}
      className="border-t border-border bg-secondary/20"
    >
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
            Packages
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-sm text-sm text-ash">
            Pick a tier, or talk to me about a retainer. Every package is built
            around story first, polish second.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.name} delay={i * 0.08} className="h-full">
            <div
              className={cn(
                "relative flex h-full flex-col rounded-lg border p-6 transition-colors",
                s.featured
                  ? "border-highlight/60 bg-shadow"
                  : "border-border bg-shadow/60 hover:border-print/25",
              )}
            >
              {s.featured && (
                <span className="kin-mono absolute -top-3 left-6 rounded-full bg-highlight px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-primary-foreground">
                  Most popular
                </span>
              )}

              <h3 className="kin-display text-2xl uppercase tracking-wide text-print">
                {s.name}
              </h3>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-print">
                  {s.price}
                </span>
                <span className="kin-mono text-xs text-ash">{s.cadence}</span>
              </div>
              <p className="kin-mono mt-2 text-[11px] uppercase tracking-[0.1em] text-highlight/80">
                {s.turnaround}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {s.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-sm text-print/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-highlight" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => scrollToSection("contact")}
                variant={s.featured ? "default" : "outline"}
                className={cn(
                  "mt-7 h-11 w-full rounded-none text-xs font-semibold uppercase tracking-[0.12em] transition-transform hover:scale-[1.02]",
                  !s.featured &&
                    "border-print/30 bg-transparent text-print hover:border-highlight hover:bg-transparent hover:text-highlight",
                )}
              >
                {s.cta}
              </Button>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <p className="kin-mono mt-10 text-center text-[11px] uppercase tracking-[0.12em] text-ash">
          {SERVICES_FOOTNOTE}
        </p>
      </Reveal>
    </Section>
  );
}
