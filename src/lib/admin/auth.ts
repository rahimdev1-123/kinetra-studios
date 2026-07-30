import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "../supabase/admin";
import { createSupabaseServerClient } from "../supabase/server";
import type { AdminUser } from "../../types/crm";

/**
 * Kinetra CRM — admin authorization guards (Phase 1).
 *
 * Two layers protect /admin:
 *   1. Middleware (adminMiddleware) — fast session check + redirects.
 *   2. These helpers — DB-backed allowlist check against admin_users,
 *      called from the admin layout and any privileged server code.
 */

export interface AdminContext {
  user: User;
  profile: AdminUser;
}

/** Is this Supabase Auth user on the admin allowlist? */
export async function isAllowlistedAdmin(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin/auth] allowlist lookup failed:", error.message);
    return false;
  }

  return data !== null;
}

/**
 * Resolve the signed-in admin (session + allowlist), or null.
 * Safe to call from any server component or server action.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error } = await admin
    .from("admin_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[admin/auth] profile lookup failed:", error.message);
    return null;
  }

  if (!profile) {
    return null;
  }

  return { user, profile };
}

/**
 * Hard gate for admin pages/layouts: redirects to /admin/login when the
 * visitor is not a signed-in, allowlisted admin.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const context = await getAdminContext();

  if (!context) {
    redirect("/admin/login");
  }

  return context;
}