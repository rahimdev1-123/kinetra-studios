import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * Despite the existing filename "db.ts", this file now connects directly
 * to Supabase instead of Prisma.
 *
 * Never import this file into a client component.
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL environment variable.");
}

if (!supabaseSecretKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY environment variable.",
  );
}

export const db = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);