"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Kinetra CRM — Lead row actions (Phase 3).
 *
 * Archive / restore for the leads list. Every action re-verifies the caller
 * against the admin allowlist (defense in depth on top of middleware + the
 * guarded layout) and appends an entry to the lead_activities audit log
 * created in Phase 1 — the Activity Timeline UI lands in Phase 4.
 */

export interface LeadActionResult {
  ok: boolean;
  error?: string;
}

const leadIdSchema = z.string().trim().min(1).max(100);

async function logActivity(
  leadId: string,
  actorId: string,
  type: "lead_archived" | "lead_restored",
): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("lead_activities").insert({
    lead_id: leadId,
    actor_id: actorId,
    type,
  });

  if (error) {
    // Audit logging must never block the primary action.
    console.error("[admin/leads] activity log failed:", error.message);
  }
}

export async function archiveLeadAction(
  leadId: string,
): Promise<LeadActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid lead reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] archive failed:", error.message);
    return { ok: false, error: "Couldn't archive the lead. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Lead not found or already archived." };
  }

  await logActivity(data.id, ctx.profile.id, "lead_archived");

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.id}`);

  return { ok: true };
}

export async function restoreLeadAction(
  leadId: string,
): Promise<LeadActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = leadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid lead reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .update({ archived_at: null })
    .eq("id", parsed.data)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] restore failed:", error.message);
    return { ok: false, error: "Couldn't restore the lead. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Lead not found or not archived." };
  }

  await logActivity(data.id, ctx.profile.id, "lead_restored");

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.id}`);

  return { ok: true };
}