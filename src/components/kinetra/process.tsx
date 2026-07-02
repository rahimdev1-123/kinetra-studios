"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { PROCESS } from "@/lib/site-data";

/**
 * Process — 01:52 PROCESS
 * A real sequence, so ordered labels are justified:
 * Discovery Call → Footage & Brief → Edit & Revisions → Delivery
 */
export function Process() {
  return (
    <Section id="process" tc="01:52" label="PROCESS" seconds={112}>
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
            How the edit gets made
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-sm text-sm text-ash">
            Four steps, no surprises. You always know where the cut is.
          </p>
        </Reveal>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        {PROCESS.map((p, i) => (
          <Fragment key={p.step}>
            <Reveal delay={i * 0.08} className="flex-1">
              <div className="flex h-full flex-col rounded-lg border border-border bg-shadow/50 p-6">
                <span className="kin-mono text-sm tabular-nums text-highlight">
                  {p.step}
                </span>
                <h3 className="kin-display mt-3 text-xl uppercase tracking-wide text-print">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-print/70">
                  {p.description}
                </p>
              </div>
            </Reveal>

            {i < PROCESS.length - 1 && (
              <div className="flex items-center justify-center text-ash" aria-hidden>
                <ArrowDown className="size-5 md:hidden" />
                <ArrowRight className="hidden size-5 md:block" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </Section>
  );
}
