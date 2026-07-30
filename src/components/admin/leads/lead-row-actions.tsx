"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Eye, MoreHorizontal } from "lucide-react";

import {
  archiveLeadAction,
  restoreLeadAction,
} from "@/app/admin/(dashboard)/leads/actions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — per-row lead actions (Phase 3).
 *
 * View → /admin/leads/[id] (the Lead Details surface that Phase 4 expands).
 * Archive is confirm-gated; Restore is immediate. Both call server actions
 * that revalidate the list, so the table refreshes without a manual reload.
 */

interface LeadRowActionsProps {
  leadId: string;
  leadName: string;
  isArchived: boolean;
}

export function LeadRowActions({
  leadId,
  leadName,
  isArchived,
}: LeadRowActionsProps) {
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Actions for ${leadName}`}
            disabled={isPending}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Lead actions
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/admin/leads/${leadId}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem onSelect={runRestore}>
              <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              {leadName} will be hidden from the active list. Nothing is
              deleted — you can restore it anytime from the
              &ldquo;Archived&rdquo; view.
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