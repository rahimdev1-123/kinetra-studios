"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SectionMarker } from "./section";
import { Reveal } from "./reveal";
import { CLIPS, type Clip } from "@/lib/site-data";
import { cn } from "@/lib/utils";

/**
 * Portfolio — 00:24 WORK
 * Horizontal-scroll filmstrip on md+, vertical stack on mobile.
 * Click a clip to open a lightbox player (real mp4 plays when wired up;
 * until then the cinematic still holds with a placeholder note).
 */
export function Portfolio() {
  const reduce = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Clip | null>(null);

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>("[data-clip]")?.offsetWidth ?? 440;
    el.scrollBy({ left: dir * (cardWidth + 24), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section
      id="work"
      data-tc={24}
      className="relative scroll-mt-20 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionMarker tc="00:24" label="WORK" className="mb-10 sm:mb-14" />

        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <h2 className="kin-display text-print text-4xl sm:text-5xl lg:text-6xl">
              Selected work
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm text-ash">
              Short-form, long-form, and motion graphics. Click any clip to
              open the player.
            </p>
          </Reveal>
        </div>

        {/* desktop scroll arrows */}
        <div className="mb-6 hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Scroll clips left"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border text-print transition-colors hover:border-highlight hover:text-highlight"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Scroll clips right"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border text-print transition-colors hover:border-highlight hover:text-highlight"
          >
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* filmstrip — full-bleed horizontal on md+, vertical stack on mobile */}
      <div
        ref={scrollerRef}
        className="kin-filmstrip-scroll flex snap-x flex-col gap-5 px-4 pb-4 sm:px-6 md:flex-row md:overflow-x-auto lg:px-8"
      >
        {CLIPS.map((clip, i) => (
          <Reveal
            key={clip.id}
            delay={i * 0.06}
            className="w-full md:w-[440px] md:shrink-0 md:snap-start"
            as="div"
          >
            <button
              type="button"
              data-clip
              onClick={() => setActive(clip)}
              aria-label={`Play clip: ${clip.title}`}
              className="group block w-full text-left"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-lift/30 via-shadow to-highlight/25">
                <img
                  src={clip.thumbnail}
                  alt={clip.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* legibility gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-shadow/70 via-transparent to-shadow/20" />

                {/* category tag */}
                <span className="kin-mono absolute left-3 top-3 rounded border border-border bg-shadow/70 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-highlight backdrop-blur-sm">
                  {clip.category}
                </span>
                {/* duration */}
                <span className="kin-mono absolute bottom-3 right-3 rounded bg-shadow/70 px-2 py-1 text-[10px] tabular-nums text-print backdrop-blur-sm">
                  {clip.duration}
                </span>

                {/* play affordance */}
                <span className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    className="flex size-14 items-center justify-center rounded-full border border-highlight/60 bg-shadow/40 text-highlight backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-highlight group-hover:text-primary-foreground"
                    whileHover={reduce ? undefined : { scale: 1.05 }}
                  >
                    <Play className="size-5 fill-current" />
                  </motion.span>
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <h3 className="truncate text-sm font-medium text-print">
                  {clip.title}
                </h3>
                <span className="kin-mono shrink-0 text-[10px] uppercase tracking-[0.12em] text-ash transition-colors group-hover:text-highlight">
                  Play
                </span>
              </div>
            </button>
          </Reveal>
        ))}

        {/* trailing spacer so the last card scrolls fully into view on md+ */}
        <div className="hidden w-2 shrink-0 md:block" aria-hidden />
      </div>

      {/* ---------- lightbox player ---------- */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden rounded-lg border-border bg-shadow p-0 sm:max-w-5xl">
          <DialogTitle className="sr-only">
            {active?.title ?? "Clip player"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Video player for the selected clip.
          </DialogDescription>

          {/* player surface */}
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {active && (
              <ClipPlayer clip={active} />
            )}
            {/* close button (custom, over the video) */}
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close player"
              className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border bg-shadow/70 text-print backdrop-blur-sm transition-colors hover:border-highlight hover:text-highlight"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* meta bar */}
          {active && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-print">
                  {active.title}
                </h3>
                <p className="kin-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-ash">
                  {active.category} · {active.duration}
                </p>
              </div>
              <span className="kin-mono rounded border border-dashed border-highlight/40 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-highlight/80">
                EDITED IN PREMIERE PRO + AFTER EFFECTS
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** The actual player: real mp4 when wired up, otherwise the cinematic still. */
function ClipPlayer({ clip }: { clip: Clip }) {
  const hasVideo = clip.videoSrc && clip.videoSrc !== "PLACEHOLDER";
  if (hasVideo) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-contain"
        autoPlay
        controls
        playsInline
        poster={clip.thumbnail}
      >
        <source src={clip.videoSrc} type="video/mp4" />
      </video>
    );
  }
  return (
    <div className="absolute inset-0">
      <img
        src={clip.thumbnail}
        alt={clip.title}
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-shadow/40">
        <span className="flex size-16 items-center justify-center rounded-full border border-highlight/50 bg-shadow/40 text-highlight backdrop-blur-sm">
          <Play className="size-6 fill-current" />
        </span>
        <span className="kin-mono text-[10px] uppercase tracking-[0.16em] text-print/70">
          Preview still — video pending
        </span>
      </div>
    </div>
  );
}
