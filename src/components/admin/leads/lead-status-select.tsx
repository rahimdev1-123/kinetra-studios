"use client";

import { useOptimistic, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { updateLeadStatusAction } from "@/app/admin/(dashboard)/leads/[id]/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  isLeadStatus,
  toLeadStatus,
} from "@/types/crm";
import { LeadStatusBadge } from "./lead-status-badge";

/**
 * Kinetra CRM — status workflow control (Phase 4).
 *
 * React 19 useOptimistic: the badge and select flip instantly on change;
 * if the server action fails, React reverts to the source-of-truth status
 * automatically when the transition settles, and a toast explains why.
 * The exact change time is stamped in the DB by the BEFORE UPDATE trigger.
 */

interface LeadStatusSelectProps {
  leadId: string;
  status: string;
  disabled?: boolean;
}

export function LeadStatusSelect({
  leadId,
  status,
  disabled = false,
}: LeadStatusSelectProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    toLeadStatus(status),
  );

  function handleChange(next: string) {
    if (!isLeadStatus(next) || next === optimisticStatus) {
      return;
    }

    startTransition(async () => {
      setOptimisticStatus(next);

      const result = await updateLeadStatusAction(leadId, next);

      if (result.ok) {
        toast({
          title: "Status updated",
          description: `Lead moved to “${LEAD_STATUS_LABELS[next]}”.`,
        });
      } else {
        // The optimistic value reverts automatically when this transition
        // ends, because the underlying `status` prop is unchanged.
        toast({
          title: "Couldn't update status",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <LeadStatusBadge status={optimisticStatus} />

      <Select
        value={optimisticStatus}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn("h-9 w-[180px]", isPending && "opacity-80")}
          aria-label="Change lead status"
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending ? (
        <Loader2
          className="h-4 w-4 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}   