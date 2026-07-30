import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "./env";
import type { Database } from "@/types/database.types";

/**
 * Kinetra CRM — cookie-scoped Supabase client (Phase 1).
 *
 * For server components, server actions, and route handlers under /admin.
 * Runs as the SIGNED-IN admin (anon key + user JWT), so Row Level Security
 * applies. Completely separate from the existing service-role client in
 * src/lib/db.ts, which remains untouched and continues to power /api/contact.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (read-only cookies) — safe to
          // ignore: the admin middleware refreshes sessions on navigation.
        }
      },
    },
  });
}