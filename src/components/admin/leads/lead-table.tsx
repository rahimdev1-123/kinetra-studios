import Link from "next/link";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLeadSource } from "@/lib/admin/leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";
import { LeadRowActions } from "./lead-row-actions";
import { LeadStatusBadge } from "./lead-status-badge";

/**
 * Kinetra CRM — leads table (Phase 3).
 *
 * Server component: rows render on the server; the only client islands are
 * the per-row action menus. Horizontal scroll keeps all nine columns
 * available on small screens.
 */

interface LeadTableProps {
  leads: Lead[];
}

function Dash() {
  return <span className="text-muted-foreground/50">—</span>;
}

const HEAD_CLASS =
  "whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground";

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEAD_CLASS}>Name</TableHead>
              <TableHead className={HEAD_CLASS}>Email</TableHead>
              <TableHead className={HEAD_CLASS}>Company</TableHead>
              <TableHead className={HEAD_CLASS}>Service requested</TableHead>
              <TableHead className={HEAD_CLASS}>Budget</TableHead>
              <TableHead className={HEAD_CLASS}>Status</TableHead>
              <TableHead className={HEAD_CLASS}>Source</TableHead>
              <TableHead className={HEAD_CLASS}>Created</TableHead>
              <TableHead className={cn(HEAD_CLASS, "text-right")}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isArchived = lead.archived_at !== null;
              const created = new Date(lead.created_at);

              return (
                <TableRow
                  key={lead.id}
                  className={cn(isArchived && "opacity-60")}
                >
                  <TableCell className="max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="truncate font-medium text-foreground hover:text-primary"
                      >
                        {lead.name}
                      </Link>
                      {isArchived ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          Archived
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[240px]">
                    <a
                      href={`mailto:${lead.email}`}
                      className="block truncate text-muted-foreground hover:text-foreground"
                    >
                      {lead.email}
                    </a>
                  </TableCell>

                  <TableCell className="max-w-[180px]">
                    {lead.company ? (
                      <span className="block truncate">{lead.company}</span>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {lead.project_type ?? <Dash />}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {lead.budget_range ?? <Dash />}
                  </TableCell>

                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatLeadSource(lead.source)}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <time
                      dateTime={lead.created_at}
                      title={format(created, "PPpp")}
                      className="text-muted-foreground"
                    >
                      {format(created, "MMM d, yyyy")}
                    </time>
                  </TableCell>

                  <TableCell className="text-right">
                    <LeadRowActions
                      leadId={lead.id}
                      leadName={lead.name}
                      isArchived={isArchived}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}