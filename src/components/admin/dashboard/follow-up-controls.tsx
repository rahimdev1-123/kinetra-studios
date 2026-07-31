"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";

import {
  completeFollowUpAction,
  createFollowUpAction,
} from "@/app/admin/(dashboard)/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — follow-up client controls (Phase 7).
 *
 * FollowUpDialog: schedule a reminder for a lead (used by the Task Center
 * rows). CompleteFollowUpButton: one-click completion (used by the
 * Follow-ups widget). Both call the Phase 7 server actions, which
 * revalidate the dashboard.
 */

/** Default due: tomorrow 09:00 local, formatted for <input type="datetime-local">. */
function defaultDueValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FollowUpDialogProps {
  leadId: string;
  leadName: string;
}

export function FollowUpDialog({ leadId, leadName }: FollowUpDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(defaultDueValue);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const parsed = new Date(due);
    if (Number.isNaN(parsed.getTime())) {
      toast({
        title: "Pick a due date",
        description: "The follow-up needs a valid date and time.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await createFollowUpAction({
        leadId,
        dueIso: parsed.toISOString(),
        notes: notes.trim() || undefined,
      });

      if (result.ok) {
        toast({
          title: "Follow-up scheduled",
          description: `Reminder set for ${leadName}.`,
        });
        setOpen(false);
        setDue(defaultDueValue());
        setNotes("");
      } else {
        toast({
          title: "Couldn't schedule follow-up",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          aria-label={`Schedule follow-up for ${leadName}`}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Follow up
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Follow up with {leadName}</DialogTitle>
          <DialogDescription>
            Schedules a reminder for you on the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor={`fu-due-${leadId}`}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Due
            </Label>
            <Input
              id={`fu-due-${leadId}`}
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor={`fu-notes-${leadId}`}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Notes (optional)
            </Label>
            <Textarea
              id={`fu-notes-${leadId}`}
              rows={3}
              maxLength={1000}
              placeholder="What's the next step?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            )}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CompleteFollowUpButtonProps {
  taskId: string;
  leadName: string;
}

export function CompleteFollowUpButton({
  taskId,
  leadName,
}: CompleteFollowUpButtonProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function complete() {
    startTransition(async () => {
      const result = await completeFollowUpAction(taskId);
      if (result.ok) {
        toast({
          title: "Follow-up completed",
          description: `Nice — ${leadName} is handled.`,
        });
      } else {
        toast({
          title: "Couldn't complete follow-up",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2"
      onClick={complete}
      disabled={isPending}
      aria-label={`Mark follow-up for ${leadName} as done`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Done
    </Button>
  );
}