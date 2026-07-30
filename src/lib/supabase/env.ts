/**
 * Kinetra CRM — Supabase environment access (Phase 1).
 *
 * Additive: the existing server-only client in src/lib/db.ts and its
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY variables are untouched.
 * The admin panel needs two extra PUBLIC variables for cookie-based auth:
 *
 *   NEXT_PUBLIC_SUPABASE_URL       — same project URL as SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — the project's anon/public key
 *
 * This module is import-safe from middleware, server components, and
 * server actions (no Node-only APIs).
 */

export interface PublicSupabaseEnv {
  url: string;
  anonKey: string;
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Kinetra admin: missing NEXT_PUBLIC_SUPABASE_URL environment variable.",
    );
  }

  if (!anonKey) {
    throw new Error(
      "Kinetra admin: missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }

  return { url, anonKey };
}

export interface ServiceSupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

export function getServiceSupabaseEnv(): ServiceSupabaseEnv {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Kinetra admin: missing SUPABASE_URL environment variable.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Kinetra admin: missing SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }

  return { url, serviceRoleKey };
}