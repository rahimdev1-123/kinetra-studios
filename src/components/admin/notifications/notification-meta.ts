import {
  AlarmClock,
  Archive,
  ArchiveRestore,
  Bell,
  CalendarClock,
  Mail,
  MailX,
  Megaphone,
  Pencil,
  RefreshCw,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import type { NotificationPriority, NotificationType } from "@/types/crm";

/**
 * Kinetra CRM — notification presentation metadata (Phase 8).
 *
 * Client-safe icon + accent mapping shared by the bell dropdown and the
 * /admin/notifications list, so a "task_overdue" looks identical everywhere.
 * Unknown types (future migrations, hand-inserted rows) fall back to the
 * plain bell — never a crash.
 */

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  new_lead: UserPlus,
  lead_assigned: UserCheck,
  lead_updated: Pencil,
  status_changed: RefreshCw,
  lead_archived: Archive,
  lead_restored: ArchiveRestore,
  email_sent: Mail,
  email_failed: MailX,
  task_due: CalendarClock,
  task_overdue: AlarmClock,
  reminder: Bell,
  manual: Megaphone,
};

export function notificationIcon(type: string): LucideIcon {
  return TYPE_ICONS[type as NotificationType] ?? Bell;
}

/** Dot / accent classes for the unread indicator, keyed by priority. */
export function priorityDotClass(priority: NotificationPriority): string {
  switch (priority) {
    case "high":
      return "bg-destructive";
    case "low":
      return "bg-muted-foreground/60";
    default:
      return "bg-primary";
  }
}

/** Icon-circle tint, keyed by priority (uses existing design tokens only). */
export function priorityIconClass(priority: NotificationPriority): string {
  switch (priority) {
    case "high":
      return "bg-destructive/10 text-destructive";
    case "low":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-primary/10 text-primary";
  }
}