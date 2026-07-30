import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, AtSign, CalendarClock, Clapperboard } from "lucide-react";

import { LeadStatusBadge } from "@/components/admin/leads/lead-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/admin/auth";
import { fetchLeadById, formatLeadSource } from "@/lib/admin/leads";

/**
 * Kinetra CRM — /admin/leads/[id] (Phase 3 scope).
 *
 * The navigation target for the table's "View" action. Phase 3 ships the
 * read-only lead summary; Phase 4 expands this page with the status
 * workflow, internal notes, and the activity timeline.
 */

export const metadata: Metadata = {
  title: "Lead details",
};

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function Dash() {
  return <span className="text-muted-foreground/50">—</span>;
}

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  await requireAdmin();

  const { id } = await params;
  const lead = await fetchLeadById(id);

  if (!lead) {
    notFound();
  }

  const isArchived = lead.archived_at !== null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/leads">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to leads
          </Link>
        </Button>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.name}
          </h1>
          <LeadStatusBadge status={lead.status} />
          {isArchived ? (
            <Badge
              variant="outline"
              className="border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
            >
              Archived
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Received {format(new Date(lead.created_at), "PPpp")}
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Inquiry
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Email">
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1.5 text-foreground hover:text-primary"
              >
                <AtSign
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                {lead.email}
              </a>
            </Field>

            <Field label="Company">
              {lead.company ?? <Dash />}
            </Field>

            <Field label="Service requested">
              {lead.project_type ?? <Dash />}
            </Field>

            <Field label="Budget">{lead.budget_range ?? <Dash />}</Field>

            <Field label="Source">{formatLeadSource(lead.source)}</Field>

            <Field label="Social / handle">
              {lead.social_url ?? <Dash />}
            </Field>
          </div>

          <Separator className="bg-border" />

          <Field label="Message">
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {lead.message}
            </p>
          </Field>
        </CardContent>
      </Card>

      <Card className="border-dashed border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
            Up next — Phase 4
          </CardTitle>
          <CardDescription>
            This page grows into the full lead workspace: status workflow,
            internal notes, and the activity timeline.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}