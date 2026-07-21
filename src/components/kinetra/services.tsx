"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { SERVICES, SERVICES_FOOTNOTE } from "@/lib/site-data";
import { scrollToSection } from "./timeline-scrubber";
import { cn } from "@/lib/utils";

/**
 * SERVICES — 00:52
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
          <div>
            <p className="kin-mono mb-3 text-[11px] uppercase tracking-[0.18em] text-highlight">
              SERVICES
            </p>

            <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
              EDITING BUILT TO PERFORM.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="max-w-md text-sm leading-7 text-ash">
            Whether you need a single cinematic edit or an ongoing editing
            partner, every project is crafted to elevate your content,
            strengthen your brand, and keep people watching.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.name} delay={i * 0.08} className="h-full">
            <div
              className={cn(
                "relative flex h-full flex-col rounded-lg border p-6 transition-all duration-300",
                s.featured
                  ? "border-highlight/70 bg-shadow shadow-lg shadow-highlight/10"
                  : "border-border bg-shadow/60 hover:border-highlight/40",
              )}
            >
              {s.featured && (
                <span className="kin-mono absolute -top-3 left-6 rounded-full bg-highlight px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-primary-foreground">
                  Most Popular
                </span>
              )}

              <h3 className="kin-display text-2xl uppercase tracking-wide text-print">
                {s.name}
              </h3>

              <div className="mt-4 flex items-end gap-2">
                <span className="text-3xl font-semibold text-print">
                  {s.price}
                </span>

                <span className="kin-mono mb-1 text-xs text-ash">
                  {s.cadence}
                </span>
              </div>

              {s.turnaround && (
                <p className="kin-mono mt-3 text-[11px] uppercase tracking-[0.12em] text-highlight">
                  {s.turnaround}
                </p>
              )}

              <ul className="mt-7 flex-1 space-y-3">
                {s.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-print/85"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />

                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => scrollToSection("contact")}
                variant={s.featured ? "default" : "outline"}
                className={cn(
                  "mt-8 h-11 w-full rounded-none text-xs font-semibold uppercase tracking-[0.14em]",
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