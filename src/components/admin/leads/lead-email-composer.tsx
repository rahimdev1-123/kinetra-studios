"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Mail, Paperclip, Send } from "lucide-react";

import {
  sendLeadEmailAction,
  type SendEmailFormState,
} from "@/app/admin/(dashboard)/leads/[id]/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  LEAD_EMAIL_TEMPLATES,
  renderLeadEmailTemplate,
  type LeadEmailTemplateId,
} from "@/lib/admin/email-templates";

/**
 * Kinetra CRM — email composer dialog (Phase 5).
 *
 * Templates pre-fill subject + message (editable before sending). Submission
 * runs through a React 19 useActionState server action; the parent email
 * history shows the message optimistically while it sends. The recipient is
 * displayed read-only and resolved server-side from the lead record — the
 * composer can't be repurposed to email arbitrary addresses.
 *
 * "Attach files" is a disabled placeholder — the lead_emails schema already
 * carries has_attachments, so uploads can land in a later phase without a
 * migration.
 */

export interface EmailDraft {
  subject: string;
  body: string;
}

interface LeadEmailComposerProps {
  leadId: string;
  leadEmail: string;
  leadName: string;
  projectType: string | null;
  adminName: string;
  onOptimisticSend: (draft: EmailDraft) => void;
}

const initialState: SendEmailFormState = {
  status: "idle",
  error: null,
  warning: null,
  resetKey: 0,
};

export function LeadEmailComposer({
  leadId,
  leadEmail,
  leadName,
  projectType,
  adminName,
  onOptimisticSend,
}: LeadEmailComposerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, formAction, isSending] = useActionState(
    sendLeadEmailAction,
    initialState,
  );

  // Close + reset + toast exactly once per successful send.
  const handledResetKey = useRef(0);
  useEffect(() => {
    if (state.status === "success" && state.resetKey !== handledResetKey.current) {
      handledResetKey.current = state.resetKey;
      setOpen(false);
      setTemplateId("");
      setSubject("");
      setBody("");
      toast({
        title: "Email sent",
        description: state.warning ?? `Your message is on its way to ${leadName}.`,
        variant: state.warning ? "destructive" : undefined,
      });
    }
  }, [state, leadName, toast]);

  function applyTemplate(nextId: string) {
    setTemplateId(nextId);

    const template = LEAD_EMAIL_TEMPLATES.find(
      (t) => t.id === (nextId as LeadEmailTemplateId),
    );
    if (!template) return;

    const rendered = renderLeadEmailTemplate(template, {
      leadName,
      adminName,
      projectType,
    });

    setSubject(rendered.subject);
    setBody(rendered.body);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="gap-2">
          <Mail className="h-4 w-4" aria-hidden="true" />
          Send email
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Email {leadName}</DialogTitle>
          <DialogDescription>
            Sent via Resend from the studio address. Logged to the lead's
            history and timeline automatically.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            onOptimisticSend({
              subject: String(formData.get("subject") ?? ""),
              body: String(formData.get("body") ?? ""),
            });
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="leadId" value={leadId} />

          {state.status === "error" && state.error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Template
            </Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger
                className="h-9"
                aria-label="Start from a template"
              >
                <SelectValue placeholder="Start from a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_EMAIL_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="email-to"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              To
            </Label>
            <Input
              id="email-to"
              value={leadEmail}
              disabled
              readOnly
              aria-label="Recipient (fixed to the lead's email)"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="email-subject"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Subject
            </Label>
            <Input
              id="email-subject"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
              placeholder="Subject line"
              disabled={isSending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="email-body"
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Message
            </Label>
            <Textarea
              id="email-body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={10_000}
              required
              placeholder="Write your message…"
              disabled={isSending}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              disabled
              title="File attachments arrive in a later phase"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              Attach files
              <span className="font-mono text-[9px] uppercase tracking-wider">
                soon
              </span>
            </Button>

            <Button type="submit" className="gap-2" disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {isSending ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}