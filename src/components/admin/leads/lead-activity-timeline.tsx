import { format, formatDistanceToNow } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CircleDot,
  Mail,
  PenLine,
  PlusCircle,
  StickyNote,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import type { Json } from "@/types/database.types";
import { toLeadStatus, type ActivityType } from "@/types/crm";
import { LeadStatusBadge } from "./lead-status-badge";

/**
 * Kinetra CRM — activity timeline (Phase 4).
 *
 * Server component. Renders lead_activities newest-first. Events are written
 * automatically by the migration-5 database triggers (lead created, status
 * changes, notes added/edited/deleted, archived/restored), so the timeline
 * is complete no matter which code path made the change.
 */

export interface ActivityView {
  id: string;
  type: string;
  actorLabel: string | null;
  payload: Json;
  createdAt: string;
}

interface LeadActivityTimelineProps {
  activities: ActivityView[];
}

export const ACTIVITY_META: Record<
  ActivityType,
  { icon: LucideIcon; label: string }
> = {
  lead_created: { icon: PlusCircle, label: "Lead created" },
  status_changed: { icon: ArrowRight, label: "Status changed" },
  note_added: { icon: StickyNote, label: "Note added" },
  note_updated: { icon: PenLine, label: "Note edited" },
  note_deleted: { icon: Trash2, label: "Note deleted" },
  lead_archived: { icon: Archive, label: "Lead archived" },
  lead_restored: { icon: ArchiveRestore, label: "Lead restored" },
  email_sent: { icon: Mail, label: "Email sent" },
};

export function metaFor(type: string): { icon: LucideIcon; label: string } {
  return (
    ACTIVITY_META[type as ActivityType] ?? {
      icon: CircleDot,
      label: type.replaceAll("_", " "),
    }
  );
}

function payloadField(payload: Json, key: string): string | null {
  if (
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload)
  ) {
    const value = payload[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

function ActivityDetail({ activity }: { activity: ActivityView }) {
  if (activity.type === "status_changed") {
    const from = payloadField(activity.payload, "from");
    const to = payloadField(activity.payload, "to");

    if (from && to) {
      return (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <LeadStatusBadge status={toLeadStatus(from)} />
          <ArrowRight
            className="h-3 w-3 text-muted-foreground"
            aria-hidden="true"
          />
          <LeadStatusBadge status={toLeadStatus(to)} />
        </span>
      );
    }
    return null;
  }

  if (
    activity.type === "note_added" ||
    activity.type === "note_updated" ||
    activity.type === "note_deleted"
  ) {
    const excerpt = payloadField(activity.payload, "excerpt");
    if (excerpt) {
      return (
        <span className="mt-1 block truncate text-xs italic text-muted-foreground">
          “{excerpt}”
        </span>
      );
    }
    return null;
  }

  if (activity.type === "email_sent") {
    const subject = payloadField(activity.payload, "subject");
    if (subject) {
      return (
        <span className="mt-1 block truncate text-xs italic text-muted-foreground">
          “{subject}”
        </span>
      );
    }
    return null;
  }

  return null;
}

export function LeadActivityTimeline({
  activities,
}: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-muted-foreground">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col">
      {activities.map((activity, index) => {
        const { icon: Icon, label } = metaFor(activity.type);
        const created = new Date(activity.createdAt);
        const isLast = index === activities.length - 1;

        const actor =
          activity.actorLabel ??
          (activity.type === "lead_created" ? "Website form" : "System");

        return (
          <li key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Connector line */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-border"
              />
            ) : null}

            {/* Icon dot */}
            <span className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
              <Icon
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <ActivityDetail activity={activity} />
              <p
                className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                title={format(created, "PPpp")}
              >
                {actor} · {formatDistanceToNow(created, { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}