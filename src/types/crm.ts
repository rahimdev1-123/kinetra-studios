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
export type FollowUpTask = Tables<"follow_up_tasks">;
export type NotificationPreference = Tables<"notification_preferences">;
export type NotificationTemplate = Tables<"notification_templates">;

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

/** Notification event types (Phase 8) — client-safe, like LEAD_STATUSES. */
export const NOTIFICATION_TYPES = [
  "new_lead",
  "lead_assigned",
  "lead_updated",
  "status_changed",
  "lead_archived",
  "lead_restored",
  "email_sent",
  "email_failed",
  "task_due",
  "task_overdue",
  "reminder",
  "manual",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_lead: "New lead",
  lead_assigned: "Lead assigned",
  lead_updated: "Lead updated",
  status_changed: "Status changed",
  lead_archived: "Lead archived",
  lead_restored: "Lead restored",
  email_sent: "Email sent",
  email_failed: "Email failed",
  task_due: "Task due",
  task_overdue: "Task overdue",
  reminder: "Reminder",
  manual: "Announcement",
};

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

export const NOTIFICATION_PRIORITIES = ["low", "normal", "high"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

/** Coerce arbitrary stored values to a known priority (defensive). */
export function toNotificationPriority(value: unknown): NotificationPriority {
  return value === "low" || value === "high" ? value : "normal";
}