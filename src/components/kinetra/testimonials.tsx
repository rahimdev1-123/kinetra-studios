"use client";

import { Quote } from "lucide-react";
import { Section } from "./section";
import { Reveal } from "./reveal";
import { TESTIMONIALS } from "@/lib/site-data";

/**
 * Testimonials — 01:38 SAID
 * Static grid of quote cards. No heavy motion — let the words carry it.
 */
export function Testimonials() {
  return (
    <Section
      id="said"
      tc="01:38"
      label="SAID"
      seconds={98}
      className="border-t border-border bg-secondary/20"
    >
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
            Said about the work
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-sm text-sm text-ash">
            Creators and brands on what changed after the edit.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={`${t.name}-${i}`} delay={i * 0.06} className="h-full">
            <figure className="flex h-full flex-col rounded-lg border border-border bg-shadow/60 p-6 sm:p-8">
              <Quote className="size-6 text-highlight/60" aria-hidden />
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-print/85">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-gradient-to-br from-lift/30 to-highlight/20">
                  <img
                    src={t.headshot}
                    alt={t.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-print">
                    {t.name}
                  </div>
                  <div className="kin-mono truncate text-[11px] uppercase tracking-[0.1em] text-ash">
                    {t.role}
                  </div>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
