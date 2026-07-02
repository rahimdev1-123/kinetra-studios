"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Menu, Play, X } from "lucide-react";
import { TIMELINE, TOTAL_SECONDS } from "@/lib/site-data";
import { cn } from "@/lib/utils";

/* ----------------------------- helpers ----------------------------- */
const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const formatTc = (seconds: number) =>
  `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
const rectTop = (el: HTMLElement) =>
  el.getBoundingClientRect().top + window.scrollY;

/** Smooth-scroll to a section, honoring reduced-motion. */
export function scrollToSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/* --------------------------- the timeline hook --------------------------- */
/**
 * Maps scroll position onto reel time using a piecewise-linear function whose
 * anchors are the `[data-tc]` sections — so the timecode reads exactly each
 * section's marker time when that section tops the viewport, and counts up
 * smoothly between sections.
 *
 * The timecode text is written straight to the DOM (via `tcElRef`) to avoid
 * re-rendering the header on every scroll frame; only `activeId` (which
 * changes at section boundaries) triggers a React re-render.
 */
function useTimeline(tcElRef: RefObject<HTMLSpanElement | null>) {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState("intro");

  const lastTc = useRef("00:00");
  const lastActive = useRef("intro");

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      raf = 0;
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-tc]"),
      );
      if (!els.length) return;

      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight - vh;
      const sy = window.scrollY;

      const anchors = els
        .map((el) => ({
          top: rectTop(el),
          tc: parseInt(el.dataset.tc || "0", 10),
          id: el.id,
        }))
        .sort((a, b) => a.top - b.top);

      // ---- piecewise-linear time mapping ----
      let time = anchors[0]?.tc ?? 0;
      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];
        if (i === anchors.length - 1) {
          const segStart = a.top;
          const segEnd = Math.max(segStart + 1, docH);
          if (sy <= segStart) {
            time = a.tc;
          } else {
            const p = clamp((sy - segStart) / (segEnd - segStart), 0, 1);
            time = a.tc + p * (TOTAL_SECONDS - a.tc);
          }
          break;
        }
        const next = anchors[i + 1];
        if (sy <= next.top) {
          const p =
            next.top > a.top
              ? clamp((sy - a.top) / (next.top - a.top), 0, 1)
              : 0;
          time = a.tc + p * (next.tc - a.tc);
          break;
        }
      }
      time = clamp(time, 0, TOTAL_SECONDS);

      // ---- timecode (direct DOM write, no re-render) ----
      const tcStr = formatTc(time);
      if (tcStr !== lastTc.current) {
        lastTc.current = tcStr;
        if (tcElRef.current) tcElRef.current.textContent = tcStr;
      }

      // ---- active section (re-render only on change) ----
      const threshold = sy + vh * 0.35;
      let active = anchors[0]?.id ?? "intro";
      for (const a of anchors) if (a.top <= threshold) active = a.id;
      if (active !== lastActive.current) {
        lastActive.current = active;
        setActiveId(active);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const t = window.setTimeout(compute, 500); // re-measure after settle
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [tcElRef]);

  return { activeId, progress: scrollYProgress, reduce };
}

/* --------------------------- the scrubber bar --------------------------- */
export function TimelineScrubber() {
  const tcElRef = useRef<HTMLSpanElement>(null);
  const { activeId, progress, reduce } = useTimeline(tcElRef);
  const [menuOpen, setMenuOpen] = useState(false);

  // fill + playhead driven directly by scroll progress (no spring -> in sync)
  const playheadLeft = useTransform(
    progress,
    (v) => `${clamp(v, 0, 1) * 100}%`,
  );

  const go = useCallback((id: string) => {
    setMenuOpen(false);
    requestAnimationFrame(() => scrollToSection(id));
  }, []);

  const navItems = TIMELINE.filter((m) => m.id !== "intro");

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* --- the scrubber line (very top edge) --- */}
      <div className="relative h-[3px] w-full bg-ash/15">
        <motion.div
          className="absolute inset-y-0 left-0 origin-left bg-highlight"
          style={{ scaleX: progress }}
        />
        {/* playhead tick */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-1 h-[11px] w-[2px] -translate-x-1/2 bg-highlight shadow-[0_0_8px_0_rgba(212,162,78,0.7)]"
          style={{ left: playheadLeft }}
        />
      </div>

      {/* --- the nav bar (top letterbox) --- */}
      <div className="border-b border-border bg-shadow/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4 sm:h-14 sm:px-6 lg:px-8"
          aria-label="Timeline navigation"
        >
          {/* logo / wordmark -> top */}
          <button
            type="button"
            onClick={() => go("intro")}
            className="kin-display text-lg tracking-[0.18em] text-print transition-colors hover:text-highlight focus-visible:text-highlight sm:text-xl"
          >
            KINETRA
          </button>

          {/* desktop timeline nav */}
          <ul className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((m) => {
              const active = activeId === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => go(m.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "kin-mono group flex items-center gap-2 rounded px-2.5 py-1.5 text-[11px] uppercase transition-colors",
                      active ? "text-highlight" : "text-ash hover:text-print",
                    )}
                  >
                    <span className="tabular-nums opacity-70">{m.tc}</span>
                    <span
                      className={cn(
                        "h-px transition-all",
                        active ? "w-4 bg-highlight" : "w-2 bg-ash/50",
                      )}
                    />
                    <span>{m.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* right cluster: REC indicator + live timecode + mobile toggle */}
          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-2 sm:flex"
              title="Available for work"
            >
              <span className="kin-rec-dot" aria-hidden />
              <span className="kin-mono text-[10px] uppercase tracking-[0.12em] text-ash">
                Available
              </span>
            </span>

            <span className="flex items-center gap-1.5 rounded border border-border bg-secondary/60 px-2 py-1">
              <Play className="size-3 fill-highlight text-highlight" aria-hidden />
              <span
                ref={tcElRef}
                className="kin-mono text-xs tabular-nums text-highlight"
                aria-live="off"
              >
                00:00
              </span>
            </span>

            {/* mobile menu toggle */}
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded text-print hover:text-highlight lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* mobile dropdown menu */}
        {menuOpen && (
          <div className="border-t border-border bg-shadow/95 backdrop-blur-md lg:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {navItems.map((m) => {
                const active = activeId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => go(m.id)}
                      className={cn(
                        "kin-mono flex w-full items-center gap-3 rounded px-2 py-3 text-left text-xs uppercase transition-colors",
                        active
                          ? "text-highlight"
                          : "text-print/80 hover:text-highlight",
                      )}
                    >
                      <span className="tabular-nums opacity-60">{m.tc}</span>
                      <span className="h-px w-6 bg-ash/40" />
                      <span>{m.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
