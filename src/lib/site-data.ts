/**
 * Kinetra — central content source.
 *
 * Every `[PLACEHOLDER: ...]` token is searchable so real assets, copy, prices,
 * and contact details can be dropped in later without hunting through JSX.
 */

/* ------------------------------------------------------------------ *
 * TIMELINE — the signature concept.
 * Each section is a "timeline marker" with a timecode + label.
 * `seconds` is the real time the playhead should read when the section
 * tops the viewport. Total reel length = 02:14 (134s).
 * ------------------------------------------------------------------ */
export const TOTAL_SECONDS = 134; // 02:14

export type TimelineMarker = {
  tc: string;
  label: string;
  id: string;
  seconds: number;
};

export const TIMELINE: TimelineMarker[] = [
  { tc: "00:00", label: "INTRO", id: "intro", seconds: 0 },
  { tc: "00:24", label: "WORK", id: "work", seconds: 24 },
  { tc: "00:52", label: "SERVICES", id: "services", seconds: 52 },
  { tc: "01:20", label: "ABOUT", id: "about", seconds: 80 },
  { tc: "01:38", label: "SAID", id: "said", seconds: 98 },
  { tc: "01:52", label: "PROCESS", id: "process", seconds: 112 },
  { tc: "02:10", label: "CONTACT", id: "contact", seconds: 130 },
];

export const REEL_END_TC = "02:14";

/* ------------------------------------------------------------------ *
 * HERO
 * ------------------------------------------------------------------ */
export const HERO = {
  brand: "KINETRA",
  // [PLACEHOLDER: tagline — short, confident]
  tagline: "[PLACEHOLDER: tagline — e.g. “Edited for impact.”]",
  // [PLACEHOLDER: drop a real cinematic mp4 at /public/hero/hero-placeholder.mp4
  //  and set this to "/hero/hero-placeholder.mp4" — until then the still plays.]
  videoSrc: "PLACEHOLDER",
  poster: "/hero/hero-bg.jpg",
  primaryCta: { label: "Watch the reel", target: "work" },
  secondaryCta: { label: "Start a project", target: "contact" },
};

/* ------------------------------------------------------------------ *
 * PORTFOLIO — horizontal filmstrip. Swap videoSrc/thumbnail per clip.
 * ------------------------------------------------------------------ */
export type ClipCategory = "Short-Form" | "Long-Form" | "Motion Graphics";

export type Clip = {
  id: string;
  title: string;
  category: ClipCategory;
  duration: string;
  // [PLACEHOLDER: real clip video files — drop mp4s here]
  videoSrc: string;
  thumbnail: string;
};

export const CLIPS: Clip[] = [
  {
    id: "clip-1",
    title: "[PLACEHOLDER: clip title]",
    category: "Short-Form",
    duration: "0:32",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-1.jpg",
  },
  {
    id: "clip-2",
    title: "[PLACEHOLDER: clip title]",
    category: "Short-Form",
    duration: "0:28",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-2.jpg",
  },
  {
    id: "clip-3",
    title: "[PLACEHOLDER: clip title]",
    category: "Long-Form",
    duration: "4:12",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-3.jpg",
  },
  {
    id: "clip-4",
    title: "[PLACEHOLDER: clip title]",
    category: "Long-Form",
    duration: "6:48",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-4.jpg",
  },
  {
    id: "clip-5",
    title: "[PLACEHOLDER: clip title]",
    category: "Motion Graphics",
    duration: "0:45",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-5.jpg",
  },
  {
    id: "clip-6",
    title: "[PLACEHOLDER: clip title]",
    category: "Motion Graphics",
    duration: "1:20",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-6.jpg",
  },
];

/* ------------------------------------------------------------------ *
 * SERVICES — three packages.
 * ------------------------------------------------------------------ */
export type Service = {
  name: string;
  // [PLACEHOLDER: real prices]
  price: string;
  cadence: string;
  turnaround: string;
  deliverables: string[];
  cta: string;
  featured?: boolean;
};

export const SERVICES: Service[] = [
  {
    name: "Starter",
    price: "[PLACEHOLDER: price]",
    cadence: "/ video",
    turnaround: "5–7 day turnaround",
    deliverables: [
      "1 short-form edit",
      "Captions + basic sound design",
      "1 round of revisions",
      "Vertical + square exports",
    ],
    cta: "Start with Starter",
  },
  {
    name: "Pro",
    price: "[PLACEHOLDER: price]",
    cadence: "/ video",
    turnaround: "3–5 day turnaround",
    deliverables: [
      "Short- or long-form edit",
      "Cinematic color + sound design",
      "Motion titles & light VFX",
      "3 rounds of revisions",
      "Multi-aspect exports",
    ],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Premium",
    price: "[PLACEHOLDER: price]",
    cadence: "/ project",
    turnaround: "Custom turnaround",
    deliverables: [
      "Full long-form + derivative shorts",
      "Advanced VFX & motion graphics",
      "Pro color grade + mix",
      "Unlimited revisions (fair-use)",
      "Dedicated edit slot",
    ],
    cta: "Request Premium",
  },
];

// [PLACEHOLDER: per-video + monthly retainer terms]
export const SERVICES_FOOTNOTE =
  "[PLACEHOLDER: per-video and monthly retainer options available on request — exact terms to be added.]";

/* ------------------------------------------------------------------ *
 * ABOUT
 * ------------------------------------------------------------------ */
export const ABOUT = {
  // [PLACEHOLDER: editor name]
  name: "[YOUR NAME]",
  photo: "/about/about.jpg",
  // [PLACEHOLDER: short bio]
  bio: "[PLACEHOLDER: short bio — a paragraph on who [YOUR NAME] is, the kind of work Kinetra makes, and the philosophy behind the edit. Keep it tight, confident, and human.]",
  stats: [
    { value: "[X]+", label: "EDITS" },
    { value: "[X]", label: "YRS" },
    { value: "[X]", label: "NICHES" },
  ],
};

/* ------------------------------------------------------------------ *
 * TESTIMONIALS
 * ------------------------------------------------------------------ */
export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  headshot: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    // [PLACEHOLDER: real quote]
    quote:
      "[PLACEHOLDER: testimonial quote — what it felt like working with Kinetra and the result it drove.]",
    name: "[PLACEHOLDER: name]",
    role: "[PLACEHOLDER: platform / role]",
    headshot: "/testimonials/headshot-1.jpg",
  },
  {
    quote:
      "[PLACEHOLDER: testimonial quote — focus on craft, turnaround, or growth.]",
    name: "[PLACEHOLDER: name]",
    role: "[PLACEHOLDER: platform / role]",
    headshot: "/testimonials/headshot-2.jpg",
  },
  {
    quote:
      "[PLACEHOLDER: testimonial quote — a creator on how the edit elevated their brand.]",
    name: "[PLACEHOLDER: name]",
    role: "[PLACEHOLDER: platform / role]",
    headshot: "/testimonials/headshot-3.jpg",
  },
  {
    quote:
      "[PLACEHOLDER: testimonial quote — a brand or influencer on retention / reach.]",
    name: "[PLACEHOLDER: name]",
    role: "[PLACEHOLDER: platform / role]",
    headshot: "/testimonials/headshot-1.jpg",
  },
];

/* ------------------------------------------------------------------ *
 * PROCESS
 * ------------------------------------------------------------------ */
export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export const PROCESS: ProcessStep[] = [
  {
    step: "01",
    title: "Discovery Call",
    description:
      "[PLACEHOLDER: a short call to align on goals, audience, references, and tone before a frame is touched.]",
  },
  {
    step: "02",
    title: "Footage & Brief",
    description:
      "[PLACEHOLDER: you send footage and a brief; Kinetra logs everything, picks selects, and locks the cut direction.]",
  },
  {
    step: "03",
    title: "Edit & Revisions",
    description:
      "[PLACEHOLDER: first cut lands fast, then we refine — pacing, color, sound, and motion — through structured revision rounds.]",
  },
  {
    step: "04",
    title: "Delivery",
    description:
      "[PLACEHOLDER: final masters + platform-ready exports delivered clean, with project files available on request.]",
  },
];

/* ------------------------------------------------------------------ *
 * CONTACT
 * ------------------------------------------------------------------ */
export const PROJECT_TYPES = [
  "Short-form edit",
  "Long-form edit",
  "Motion graphics / VFX",
  "Retainer / ongoing",
  "Not sure yet",
];

export const BUDGET_RANGES = [
  "< $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000+",
  "Let's discuss",
];

export const CONTACT = {
  // [PLACEHOLDER: direct email — used in the error state + footer]
  email: "[PLACEHOLDER: you@kinetra.com]",
  successMessage: "Message sent — I'll reply within 48 hours.",
  errorMessage:
    "Something went wrong on my end. Try again, or email me directly at [PLACEHOLDER: you@kinetra.com].",
};

/* ------------------------------------------------------------------ *
 * FOOTER / SOCIALS
 * ------------------------------------------------------------------ */
export const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "YouTube", href: "#" },
];

export const FOOTER = {
  brand: "KINETRA",
  email: "[PLACEHOLDER: you@kinetra.com]",
  copyright: `© ${new Date().getFullYear()} Kinetra. All rights reserved.`,
  endMarker: "END 02:14",
};
