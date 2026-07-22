import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendInquiryEmail } from "@/lib/resend";

/**
 * POST /api/contact
 *
 * Validates the contact form server-side and saves valid inquiries directly
 * into the Supabase public.leads table.
 *
 * Hardening applied:
 *  - Per-IP rate limiting (abuse / spam / resource-exhaustion).
 *  - Cross-site Origin check (rejects mismatched browser Origins).
 *  - Honeypot field ("company") to silently drop naive bots.
 *  - Strict Zod validation (unknown keys are stripped by default).
 *  - Request-scoped log id, and no sensitive data in responses.
 */

// The Supabase service client and the in-memory limiter need the Node.js
// runtime, and this endpoint must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 3 submissions per 10 minutes per client IP.
const RATE_LIMIT = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
};

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(100, "Name is too long"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      "Enter a valid email address",
    )
    .max(254, "Email is too long"),

 
  
  handle: z
    .string()
    .trim()
    .max(120, "Handle is too long")
    .optional()
    .nullable(),

  projectType: z
    .string()
    .trim()
    .min(1, "Select a project type")
    .max(100),

  budget: z
    .string()
    .trim()
    .max(100)
    .optional()
    .nullable(),

  message: z
    .string()
    .trim()
    .min(10, "Tell us more about your project")
    .max(5000, "Message is too long"),
});

/** First hop in X-Forwarded-For (set by the Caddy reverse proxy), else X-Real-IP. */
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Origins explicitly allowed to POST the form (comma-separated env), plus same-origin. */
function allowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_SITE_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
  ]
    .map((o) => o?.trim())
    .filter((o): o is string => Boolean(o));
}

/**
 * Reject cross-site browser POSTs. Browsers always attach an Origin header on
 * cross-origin requests, so a *mismatched* Origin is the signal we block.
 * Non-browser clients (no Origin) are allowed through and constrained by
 * validation + rate limiting instead.
 */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = req.headers.get("host");
  if (host && originHost === host) return true;

  return allowedOrigins().some((a) => {
    try {
      return new URL(a).host === originHost;
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  const rid = crypto.randomUUID().slice(0, 8);

  // 1) Cross-site origin check (cheap, before doing any work).
  if (!originAllowed(req)) {
    return NextResponse.json(
      { ok: false, error: "forbidden_origin" },
      { status: 403 },
    );
  }

  // 2) Per-IP rate limit.
  const ip = clientIp(req);
  const rl = rateLimit(`contact:${ip}`, RATE_LIMIT);
  const rlHeaders = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
  };

  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { ...rlHeaders, "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  // 3) Parse JSON.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: rlHeaders },
    );
  }

  // 4) Honeypot: real users never see or fill the hidden "company" field.
  //    Respond 200 so bots don't learn they were detected — but store nothing.
  const honeypot = (body as Record<string, unknown> | null)?.company;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    console.warn(`[/api/contact:${rid}] honeypot triggered ip=${ip}`);
    return NextResponse.json({ ok: true }, { status: 200, headers: rlHeaders });
  }

  // 5) Validate.
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) {
        errors[key] = issue.message;
      }
    }
    return NextResponse.json(
      { ok: false, error: "validation", errors },
      { status: 422, headers: rlHeaders },
    );
  }

  const d = parsed.data;

  // 6) Persist.
  try {
    const { data, error } = await db
      .from("leads")
      .insert({
        name: d.name,
        email: d.email.toLowerCase(),
        project_type: d.projectType,
        budget_range: d.budget || null,
        social_url: d.handle || null,
        message: d.message,
        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error) {
      // Log full detail server-side; never leak DB internals to the client.
      console.error(`[/api/contact:${rid}] supabase error:`, error.message);
      return NextResponse.json(
        { ok: false, error: "database" },
        { status: 500, headers: rlHeaders },
      );
    }

    await sendInquiryEmail({
  name: d.name,
  email: d.email,
  handle: d.handle,
  projectType: d.projectType,
  budget: d.budget,
  message: d.message,
});

    console.info(`[/api/contact:${rid}] lead created id=${data.id}`);
    return NextResponse.json(
      { ok: true, id: data.id, createdAt: data.created_at },
      { status: 201, headers: rlHeaders },
    );
  } catch (err) {
    console.error(`[/api/contact:${rid}] server error:`, err);
    return NextResponse.json(
      { ok: false, error: "server" },
      { status: 500, headers: rlHeaders },
    );
  }
}

/** Reject direct GET requests. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
