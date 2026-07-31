import Link from "next/link";
import { format } from "date-fns";
import { AlarmClock, AlarmClockOff } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchMyFollowUps, type FollowUpView } from "@/lib/admin/dashboard";
import { CompleteFollowUpButton } from "./follow-up-controls";

/**
 * Kinetra CRM — follow-ups widget (Phase 7).
 *
 * Async server component. The signed-in admin's pending reminders from
 * follow_up_tasks (migration 8): overdue first (destructive accent), then
 * upcoming/scheduled, each with a one-click Done action.
 */

function FollowUpRow({ item }: { item: FollowUpView }) {
  return (
    <li className="flex items-start gap-2 py-2">
      <span
        className={cn(
          "mt-1 h-2 w-2 shrink-0 rounded-full",
          item.overdue ? "bg-destructive" : "bg-primary/70",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/leads/${item.leadId}`}
          className="block truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {item.leadName}
        </Link>
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-wider",
            item.overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {item.overdue ? "Overdue · " : "Due "}
          {format(new Date(item.dueDate), "MMM d · HH:mm")}
        </p>
        {item.notes ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.notes}
          </p>
        ) : null}
      </div>
      <CompleteFollowUpButton taskId={item.id} leadName={item.leadName} />
    </li>
  );
}

interface FollowUpsWidgetProps {
  adminId: string;
}

export async function FollowUpsWidget({ adminId }: FollowUpsWidgetProps) {
  const { overdue, upcoming } = await fetchMyFollowUps(adminId);
  const isEmpty = overdue.length === 0 && upcoming.length === 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          My follow-ups
        </CardTitle>
        <CardDescription>
          Your scheduled reminders. Set them from the Task Center or any lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isEmpty ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
            <AlarmClockOff
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No pending follow-ups. Schedule one from the Task Center to keep
              a lead warm.
            </p>
          </div>
        ) : (
          <>
            {overdue.length > 0 ? (
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
                  <AlarmClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Overdue · {overdue.length}
                </p>
                <ul className="mt-1 divide-y divide-border/40">
                  {overdue.map((item) => (
                    <FollowUpRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <AlarmClock className="h-3.5 w-3.5" aria-hidden="true" />
                  Upcoming · {upcoming.length}
                </p>
                <ul className="mt-1 divide-y divide-border/40">
                  {upcoming.map((item) => (
                    <FollowUpRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}