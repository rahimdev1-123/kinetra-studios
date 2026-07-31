"use client";

import { useOptimistic, useState } from "react";
import { format } from "date-fns";
import { Loader2, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LeadEmailComposer,
  type EmailDraft,
} from "./lead-email-composer";

/**
 * Kinetra CRM — email history + composer host (Phase 5).
 *
 * Chronological (oldest → newest) outbound-email history, matching the
 * notes convention. React 19 useOptimistic appends a "Sending…" entry the
 * instant the composer submits; when the server action completes and the
 * page revalidates, the real row (from lead_emails) replaces it.
 */

export interface EmailView {
  id: string;
  subject: string;
  body: string;
  senderLabel: string;
  sentAt: string;
  deliveryStatus: string;
  pending?: boolean;
}

interface LeadEmailsProps {
  leadId: string;
  leadEmail: string;
  leadName: string;
  projectType: string | null;
  adminName: string;
  emails: EmailView[];
}

function DeliveryBadge({ email }: { email: EmailView }) {
  if (email.pending) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
      >
        <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
        Sending
      </Badge>
    );
  }

  const isSent = email.deliveryStatus === "sent";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[9px] uppercase tracking-wider",
        isSent
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
          : "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      {email.deliveryStatus}
    </Badge>
  );
}

function EmailItem({ email }: { email: EmailView }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = email.body.length > 260 || email.body.split("\n").length > 4;

  return (
    <li className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {email.subject}
        </p>
        <DeliveryBadge email={email} />
      </div>

      <p
        className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
        title={format(new Date(email.sentAt), "PPpp")}
      >
        {email.senderLabel} · {format(new Date(email.sentAt), "MMM d, yyyy · HH:mm")}
      </p>

      <p
        className={cn(
          "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90",
          !expanded && isLong && "line-clamp-4",
        )}
      >
        {email.body}
      </p>

      {isLong ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </li>
  );
}

export function LeadEmails({
  leadId,
  leadEmail,
  leadName,
  projectType,
  adminName,
  emails,
}: LeadEmailsProps) {
  const [optimisticEmails, addOptimisticEmail] = useOptimistic(
    emails,
    (current: EmailView[], draft: EmailView) => [...current, draft],
  );

  function handleOptimisticSend(draft: EmailDraft) {
    addOptimisticEmail({
      id: `optimistic-${Date.now()}`,
      subject: draft.subject,
      body: draft.body,
      senderLabel: adminName,
      sentAt: new Date().toISOString(),
      deliveryStatus: "sending",
      pending: true,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {optimisticEmails.length === 0
            ? "No emails sent yet"
            : `${optimisticEmails.length} email${optimisticEmails.length === 1 ? "" : "s"} sent`}
        </p>
        <LeadEmailComposer
          leadId={leadId}
          leadEmail={leadEmail}
          leadName={leadName}
          projectType={projectType}
          adminName={adminName}
          onOptimisticSend={handleOptimisticSend}
        />
      </div>

      {optimisticEmails.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
          <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Introduce yourself — every email you send from here is delivered
            via Resend and logged to the timeline.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {optimisticEmails.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))}
        </ul>
      )}
    </div>
  );
}