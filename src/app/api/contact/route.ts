import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";

/**
 * POST /api/contact
 *
 * Validates the contact form server-side and saves valid inquiries
 * directly into the Supabase public.leads table.
 */

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

  phone: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Use international format, for example +212612345678",
    )
    .optional()
    .or(z.literal("")),

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

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json",
      },
      {
        status: 400,
      },
    );
  }

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
      {
        ok: false,
        error: "validation",
        errors,
      },
      {
        status: 422,
      },
    );
  }

  const d = parsed.data;

  try {
    const { data, error } = await db
      .from("leads")
      .insert({
        name: d.name,
        email: d.email.toLowerCase(),

        phone: d.phone || null,

        project_type: d.projectType,

        budget_range: d.budget || null,

        social_url: d.handle || null,

        message: d.message,

        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[/api/contact] Supabase error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "database",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data.id,
        createdAt: data.created_at,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    console.error("[/api/contact] server error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "server",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * Reject direct GET requests.
 */

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "method_not_allowed",
    },
    {
      status: 405,
    },
  );
}