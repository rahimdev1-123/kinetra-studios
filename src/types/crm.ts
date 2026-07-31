/**
 * Kinetra CRM — domain types shared across the admin panel (Phase 1).
 *
 * Lead status is intentionally validated in the APP, not with a DB CHECK
 * constraint, so any status values already present in your local/live data
 * never break queries — unknown values simply render as "New" fallbacks
 * until updated through the workflow.
 */

import type { Tables } from "@/types/database.types";

export type Lead = Tables<"leads">;
export type AdminUser = Tables<"admin_users">;
export type LeadNote = Tables<"lead_notes">;
export type LeadActivity = Tables<"lead_activities">;
export type LeadEmail = Tables<"lead_emails">;
export type AdminNotification = Tables<"admin_notifications">;
export type AdminSetting = Tables<"admin_settings">;

/** Ordered pipeline — drives the status workflow UI in later phases. */
export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}

/** Coerce arbitrary stored values to a known status (defensive rendering). */
export function toLeadStatus(value: unknown): LeadStatus {
  return isLeadStatus(value) ? value : "new";
}

/** Activity timeline event types (log grows in later phases). */
export const ACTIVITY_TYPES = [
  "lead_created",
  "status_changed",
  "note_added",
  "note_updated",
  "note_deleted",
  "lead_archived",
  "lead_restored",
  "email_sent",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];