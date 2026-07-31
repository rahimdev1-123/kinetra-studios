import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, UserRound } from "lucide-react";

import { LeadStatusBadge } from "@/components/admin/leads/lead-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchMyLeads } from "@/lib/admin/dashboard";

/**
 * Kinetra CRM — "My Leads" widget (Phase 7).
 *
 * Async server component. Active leads assigned to the signed-in admin
 * (leads.assigned_to, migration 8), newest first. Assign leads from any
 * lead's detail page.
 */

interface MyLeadsWidgetProps {
  adminId: string;
}

export async function MyLeadsWidget({ adminId }: MyLeadsWidgetProps) {
  const leads = await fetchMyLeads(adminId, 6);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          My leads
        </CardTitle>
        <CardDescription>
          Active leads assigned to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
            <UserRound
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Nothing assigned to you yet — open any lead and use the
              &ldquo;Assigned to&rdquo; selector.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {lead.name}
                  </Link>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <LeadStatusBadge status={lead.status} className="shrink-0" />
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Link href={`/admin/leads/${lead.id}`}>
                    View
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}