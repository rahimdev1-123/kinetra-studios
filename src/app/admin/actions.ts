"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAllowlistedAdmin } from "@/lib/admin/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/admin/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Kinetra CRM — admin auth server actions (Phase 1).
 *
 * Self-contained: separate from (and additive to) any rate limiting or
 * hardening you already run on the public contact API.
 */

export type LoginFormState = {
  error: string | null;
};

const GENERIC_LOGIN_ERROR = "Invalid email or password.";

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

/** Only allow post-login redirects that stay inside the admin panel. */
function safeAdminPath(next: string | undefined): string {
  if (
    next &&
    next.startsWith("/admin") &&
    !next.startsWith("//") &&
    !next.includes("\\")
  ) {
    return next;
  }
  return "/admin";
}

async function clientKey(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";
  return `admin-login:${ip}`;
}

export async function signInAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  const key = await clientKey();
  const rate = checkRateLimit(key, LOGIN_RATE_LIMIT);

  if (!rate.allowed) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterSeconds / 60));
    return {
      error: `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Generic on purpose: no account enumeration.
    return { error: GENERIC_LOGIN_ERROR };
  }

  const allowed = await isAllowlistedAdmin(data.user.id);

  if (!allowed) {
    // Valid Supabase user but not on the admin allowlist — end the session
    // immediately and answer exactly like a bad password.
    await supabase.auth.signOut();
    return { error: GENERIC_LOGIN_ERROR };
  }

  resetRateLimit(key);
  redirect(safeAdminPath(parsed.data.next));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}   