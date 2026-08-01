"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import {
  isSettingsKey,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  SETTINGS_SCHEMAS,
} from "@/lib/admin/settings-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Json } from "@/types/database.types";

/**
 * Kinetra CRM — Settings server actions (Phase 9).
 *
 * Persist settings groups into the EXISTING admin_settings key/value store,
 * plus profile/password management and the danger-zone operations. Every
 * action re-verifies the admin session via getAdminContext() and validates
 * input with the SAME zod schemas the client forms use
 * (src/lib/admin/settings-schemas.ts), so client and server can never drift.
 */

export interface SettingsActionResult {
  ok: boolean;
  error?: string;
}

/** Settings changes can affect shell chrome (name, density) — bust it all. */
function revalidateAdminLayout(): void {
  revalidatePath("/admin", "layout");
}

/* ─────────────────────────── Save a settings group ─────────────────────── */

export async function saveSettingsAction(
  key: string,
  value: unknown,
): Promise<SettingsActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  if (!isSettingsKey(key)) {
    return { ok: false, error: "Unknown settings group." };
  }

  const parsed = SETTINGS_SCHEMAS[key].safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("admin_settings").upsert(
    {
      key,
      value: parsed.data as unknown as Json,
      updated_by: ctx.profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    console.error(`[admin/settings] save "${key}" failed:`, error.message);
    return { ok: false, error: "Couldn't save settings. Try again." };
  }

  revalidateAdminLayout();
  return { ok: true };
}

/* ──────────────────────────────── Profile ──────────────────────────────── */

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(80, "Keep it under 80 characters."),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfileAction(
  input: ProfileInput,
): Promise<SettingsActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("admin_users")
    .update({
      display_name: parsed.data.displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.profile.id);

  if (error) {
    console.error("[admin/settings] profile update failed:", error.message);
    return { ok: false, error: "Couldn't update your profile. Try again." };
  }

  revalidateAdminLayout();
  return { ok: true };
}

/* ─────────────────────────────── Password ──────────────────────────────── */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Keep it under 72 characters."),
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one.",
    path: ["newPassword"],
  });

export type PasswordInput = z.infer<typeof passwordSchema>;

export async function changePasswordAction(
  input: PasswordInput,
): Promise<SettingsActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid password.",
    };
  }

  // Verify the CURRENT password with a throwaway, non-persisting anon client
  // (the SSR client would overwrite the admin's session cookies). No signOut
  // afterwards: default signOut scope is global and would log the admin out
  // everywhere; the ephemeral in-memory session simply expires.
  const { url, anonKey } = getPublicSupabaseEnv();
  const verifier = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: ctx.profile.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(ctx.user.id, {
    password: parsed.data.newPassword,
  });

  if (error) {
    console.error("[admin/settings] password change failed:", error.message);
    return { ok: false, error: "Couldn't change the password. Try again." };
  }

  return { ok: true };
}

/* ──────────────────────── Danger zone: export data ─────────────────────── */

const EXPORT_ROW_CAP = 5000;

export type ExportCrmDataResult =
  | {
      ok: true;
      filename: string;
      json: string;
      counts: Record<string, number>;
    }
  | { ok: false; error: string };

/**
 * Full CRM data export as a single JSON bundle (leads, notes, activities,
 * emails, follow-up tasks — capped at 5,000 rows per table, same policy as
 * the Phase 6 CSV export). The client saves the returned string as a Blob.
 */
export async function exportCrmDataAction(): Promise<ExportCrmDataResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = createSupabaseAdminClient();

  const [leads, notes, activities, emails, tasks] = await Promise.all([
    admin.from("leads").select("*").order("created_at").limit(EXPORT_ROW_CAP),
    admin
      .from("lead_notes")
      .select("*")
      .order("created_at")
      .limit(EXPORT_ROW_CAP),
    admin
      .from("lead_activities")
      .select("*")
      .order("created_at")
      .limit(EXPORT_ROW_CAP),
    admin
      .from("lead_emails")
      .select("*")
      .order("created_at")
      .limit(EXPORT_ROW_CAP),
    admin
      .from("follow_up_tasks")
      .select("*")
      .order("created_at")
      .limit(EXPORT_ROW_CAP),
  ]);

  const firstError =
    leads.error ?? notes.error ?? activities.error ?? emails.error ?? tasks.error;

  if (firstError) {
    console.error("[admin/settings] export failed:", firstError.message);
    return { ok: false, error: "Couldn't build the export. Try again." };
  }

  const bundle = {
    exported_at: new Date().toISOString(),
    exported_by: ctx.profile.email,
    row_cap_per_table: EXPORT_ROW_CAP,
    leads: leads.data ?? [],
    lead_notes: notes.data ?? [],
    lead_activities: activities.data ?? [],
    lead_emails: emails.data ?? [],
    follow_up_tasks: tasks.data ?? [],
  };

  const day = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    filename: `kinetra-crm-export-${day}.json`,
    json: JSON.stringify(bundle),
    counts: {
      leads: bundle.leads.length,
      lead_notes: bundle.lead_notes.length,
      lead_activities: bundle.lead_activities.length,
      lead_emails: bundle.lead_emails.length,
      follow_up_tasks: bundle.follow_up_tasks.length,
    },
  };
}

/* ─────────────── Danger zone: permanently delete archived ──────────────── */

const CONFIRM_PHRASE = "DELETE";
const DELETE_CHUNK_SIZE = 100;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size) as T[]);
  }
  return out;
}

export type DeleteArchivedResult =
  | { ok: true; deleted: number }
  | { ok: false; error: string };

/**
 * Permanently deletes every ARCHIVED lead plus its child rows (notes,
 * activities, emails, follow-up tasks, notifications). Children are removed
 * explicitly — no reliance on FK cascade config — in chunks that stay well
 * under PostgREST URL limits. Requires the typed confirm phrase.
 */
export async function deleteArchivedLeadsAction(input: {
  confirm: string;
}): Promise<DeleteArchivedResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  if (input?.confirm !== CONFIRM_PHRASE) {
    return { ok: false, error: `Type ${CONFIRM_PHRASE} to confirm.` };
  }

  const admin = createSupabaseAdminClient();

  const { data: archived, error: listError } = await admin
    .from("leads")
    .select("id")
    .not("archived_at", "is", null)
    .limit(EXPORT_ROW_CAP);

  if (listError) {
    console.error("[admin/settings] archived list failed:", listError.message);
    return { ok: false, error: "Couldn't load archived leads." };
  }

  const ids = (archived ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return { ok: true, deleted: 0 };
  }

  const childTables = [
    "lead_notes",
    "lead_activities",
    "lead_emails",
    "follow_up_tasks",
    "admin_notifications",
  ] as const;

  for (const batch of chunk(ids, DELETE_CHUNK_SIZE)) {
    for (const table of childTables) {
      const { error } = await admin.from(table).delete().in("lead_id", batch);
      if (error) {
        console.error(
          `[admin/settings] purge ${table} failed:`,
          error.message,
        );
        return { ok: false, error: "Purge failed part-way. Re-run to finish." };
      }
    }

    const { error } = await admin
      .from("leads")
      .delete()
      .in("id", batch)
      .not("archived_at", "is", null);

    if (error) {
      console.error("[admin/settings] purge leads failed:", error.message);
      return { ok: false, error: "Purge failed part-way. Re-run to finish." };
    }
  }

  revalidateAdminLayout();
  return { ok: true, deleted: ids.length };
}

/* ──────────────────── Danger zone: reset settings ──────────────────────── */

export async function resetSettingsAction(
  key?: string,
): Promise<SettingsActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  if (key !== undefined && !isSettingsKey(key)) {
    return { ok: false, error: "Unknown settings group." };
  }

  const keys = key !== undefined && isSettingsKey(key) ? [key] : SETTINGS_KEYS;
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("admin_settings").upsert(
    keys.map((k) => ({
      key: k,
      value: SETTINGS_DEFAULTS[k] as unknown as Json,
      updated_by: ctx.profile.id,
      updated_at: now,
    })),
    { onConflict: "key" },
  );

  if (error) {
    console.error("[admin/settings] reset failed:", error.message);
    return { ok: false, error: "Couldn't reset settings. Try again." };
  }

  revalidateAdminLayout();
  return { ok: true };
}