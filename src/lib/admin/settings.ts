import "server-only";

import { cache } from "react";

import { fetchAdminDirectory } from "@/lib/admin/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  SETTINGS_SCHEMAS,
  type AllSettings,
  type SettingsKey,
} from "@/lib/admin/settings-schemas";

/**
 * Kinetra CRM — Settings data layer (Phase 9).
 *
 * Server-only readers over the EXISTING admin_settings key/value store
 * (migration 3, seeded in migration 9). Every value is defaults-merged and
 * zod-validated, so a missing or hand-edited row can never crash a tab.
 * Assumes requireAdmin()/getAdminContext() ran upstream.
 */

/** Read one settings key, merged over its defaults and validated. */
export async function fetchSetting<K extends SettingsKey>(
  key: K,
): Promise<AllSettings[K]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error(`[admin/settings] fetch "${key}" failed:`, error.message);
  }

  const stored =
    data?.value !== null &&
    typeof data?.value === "object" &&
    !Array.isArray(data?.value)
      ? (data.value as Record<string, unknown>)
      : {};

  const merged = { ...SETTINGS_DEFAULTS[key], ...stored };
  const parsed = SETTINGS_SCHEMAS[key].safeParse(merged);

  return (parsed.success ? parsed.data : SETTINGS_DEFAULTS[key]) as AllSettings[K];
}

/** All five settings groups in one query (Settings page load). */
export const fetchAllSettings = cache(async (): Promise<AllSettings> => {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_settings")
    .select("key, value")
    .in("key", [...SETTINGS_KEYS]);

  if (error) {
    console.error("[admin/settings] fetch all failed:", error.message);
  }

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));

  const result = {} as AllSettings;
  for (const key of SETTINGS_KEYS) {
    const raw = byKey.get(key);
    const stored =
      raw !== null && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const merged = { ...SETTINGS_DEFAULTS[key], ...stored };
    const parsed = SETTINGS_SCHEMAS[key].safeParse(merged);
    // Assignment through a widened record keeps strict typing per key.
    (result as unknown as Record<string, unknown>)[key] = parsed.success
      ? parsed.data
      : SETTINGS_DEFAULTS[key];
  }

  return result;
});

/* ─────────────────────────── Security overview ─────────────────────────── */

export interface AdminAccountOverview {
  id: string;
  label: string;
  email: string;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface SecurityAuditEvent {
  id: string;
  type: string;
  leadId: string;
  actorLabel: string | null;
  createdAt: string;
}

export interface SecurityOverview {
  admins: AdminAccountOverview[];
  auditEvents: SecurityAuditEvent[];
  /** Which server-side integrations have credentials configured. */
  apiKeys: { name: string; configured: boolean }[];
}

/**
 * Security tab data: admin accounts with login history (via the Auth admin
 * API), recent audit events (the migration-5 lead_activities log), and a
 * masked view of configured server credentials — names only, never values.
 */
export async function fetchSecurityOverview(): Promise<SecurityOverview> {
  const admin = createSupabaseAdminClient();

  const [{ data: adminRows }, authUsers, { data: activityRows }, directory] =
    await Promise.all([
      admin.from("admin_users").select("*").order("created_at"),
      admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
      admin
        .from("lead_activities")
        .select("id, lead_id, actor_id, type, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      fetchAdminDirectory(),
    ]);

  const lastSignInById = new Map<string, string | null>(
    (authUsers.data?.users ?? []).map(
      (u): [string, string | null] => [u.id, u.last_sign_in_at ?? null],
    ),
  );

  const admins: AdminAccountOverview[] = (adminRows ?? []).map((row) => ({
    id: row.id,
    label: row.display_name ?? row.email,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSignInAt: lastSignInById.get(row.id) ?? null,
  }));

  const auditEvents: SecurityAuditEvent[] = (activityRows ?? []).map(
    (row) => ({
      id: row.id,
      type: row.type,
      leadId: row.lead_id,
      actorLabel: row.actor_id
        ? (directory.get(row.actor_id)?.label ?? "Former admin")
        : null,
      createdAt: row.created_at,
    }),
  );

  const apiKeys = [
    { name: "Supabase service role", configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "Supabase anon key", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { name: "Resend API key", configured: Boolean(process.env.RESEND_API_KEY) },
    { name: "Outbound sender (EMAIL_FROM)", configured: Boolean(process.env.EMAIL_FROM) },
  ];

  return { admins, auditEvents, apiKeys };
}