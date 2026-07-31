import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

import { metaFor } from "@/components/admin/leads/lead-activity-timeline";
import type { RecentActivityItem } from "@/lib/admin/analytics";

/**
 * Kinetra CRM — recent activity widget (Phase 6).
 *
 * Server component: the latest CRM events across ALL leads (the Phase 4
 * timeline is per-lead). Reuses the exported activity meta map from the
 * timeline component — no duplicated icon/label definitions.
 */

interface RecentActivityProps {
  items: RecentActivityItem[];
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-muted-foreground">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const { icon: Icon, label } = metaFor(item.type);
        const created = new Date(item.createdAt);

        return (
          <li
            key={item.id}
            className="flex items-start gap-3 border-b border-border/60 py-3 first:pt-0 last:border-b-0 last:pb-0"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
              <Icon
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{label}</span>
                {" · "}
                <Link
                  href={`/admin/leads/${item.leadId}`}
                  className="text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {item.leadName}
                </Link>
              </p>
              <p
                className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                title={format(created, "PPpp")}
              >
                {item.actorLabel ?? "Website form"} ·{" "}
                {formatDistanceToNow(created, { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}