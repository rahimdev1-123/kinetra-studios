import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * POST /api/contact
 * Validates the contact form server-side, persists it via Prisma, and
 * returns a JSON shape the frontend maps onto its success / error states.
 */

// Email is validated with a regex to stay version-agnostic across zod releases.
const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email"),
  handle: z.string().max(120).optional().nullable(),
  projectType: z.string().max(80).optional().nullable(),
  budget: z.string().max(80).optional().nullable(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message is too long"),
});

export async function POST(req: NextRequest) {
  // ---- parse body ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  // ---- validate ----
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return NextResponse.json(
      { ok: false, error: "validation", errors },
      { status: 422 },
    );
  }

  const d = parsed.data;

  // ---- persist ----
  try {
    const record = await db.contactSubmission.create({
      data: {
        name: d.name,
        email: d.email,
        handle: d.handle || null,
        projectType: d.projectType || null,
        budget: d.budget || null,
        message: d.message,
      },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    console.error("[/api/contact] persistence failed:", err);
    return NextResponse.json(
      { ok: false, error: "database" },
      { status: 500 },
    );
  }
}

/** Reject anything that isn't POST. */
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
