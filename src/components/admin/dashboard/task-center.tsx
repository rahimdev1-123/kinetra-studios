import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  ArrowUpRight,
  CalendarX,
  Gem,
  Hourglass,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { LeadStatusBadge } from "@/components/admin/leads/lead-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchTaskCenter, type TaskCenterLead } from "@/lib/admin/dashboard";
import { FollowUpDialog } from "./follow-up-controls";

/**
 * Kinetra CRM — Task Center widget (Phase 7).
 *
 * Async server component. Five prioritized work queues from ONE aggregated
 * RPC (kinetra_task_center, migration 8). Workable buckets get an inline
 * "Follow up" quick action; every row links to the lead.
 */

interface BucketDef {
  key: keyof Awaited<ReturnType<typeof fetchTaskCenter>>;
  title: string;
  icon: LucideIcon;
  withFollowUp: boolean;
}

const BUCKETS: BucketDef[] = [
  {
    key: "no_follow_up",
    title: "Needs a follow-up",
    icon: CalendarX,
    withFollowUp: true,
  },
  {
    key: "waiting_24h",
    title: "Waiting > 24 hours",
    icon: Hourglass,
    withFollowUp: true,
  },
  {
    key: "high_value",
    title: "High value",
    icon: Gem,
    withFollowUp: true,
  },
  {
    key: "recent_won",
    title: "Recently won",
    icon: Trophy,
    withFollowUp: false,
  },
  {
    key: "recent_archived",
    title: "Recently archived",
    icon: Archive,
    withFollowUp: false,
  },
];

function TaskRow({
  lead,
  withFollowUp,
}: {
  lead: TaskCenterLead;
  withFollowUp: boolean;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <Link
        href={`/admin/leads/${lead.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-primary"
      >
        {lead.name}
      </Link>
      <LeadStatusBadge status={lead.status} className="shrink-0" />
      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
        {formatDistanceToNow(new Date(lead.event_at), { addSuffix: true })}
      </span>
      {withFollowUp ? (
        <FollowUpDialog leadId={lead.id} leadName={lead.name} />
      ) : (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/admin/leads/${lead.id}`}>
            View
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </li>
  );
}

export async function TaskCenter() {
  const data = await fetchTaskCenter(4);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Task center
        </CardTitle>
        <CardDescription>
          Prioritized queues across the whole pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {BUCKETS.map((bucket) => {
          const Icon = bucket.icon;
          const leads = data[bucket.key];

          return (
            <div key={bucket.key}>
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {bucket.title}
                <span className="text-muted-foreground/60">
                  · {leads.length}
                </span>
              </p>
              {leads.length === 0 ? (
                <p className="mt-1 pl-5 text-xs text-muted-foreground/60">
                  Nothing here — clear.
                </p>
              ) : (
                <ul className="mt-1 divide-y divide-border/40 pl-5">
                  {leads.map((lead) => (
                    <TaskRow
                      key={`${bucket.key}-${lead.id}`}
                      lead={lead}
                      withFollowUp={bucket.withFollowUp}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}