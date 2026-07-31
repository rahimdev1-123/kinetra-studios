import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, AtSign, CalendarClock } from "lucide-react";

import { LeadActivityTimeline, type ActivityView } from "@/components/admin/leads/lead-activity-timeline";
import { LeadArchiveButton } from "@/components/admin/leads/lead-archive-button";
import { LeadEmails, type EmailView } from "@/components/admin/leads/lead-emails";
import { LeadNotes, type NoteView } from "@/components/admin/leads/lead-notes";
import { LeadStatusSelect } from "@/components/admin/leads/lead-status-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/admin/auth";
import {
  fetchAdminDirectory,
  fetchLeadActivities,
  fetchLeadById,
  fetchLeadEmails,
  fetchLeadNotes,
  formatLeadSource,
} from "@/lib/admin/leads";

/**
 * Kinetra CRM — /admin/leads/[id] (Phase 4: Lead Details & Workflow,
 * extended in Phase 5 with the Client Communication Hub).
 *
 * Server-rendered lead workspace: full inquiry details, outbound emails,
 * status workflow (optimistic select), archive/restore, internal team
 * notes, and the automatic activity timeline. Auth is enforced by
 * middleware, the guarded (dashboard) layout, and requireAdmin() here.
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

/** Render the social/handle value as a link when it's a URL. */
function SocialValue({ value }: { value: string | null }) {
  if (!value) return <Dash />;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-foreground underline decoration-border underline-offset-2 hover:text-primary"
      >
        {value}
      </a>
    );
  }

  return <span className="break-all">{value}</span>;
}

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const { profile } = await requireAdmin();

  const { id } = await params;
  const lead = await fetchLeadById(id);

  if (!lead) {
    notFound();
  }

  const [notes, activities, emails, directory] = await Promise.all([
    fetchLeadNotes(lead.id),
    fetchLeadActivities(lead.id),
    fetchLeadEmails(lead.id),
    fetchAdminDirectory(),
  ]);

  const noteViews: NoteView[] = notes.map((note) => ({
    id: note.id,
    body: note.body,
    authorId: note.author_id,
    authorLabel: directory.get(note.author_id)?.label ?? "Former admin",
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));

  const activityViews: ActivityView[] = activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    actorLabel: activity.actor_id
      ? (directory.get(activity.actor_id)?.label ?? "Former admin")
      : null,
    payload: activity.payload,
    createdAt: activity.created_at,
  }));

  const emailViews: EmailView[] = emails.map((email) => ({
    id: email.id,
    subject: email.subject,
    body: email.body,
    senderLabel: email.sent_by
      ? (directory.get(email.sent_by)?.label ?? "Former admin")
      : "System",
    sentAt: email.sent_at,
    deliveryStatus: email.delivery_status,
  }));

  const adminName = profile.display_name ?? profile.email;

  const isArchived = lead.archived_at !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
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

      {/* Two-column workspace: stacks on mobile, splits on lg+ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* Left column — inquiry + emails + notes */}
        <div className="flex min-w-0 flex-col gap-6">
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
                    className="inline-flex items-center gap-1.5 break-all text-foreground hover:text-primary"
                  >
                    <AtSign
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {lead.email}
                  </a>
                </Field>

                <Field label="Phone">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-foreground hover:text-primary"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <Dash />
                  )}
                </Field>

                <Field label="Company">{lead.company ?? <Dash />}</Field>

                <Field label="Source">{formatLeadSource(lead.source)}</Field>

                <Field label="Project type">
                  {lead.project_type ?? <Dash />}
                </Field>

                <Field label="Budget">{lead.budget_range ?? <Dash />}</Field>

                <Field label="Social / handle">
                  <SocialValue value={lead.social_url} />
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

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Emails
              </CardTitle>
              <CardDescription>
                Outbound messages to {lead.name}, chronological. Sent via
                Resend and logged to the timeline automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadEmails
                leadId={lead.id}
                leadEmail={lead.email}
                leadName={lead.name}
                projectType={lead.project_type}
                adminName={adminName}
                emails={emailViews}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Internal notes
              </CardTitle>
              <CardDescription>
                Team-only. Oldest first, like a conversation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadNotes
                leadId={lead.id}
                currentAdminId={profile.id}
                notes={noteViews}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column — workflow + timeline */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Status workflow
              </CardTitle>
              <CardDescription>
                {isArchived
                  ? "Restore the lead to change its pipeline status."
                  : "Changes apply instantly and are logged to the timeline."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <LeadStatusSelect
                leadId={lead.id}
                status={lead.status}
                disabled={isArchived}
              />

              {lead.status_changed_at ? (
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status changed{" "}
                  {format(new Date(lead.status_changed_at), "PPpp")}
                </p>
              ) : null}

              <Separator className="bg-border" />

              <LeadArchiveButton
                leadId={lead.id}
                leadName={lead.name}
                isArchived={isArchived}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Activity timeline
              </CardTitle>
              <CardDescription>
                Newest first. Recorded automatically by the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadActivityTimeline activities={activityViews} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}