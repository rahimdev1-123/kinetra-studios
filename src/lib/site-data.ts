/**
 * Kinetra — central content source.
 *
 * Positioning:
 * Premium cinematic post-production studio for creators and brands.
 * The website sells outcomes, demonstrates craft, and drives qualified inquiries.
 */

/* ------------------------------------------------------------------ *
 * TIMELINE
 * ------------------------------------------------------------------ */

export const TOTAL_SECONDS = 134;

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
  { tc: "01:38", label: "CLIENTS", id: "said", seconds: 98 },
  { tc: "01:52", label: "PROCESS", id: "process", seconds: 112 },
  { tc: "02:10", label: "CONTACT", id: "contact", seconds: 130 },
];

export const REEL_END_TC = "02:14";

/* ------------------------------------------------------------------ *
 * HERO
 * ------------------------------------------------------------------ */

export const HERO = {
  brand: "KINETRA",

  eyebrow: "CINEMATIC POST-PRODUCTION STUDIO",

  tagline:
    "WE TURN RAW FOOTAGE INTO VIDEOS PEOPLE CAN’T STOP WATCHING.",

  subheading:
    "Story-driven video editing for creators and brands that want sharper content, stronger retention, and a distinct visual identity.",

  videoSrc: "PLACEHOLDER",

  poster: "/hero/hero-bg.jpg",

 primaryCta: { label: "Watch our work", target: "work" },   // was "Watch the reel"

  secondaryCta: {
    label: "START A PROJECT",
    target: "contact",
  },
};

/* ------------------------------------------------------------------ *
 * PORTFOLIO
 * ------------------------------------------------------------------ */

export type ClipCategory =
  | "Short-Form"
  | "Long-Form"
  | "Motion Graphics";

export type Clip = {
  id: string;
  title: string;
  category: ClipCategory;
  duration: string;
  videoSrc: string;
  thumbnail: string;
};

export const WORK = {
  eyebrow: "SELECTED WORK",

  heading: "EDITING THAT EARNS ATTENTION.",

  description:
    "A selection of story-driven edits built to hold attention, strengthen brands, and make every second count.",
};

export const CLIPS: Clip[] = [
  {
  id: "clip-1",
  title: "Cinematic motion graphics",   // also fixed the "Cenimatic" typo 😉
  category: "Long-Form",
  duration: "0:42",
  videoSrc: "/portfoliovids/iran.mp4",
  thumbnail: "/portfolio/clip-1.jpg",
},
{
  id: "clip-2",
  title: "CINEMATIC SOCIAL FILM",
  category: "Long-Form",
  duration: "0:14",
  videoSrc: "/portfoliovids/vox-titanic.mp4",
  thumbnail: "/portfolio/clip-2.jpg",
},
{
  id: "clip-3",
  title: "YOUTUBE STORY EDIT",
  category: "Long-Form",
  duration: "0:12",
  videoSrc: "/portfoliovids/final-video.mp4",
  thumbnail: "/portfolio/clip-3.jpg",
},
  {
    id: "clip-4",
    title: "CREATOR DOCUMENTARY",
    category: "Long-Form",
    duration: "6:48",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-4.jpg",
  },
  {
    id: "clip-5",
    title: "BRAND MOTION SYSTEM",
    category: "Motion Graphics",
    duration: "0:45",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-5.jpg",
  },
  {
    id: "clip-6",
    title: "CINEMATIC TITLE SEQUENCE",
    category: "Motion Graphics",
    duration: "1:20",
    videoSrc: "PLACEHOLDER",
    thumbnail: "/portfolio/clip-6.jpg",
  },
];

/* ------------------------------------------------------------------ *
 * SERVICES
 * ------------------------------------------------------------------ */

export const SERVICES_CONTENT = {
  eyebrow: "SERVICES",

  heading: "EDITING BUILT TO PERFORM.",

  description:
    "Whether you need a single cinematic edit or a long-term editing partner, every project is crafted to elevate your content, strengthen your brand, and keep people watching.",
};

/**
 * Type for SERVICES entries (repair: this annotation was referenced below
 * but never defined, breaking `tsc --noEmit`). Type-only — no data change.
 */
export interface Service {
  name: string;
  price: string;
  cadence: string;
  turnaround: string;
  description: string;
  deliverables: string[];
  cta: string;
  featured?: boolean;
}

export const SERVICES: Service[] = [
  {
    name: "LAUNCH",

    price: "Starting at $195",

    cadence: "/ video",

    turnaround: "",

    description:
      "Perfect for creators who need premium short-form edits that are polished, engaging, and ready to publish.",

    deliverables: [
      "Story-driven editing",
      "Professional captions",
      "Sound design",
      "Color correction",
      "Licensed music",
      "2 revisions",
      "Platform-ready exports",
    ],

    cta: "START YOUR PROJECT",
  },

  {
    name: "SIGNATURE EDIT",

    price: "Starting at $595",

    cadence: "/ project",

    turnaround: "5–7 Day Turnaround",

    description:
      "Our complete cinematic editing package for brands and creators who want every video to stand out.",

    deliverables: [
      "Short-form or long-form editing",
      "Storytelling & pacing",
      "Advanced sound design",
      "Professional color grading",
      "Custom motion graphics",
      "Stock footage integration",
      "Light VFX & compositing",
      "Thumbnail optimization",
      "Multi-platform exports",
      "3 revisions",
    ],

    cta: "BOOK SIGNATURE EDIT",

    featured: true,
  },

  {
    name: "CONTENT PARTNERSHIP",

    price: "Starting at $2,750",

    cadence: "/ month",

    turnaround: "Priority Monthly Workflow",

    description:
      "A dedicated editing partnership for creators and businesses publishing content consistently every month.",

    deliverables: [
      "Dedicated monthly editing capacity",
      "Short-form & long-form editing",
      "Priority turnaround",
      "Advanced motion graphics",
      "Monthly content planning",
      "Priority revisions",
      "Direct communication",
      "Multi-platform delivery",
      "Consistent creative direction",
    ],

    cta: "BOOK A DISCOVERY CALL",
  },
];

export const SERVICES_FOOTNOTE =
  "Pricing may vary depending on footage length, editing complexity, turnaround time, and project requirements. Custom quotes are available for every project.";

/* ------------------------------------------------------------------ *
 * ABOUT
 * ------------------------------------------------------------------ */

export const ABOUT = {
  eyebrow: "ABOUT KINETRA",

  heading: "YOUR FOOTAGE. OUR OBSESSION.",

  name: "KINETRA",

  photo: "/about/about.jpg",

  bio:
    "Kinetra is a cinematic post-production studio built around one principle: every second has to earn attention. We combine storytelling, pacing, sound design, color, and motion to transform raw footage into content that feels intentional, distinctive, and worth watching.",

  secondaryBio:
    "We work with creators and brands that care about craft and understand that strong editing is not decoration. It is the difference between content people scroll past and content they remember.",

  // Type-only repair: an empty literal infers never[], which broke
  // about.tsx's stat.label/stat.value access in `tsc --noEmit`. Same empty
  // array at runtime — nothing renders until stats are added.
  stats: [] as { label: string; value: string }[],
};

/* ------------------------------------------------------------------ *
 * CLIENT RESULTS / TESTIMONIALS
 *
 * Do not publish fabricated testimonials.
 * Keep this array empty until real client quotes exist.
 * ------------------------------------------------------------------ */

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  headshot: string;
};

export const TESTIMONIALS_CONTENT = {
  eyebrow: "CLIENTS",

  heading: "THE WORK SPEAKS. CLIENTS CONFIRM IT.",

  emptyState:
    "REAL CLIENT STORIES COMING SOON.",
};

export const TESTIMONIALS: Testimonial[] = [];

/* ------------------------------------------------------------------ *
 * PROCESS
 * ------------------------------------------------------------------ */

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export const PROCESS_CONTENT = {
  eyebrow: "PROCESS",

  heading: "FROM RAW FOOTAGE TO FINAL CUT.",

  description:
    "A focused production workflow designed to keep communication clear, revisions controlled, and projects moving.",
};

export const PROCESS: ProcessStep[] = [
  {
    step: "01",

    title: "SEND THE BRIEF",

    description:
      "Tell us what you’re creating, your goals, references, audience, footage, and deadline. We review the project and define the right editing direction.",
  },

  {
    step: "02",

    title: "WE EDIT",

    description:
      "We build the story, refine the pacing, shape the sound, develop the visual treatment, and turn your footage into the first polished cut.",
  },

  {
    step: "03",

    title: "YOU REVIEW",

    description:
      "You receive the first cut through a structured review process. Feedback is consolidated, revisions are made, and the edit is refined.",
  },

  {
    step: "04",

    title: "READY TO PUBLISH",

    description:
      "Final masters and platform-ready exports are delivered clean, organized, and ready to publish.",
  },
];

/* ------------------------------------------------------------------ *
 * CONTACT
 * ------------------------------------------------------------------ */

export const PROJECT_TYPES = [
  "Short-form content",
  "YouTube / long-form video",
  "Brand content",
  "Motion graphics / VFX",
  "Monthly content partnership",
  "Not sure yet",
];

export const BUDGET_RANGES = [
  "< $500",
  "$500 – $1,500",
  "$1,500 – $5,000",
  "$5,000+",
  "LET’S DISCUSS",
];

export const CONTACT = {
  eyebrow: "START A PROJECT",

  heading: "YOUR NEXT VIDEO SHOULD BE BETTER THAN YOUR LAST.",

  description:
    "Tell us what you’re creating, what you need, and when you need it. We’ll review the project and reply with availability, scope, and next steps.",

  email: "abderrahim.bouakaz@his.edu.dz",

  responseTime: "TYPICAL RESPONSE TIME: WITHIN 48 HOURS",

  submitLabel: "SEND PROJECT DETAILS",

  successMessage:
    "PROJECT RECEIVED — WE’LL REVIEW THE DETAILS AND REPLY WITHIN 48 HOURS.",

  errorMessage:
    "SOMETHING WENT WRONG. TRY AGAIN OR CONTACT US DIRECTLY BY EMAIL.",
};

/* ------------------------------------------------------------------ *
 * FOOTER / SOCIALS
 * ------------------------------------------------------------------ */

export const SOCIALS = [
  {
    label: "INSTAGRAM",
    href: "[PLACEHOLDER: INSTAGRAM URL]",
  },
  {
    label: "TIKTOK",
    href: "[PLACEHOLDER: TIKTOK URL]",
  },
  {
    label: "YOUTUBE",
    href: "[PLACEHOLDER: YOUTUBE URL]",
  },
];

export const FOOTER = {
  brand: "KINETRA",

  positioning:
    "CINEMATIC POST-PRODUCTION FOR CREATORS AND BRANDS.",

  email: "abderrahim.bouakaz@his.edu.dz",

  copyright: `© ${new Date().getFullYear()} Kinetra. All rights reserved.`,

  endMarker: "END 02:14",
};