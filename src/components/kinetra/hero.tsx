"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO, REEL_END_TC } from "@/lib/site-data";
import { scrollToSection } from "./timeline-scrubber";

/**
 * Hero — 00:00 INTRO
 * Full-bleed cinematic background. A real mp4 can be dropped at
 * `HERO.videoSrc`; until then the generated still plays with a subtle
 * Ken-Burns drift so the frame feels alive (no parallax gimmicks).
 * Thin letterbox bars (the fixed nav on top + a bottom bar) frame it
 * like a 2.39:1 cinematic reel.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const hasVideo = HERO.videoSrc && HERO.videoSrc !== "PLACEHOLDER";

  return (
    <section
      id="intro"
      data-tc={0}
      className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-shadow"
    >
      {/* ---------- background ---------- */}
      <div className="absolute inset-0">
        {/* still (always visible; doubles as video poster) */}
        <motion.img
          src={HERO.poster}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          animate={reduce ? undefined : { scale: [1, 1.06] }}
          transition={
            reduce
              ? undefined
              : { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
          }
        />
        {/* real video layer — only mounted when a real source exists */}
        {hasVideo && (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={HERO.poster}
          >
            <source src={HERO.videoSrc} type="video/mp4" />
          </video>
        )}
      </div>

      {/* grade + grain overlays */}
      <div className="kin-hero-overlay absolute inset-0" />
      <div className="kin-grain absolute inset-0" />

      {/* ---------- content ---------- */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-28 pt-28 sm:px-6 sm:pb-32 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="kin-mono mb-5 flex items-center gap-3 text-xs uppercase text-ash"
          >
            <span className="kin-rec-dot" aria-hidden />
            <span>Cinematic editing studio</span>
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="kin-display text-print text-7xl leading-[0.85] tracking-[0.04em] drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)] sm:text-8xl lg:text-[10rem]"
          >
            {HERO.brand}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-lg text-print/80 sm:text-xl"
          >
            {HERO.tagline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              size="lg"
              onClick={() => scrollToSection("work")}
              className="group h-12 rounded-none px-7 text-sm font-semibold uppercase tracking-[0.12em] transition-transform hover:scale-[1.02]"
            >
              <Play className="size-4 fill-primary-foreground" />
              Watch the reel
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollToSection("contact")}
              className="group h-12 rounded-none border-print/30 bg-transparent px-7 text-sm font-semibold uppercase tracking-[0.12em] text-print transition-all hover:scale-[1.02] hover:border-highlight hover:bg-transparent hover:text-highlight"
            >
              Start a project
            </Button>
          </motion.div>
        </div>
      </div>

      {/* ---------- bottom letterbox bar ---------- */}
      <div className="relative z-10 border-t border-border bg-shadow/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:h-14 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => scrollToSection("work")}
            className="kin-mono group flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ash transition-colors hover:text-highlight"
          >
            <span>Scroll</span>
            <ArrowDown className="size-3 transition-transform group-hover:translate-y-0.5" />
          </button>
          <span className="kin-mono text-[10px] uppercase tracking-[0.18em] text-ash">
            Reel {REEL_END_TC}
          </span>
        </div>
      </div>
    </section>
  );
}
