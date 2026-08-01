"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, RotateCcw, Trash2 } from "lucide-react";

import {
  deleteArchivedLeadsAction,
  exportCrmDataAction,
  resetSettingsAction,
} from "@/app/admin/(dashboard)/settings/actions";
import { SettingsSection } from "@/components/admin/settings/settings-section";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — Danger Zone tab (Phase 9).
 *
 * Export everything (JSON bundle), permanently purge ARCHIVED leads (typed
 * DELETE confirmation, chunked server-side, children removed explicitly),
 * and reset settings groups to their defaults. Active leads are never
 * touched by anything on this tab.
 */

const CONFIRM_PHRASE = "DELETE";

function ExportDataCard() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await exportCrmDataAction();
      if (!result.ok) {
        toast({ title: "Export failed", description: result.error });
        return;
      }

      const blob = new Blob([result.json], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: `${result.counts.leads} leads, ${result.counts.lead_notes} notes, ${result.counts.lead_emails} emails, ${result.counts.lead_activities} activities, ${result.counts.follow_up_tasks} tasks.`,
      });
    });
  };

  return (
    <SettingsSection
      title="Export all CRM data"
      description="One JSON bundle with leads, notes, activity, emails, and follow-up tasks (capped at 5,000 rows per table). Take a copy before doing anything destructive below."
    >
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-border"
          onClick={run}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Download export
        </Button>
      </div>
    </SettingsSection>
  );
}

function PurgeArchivedCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const run = () => {
    startTransition(async () => {
      const result = await deleteArchivedLeadsAction({ confirm: confirmText });
      if (!result.ok) {
        toast({ title: "Purge failed", description: result.error });
        return;
      }
      setOpen(false);
      setConfirmText("");
      toast({
        title: "Archived leads deleted",
        description:
          result.deleted === 0
            ? "There were no archived leads to delete."
            : `${result.deleted} archived lead${result.deleted === 1 ? "" : "s"} and all related records were permanently removed.`,
      });
      router.refresh();
    });
  };

  return (
    <SettingsSection
      destructive
      title="Permanently delete archived leads"
      description="Removes every ARCHIVED lead plus its notes, activity, emails, tasks, and notifications. Active leads are not touched. This cannot be undone."
    >
      <div className="flex justify-start">
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmText("");
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete archived leads…
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently delete archived leads?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Every archived lead and all of its notes, activity history,
                emails, follow-up tasks, and notifications will be permanently
                removed. There is no undo. Consider downloading an export
                first.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="purge-confirm">
                Type{" "}
                <span className="font-mono font-semibold text-destructive">
                  {CONFIRM_PHRASE}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="purge-confirm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoComplete="off"
                className="border-border bg-background font-mono"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={run}
                disabled={confirmText !== CONFIRM_PHRASE || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
                Delete permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsSection>
  );
}

function ResetSettingsCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const run = () => {
    startTransition(async () => {
      const result = await resetSettingsAction();
      if (!result.ok) {
        toast({ title: "Reset failed", description: result.error });
        return;
      }
      setOpen(false);
      toast({
        title: "Settings reset",
        description: "All settings groups are back to their defaults.",
      });
      router.refresh();
    });
  };

  return (
    <SettingsSection
      destructive
      title="Reset settings to defaults"
      description="Restores General, CRM, Email, Appearance, and Security settings to their factory values. Leads and CRM data are not affected."
    >
      <div className="flex justify-start">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset all settings…
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
              <AlertDialogDescription>
                Every settings group goes back to its defaults. Your leads,
                notes, emails, and notification preferences are untouched.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={run}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                )}
                Reset settings
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsSection>
  );
}

export function DangerZone() {
  return (
    <div className="flex flex-col gap-6">
      <ExportDataCard />
      <PurgeArchivedCard />
      <ResetSettingsCard />
    </div>
  );
}