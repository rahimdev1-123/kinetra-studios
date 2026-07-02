"use client";

import { Section } from "./section";
import { Reveal } from "./reveal";
import { ABOUT } from "@/lib/site-data";

/**
 * About — 01:20 ABOUT
 * Photo, short bio, and three stat callouts in mono — styled like
 * on-screen counters.
 */
export function About() {
  return (
    <Section id="about" tc="01:20" label="ABOUT" seconds={80}>
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
        {/* photo */}
        <Reveal>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-lift/20 via-shadow to-highlight/15">
            <img
              src={ABOUT.photo}
              alt={`Portrait of ${ABOUT.name}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-shadow/50 via-transparent to-transparent" />
            <span className="kin-mono absolute bottom-4 left-4 rounded border border-border bg-shadow/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-print/80 backdrop-blur-sm">
              {ABOUT.name}
            </span>
          </div>
        </Reveal>

        {/* bio + stats */}
        <div>
          <Reveal>
            <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
              Behind the edit
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-base leading-relaxed text-print/75">
              {ABOUT.bio}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {ABOUT.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border bg-shadow/60 p-4 text-center"
                >
                  <div className="kin-mono text-[10px] uppercase tracking-[0.14em] text-ash">
                    {stat.label}
                  </div>
                  <div className="kin-mono mt-2 text-2xl font-semibold text-highlight sm:text-3xl">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
