"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import { searchCrm, type CrmSearchResults } from "@/lib/admin/dashboard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Kinetra CRM — Executive dashboard server actions (Phase 7).
 *
 * Manual lead creation, follow-up create/complete, lead assignment, and the
 * global cross-table search. Every action re-verifies the admin session
 * (defense in depth), stamps `updated_by` on lead mutations so the
 * migration-5 triggers attribute the actor, and revalidates the affected
 * routes. No overlap with the Phase 3–6 actions — nothing here duplicates
 * archive/restore/status/note/email/export logic.
 */

const idSchema = z.string().trim().min(1).max(100);

/* ───────────────────────────── Create lead ─────────────────────────────── */

const createLeadSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email."),
  company: z.string().trim().max(120).optional(),
  projectType: z.string().trim().max(100).optional(),
  budgetRange: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export type CreateLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string };

export async function createLeadAction(
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lead details.",
    };
  }

  const d = parsed.data;
  const admin = createSupabaseAdminClient();

  // The migration-5 INSERT trigger logs 'lead_created' with this actor.
  const { data, error } = await admin
    .from("leads")
    .insert({
      name: d.name,
      email: d.email.toLowerCase(),
      company: d.company || null,
      project_type: d.projectType || null,
      budget_range: d.budgetRange || null,
      message: d.notes || "Manually added from the admin dashboard.",
      status: "new",
      source: "manual",
      updated_by: ctx.profile.id,
      assigned_to: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/dashboard] create lead failed:", error.message);
    return { ok: false, error: "Couldn't create the lead. Try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/leads");

  return { ok: true, leadId: data.id };
}

/* ─────────────────────────── Follow-up tasks ───────────────────────────── */

const createFollowUpSchema = z.object({
  leadId: idSchema,
  dueIso: z.string().datetime({ offset: true }).or(z.string().datetime()),
  notes: z.string().trim().max(1000).optional(),
});

export type FollowUpActionResult = { ok: boolean; error?: string };

export async function createFollowUpAction(
  input: z.infer<typeof createFollowUpSchema>,
): Promise<FollowUpActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = createFollowUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid follow-up details." };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("follow_up_tasks").insert({
    lead_id: parsed.data.leadId,
    admin_id: ctx.profile.id,
    due_date: parsed.data.dueIso,
    notes: parsed.data.notes || null,
  });

  if (error) {
    console.error("[admin/dashboard] create follow-up failed:", error.message);
    return { ok: false, error: "Couldn't schedule the follow-up. Try again." };
  }

  revalidatePath("/admin");

  return { ok: true };
}

export async function completeFollowUpAction(
  taskId: string,
): Promise<FollowUpActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = idSchema.safeParse(taskId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid task reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("follow_up_tasks")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("completed", false)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/dashboard] complete follow-up failed:", error.message);
    return { ok: false, error: "Couldn't complete the follow-up. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Follow-up not found or already completed." };
  }

  revalidatePath("/admin");

  return { ok: true };
}

/* ───────────────────────────── Assignment ──────────────────────────────── */

const assignLeadSchema = z.object({
  leadId: idSchema,
  adminId: z.string().trim().max(100).nullable(),
});

export async function assignLeadAction(
  input: z.infer<typeof assignLeadSchema>,
): Promise<FollowUpActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = assignLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid assignment." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .update({
      assigned_to: parsed.data.adminId,
      updated_by: ctx.profile.id,
    })
    .eq("id", parsed.data.leadId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/dashboard] assign lead failed:", error.message);
    return { ok: false, error: "Couldn't update the assignment. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/leads/${data.id}`);

  return { ok: true };
}

/* ─────────────────────────── Global search ─────────────────────────────── */

const searchSchema = z.string().trim().min(2).max(100);

export type GlobalSearchResult =
  | { ok: true; results: CrmSearchResults }
  | { ok: false; error: string };

export async function globalSearchAction(
  query: string,
): Promise<GlobalSearchResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = searchSchema.safeParse(query);
  if (!parsed.success) {
    return {
      ok: true,
      results: { leads: [], emails: [], notes: [], activities: [] },
    };
  }

  try {
    const results = await searchCrm(parsed.data);
    return { ok: true, results };
  } catch (error) {
    console.error("[admin/dashboard] search failed:", error);
    return { ok: false, error: "Search failed. Try again." };
  }
}