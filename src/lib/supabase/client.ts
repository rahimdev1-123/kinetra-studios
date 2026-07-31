"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

/**
 * Kinetra CRM — browser Supabase client (Phase 6).
 *
 * Used by client components for realtime subscriptions (e.g. the analytics
 * dashboard's live refresher). Authenticates with the anon key + the admin's
 * session cookies set by @supabase/ssr, so Row Level Security applies —
 * only allowlisted admins receive rows/events. Singleton per browser tab.
 *
 * Server code keeps using src/lib/supabase/server.ts and admin.ts — this
 * file must never be imported from server components or actions.
 */

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cachedBrowserClient: BrowserClient | null = null;

export function createSupabaseBrowserClient(): BrowserClient {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  cachedBrowserClient = createBrowserClient<Database>(url, anonKey);

  return cachedBrowserClient;
}