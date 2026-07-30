import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServiceSupabaseEnv } from "./env";
import type { Database } from "@/types/database.types";

/**
 * Kinetra CRM — typed service-role client for ADMIN server code (Phase 1).
 *
 * Bypasses Row Level Security; only ever import from server code that has
 * already verified the caller via requireAdmin()/getAdminContext(), or for
 * the admin-allowlist lookup itself.
 *
 * Intentionally separate from src/lib/db.ts so the existing contact-form
 * pipeline is never modified. Never import into client components.
 */

function buildAdminClient() {
  const { url, serviceRoleKey } = getServiceSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type SupabaseAdminClient = ReturnType<typeof buildAdminClient>;

let cachedAdminClient: SupabaseAdminClient | null = null;

export function createSupabaseAdminClient(): SupabaseAdminClient {
  cachedAdminClient ??= buildAdminClient();
  return cachedAdminClient;
}