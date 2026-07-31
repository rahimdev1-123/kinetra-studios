"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendLeadEmail } from "@/lib/resend";
import { isLeadStatus, type LeadStatus } from "@/types/crm";

/**
 * Kinetra CRM — Lead detail server actions (Phase 4).
 *
 * Status workflow + internal notes. Every action re-verifies the caller
 * against the admin allowlist (defense in depth on top of middleware and the
 * guarded layout). Timeline events are recorded automatically by the
 * database triggers from migration 5 — actions only perform the mutation
 * and stamp `updated_by` so the triggers can attribute the actor.
 */

const leadIdSchema = z.string().trim().min(1).max(100);
const noteIdSchema = z.string().trim().min(1).max(100);

const noteBodySchema = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(5000, "Notes are limited to 5,000 characters.");

export interface LeadStatusActionResult {
  ok: boolean;
  error?: string;
}

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<LeadStatusActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsedId = leadIdSchema.safeParse(leadId);
  if (!parsedId.success || !isLeadStatus(status)) {
    return { ok: false, error: "Invalid status change." };
  }

  const admin = createSupabaseAdminClient();

  // status_changed_at is stamped by the BEFORE UPDATE trigger; the AFTER
  // UPDATE trigger writes the status_changed timeline event with this actor.
  const { data, error } = await admin
    .from("leads")
    .update({ status, updated_by: ctx.profile.id })
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] status update failed:", error.message);
    return { ok: false, error: "Couldn't update the status. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.id}`);

  return { ok: true };
}

export interface AddNoteFormState {
  status: "idle" | "success" | "error";
  error: string | null;
  /** Bumped on success — the form uses it as a React key to reset itself. */
  resetKey: number;
}

export async function addNoteAction(
  prevState: AddNoteFormState,
  formData: FormData,
): Promise<AddNoteFormState> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ...prevState, status: "error", error: "Not authorized." };
  }

  const parsedId = leadIdSchema.safeParse(formData.get("leadId"));
  const parsedBody = noteBodySchema.safeParse(formData.get("body"));

  if (!parsedId.success) {
    return { ...prevState, status: "error", error: "Invalid lead reference." };
  }

  if (!parsedBody.success) {
    return {
      ...prevState,
      status: "error",
      error: parsedBody.error.issues[0]?.message ?? "Invalid note.",
    };
  }

  const admin = createSupabaseAdminClient();

  // The note trigger logs 'note_added' with author attribution.
  const { error } = await admin.from("lead_notes").insert({
    lead_id: parsedId.data,
    author_id: ctx.profile.id,
    body: parsedBody.data,
  });

  if (error) {
    console.error("[admin/leads] add note failed:", error.message);
    return {
      ...prevState,
      status: "error",
      error: "Couldn't save the note. Try again.",
    };
  }

  revalidatePath(`/admin/leads/${parsedId.data}`);

  return {
    status: "success",
    error: null,
    resetKey: prevState.resetKey + 1,
  };
}

export interface NoteActionResult {
  ok: boolean;
  error?: string;
}

export async function updateNoteAction(
  noteId: string,
  body: string,
): Promise<NoteActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsedId = noteIdSchema.safeParse(noteId);
  const parsedBody = noteBodySchema.safeParse(body);

  if (!parsedId.success) {
    return { ok: false, error: "Invalid note reference." };
  }

  if (!parsedBody.success) {
    return {
      ok: false,
      error: parsedBody.error.issues[0]?.message ?? "Invalid note.",
    };
  }

  const admin = createSupabaseAdminClient();

  // Authors may only edit their own notes (mirrors the RLS policy from
  // migration 3; enforced here because admin actions use the service role).
  const { data, error } = await admin
    .from("lead_notes")
    .update({ body: parsedBody.data })
    .eq("id", parsedId.data)
    .eq("author_id", ctx.profile.id)
    .select("id, lead_id")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] update note failed:", error.message);
    return { ok: false, error: "Couldn't update the note. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Note not found, or it isn't yours to edit." };
  }

  revalidatePath(`/admin/leads/${data.lead_id}`);

  return { ok: true };
}

export async function deleteNoteAction(
  noteId: string,
): Promise<NoteActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsedId = noteIdSchema.safeParse(noteId);
  if (!parsedId.success) {
    return { ok: false, error: "Invalid note reference." };
  }

  const admin = createSupabaseAdminClient();

  // Authors may only delete their own notes; the trigger logs 'note_deleted'
  // with an excerpt so the timeline keeps its history.
  const { data, error } = await admin
    .from("lead_notes")
    .delete()
    .eq("id", parsedId.data)
    .eq("author_id", ctx.profile.id)
    .select("id, lead_id")
    .maybeSingle();

  if (error) {
    console.error("[admin/leads] delete note failed:", error.message);
    return { ok: false, error: "Couldn't delete the note. Try again." };
  }

  if (!data) {
    return { ok: false, error: "Note not found, or it isn't yours to delete." };
  }

  revalidatePath(`/admin/leads/${data.lead_id}`);

  return { ok: true };
}

/* ========================================================================== */
/* Phase 5 — Client Communication Hub                                         */
/* ========================================================================== */

const emailSubjectSchema = z
  .string()
  .trim()
  .min(1, "Add a subject line.")
  .max(200, "Subjects are limited to 200 characters.");

const emailBodySchema = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(10_000, "Messages are limited to 10,000 characters.");

export interface SendEmailFormState {
  status: "idle" | "success" | "error";
  error: string | null;
  /** Non-fatal issue after a successful send (e.g. history save failed). */
  warning: string | null;
  /** Bumped on success — the composer uses it to close and reset. */
  resetKey: number;
}

export async function sendLeadEmailAction(
  prevState: SendEmailFormState,
  formData: FormData,
): Promise<SendEmailFormState> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ...prevState, status: "error", error: "Not authorized." };
  }

  const parsedId = leadIdSchema.safeParse(formData.get("leadId"));
  const parsedSubject = emailSubjectSchema.safeParse(formData.get("subject"));
  const parsedBody = emailBodySchema.safeParse(formData.get("body"));

  if (!parsedId.success) {
    return { ...prevState, status: "error", error: "Invalid lead reference." };
  }

  if (!parsedSubject.success) {
    return {
      ...prevState,
      status: "error",
      error: parsedSubject.error.issues[0]?.message ?? "Invalid subject.",
    };
  }

  if (!parsedBody.success) {
    return {
      ...prevState,
      status: "error",
      error: parsedBody.error.issues[0]?.message ?? "Invalid message.",
    };
  }

  const admin = createSupabaseAdminClient();

  // SECURITY: the recipient is resolved from the database, never from the
  // client — the composer cannot be repurposed to email arbitrary addresses.
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .select("id, email, name")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (leadError) {
    console.error("[admin/leads] email lead lookup failed:", leadError.message);
    return {
      ...prevState,
      status: "error",
      error: "Couldn't load the lead. Try again.",
    };
  }

  if (!lead) {
    return { ...prevState, status: "error", error: "Lead not found." };
  }

  const { error: sendError } = await sendLeadEmail({
    to: lead.email,
    subject: parsedSubject.data,
    text: parsedBody.data,
  });

  if (sendError) {
    console.error("[admin/leads] resend send failed:", sendError.message);
    return {
      ...prevState,
      status: "error",
      error: `Email couldn't be sent: ${sendError.message}`,
    };
  }

  // Record the email; the DB trigger logs the 'email_sent' timeline event.
  const { error: insertError } = await admin.from("lead_emails").insert({
    lead_id: lead.id,
    sent_by: ctx.profile.id,
    subject: parsedSubject.data,
    body: parsedBody.data,
    delivery_status: "sent",
  });

  let warning: string | null = null;

  if (insertError) {
    console.error(
      "[admin/leads] lead_emails insert failed:",
      insertError.message,
    );
    warning =
      "The email was sent, but saving it to the history failed. Check that migration 6 has been applied.";
  }

  revalidatePath(`/admin/leads/${lead.id}`);

  return {
    status: "success",
    error: null,
    warning,
    resetKey: prevState.resetKey + 1,
  };
}
/* ========================================================================== */
/* Archive / restore — exported here for the leads table row actions.        */
/* Same behavior as the actions in leads/actions.ts: stamp updated_by and    */
/* let the migration-5 triggers write the timeline events.                   */
/* ========================================================================== */

const archiveLeadIdSchema = z.string().trim().min(1).max(100);

export interface LeadActionResult {
  ok: boolean;
  error?: string;
}

export async function archiveLeadAction(
  leadId: string,
): Promise<LeadActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = archiveLeadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid lead reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: ctx.profile.id,
    })
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

  const parsed = archiveLeadIdSchema.safeParse(leadId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid lead reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .update({
      archived_at: null,
      updated_by: ctx.profile.id,
    })
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

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${data.id}`);

  return { ok: true };
}