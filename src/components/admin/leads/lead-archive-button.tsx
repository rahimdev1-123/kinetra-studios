"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import {
  archiveLeadAction,
  restoreLeadAction,
} from "@/app/admin/(dashboard)/leads/[id]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — archive / restore control for the lead detail page (Phase 4).
 *
 * Reuses the exact Phase 3 server actions (archiveLeadAction /
 * restoreLeadAction), so list and detail behave identically. Archived is a
 * state flag (archived_at) alongside the pipeline status — not a status
 * value — which keeps the Phase 3 list filters working unchanged.
 */

interface LeadArchiveButtonProps {
  leadId: string;
  leadName: string;
  isArchived: boolean;
}

export function LeadArchiveButton({
  leadId,
  leadName,
  isArchived,
}: LeadArchiveButtonProps) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function runArchive() {
    startTransition(async () => {
      const result = await archiveLeadAction(leadId);
      if (result.ok) {
        toast({
          title: "Lead archived",
          description: `${leadName} was moved to the archive.`,
        });
      } else {
        toast({
          title: "Couldn't archive lead",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function runRestore() {
    startTransition(async () => {
      const result = await restoreLeadAction(leadId);
      if (result.ok) {
        toast({
          title: "Lead restored",
          description: `${leadName} is active again.`,
        });
      } else {
        toast({
          title: "Couldn't restore lead",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  if (isArchived) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={runRestore}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
        )}
        Restore lead
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Archive className="h-4 w-4" aria-hidden="true" />
        )}
        Archive lead
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {leadName} will be hidden from the active list. Nothing is
              deleted — you can restore it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runArchive} disabled={isPending}>
              Archive lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}