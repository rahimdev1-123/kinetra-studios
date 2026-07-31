"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { assignLeadAction } from "@/app/admin/(dashboard)/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

/**
 * Kinetra CRM — lead assignment control (Phase 7).
 *
 * Lives in the detail page's Status workflow card. Assigns the lead to an
 * admin (leads.assigned_to, migration 8), powering the dashboard's
 * "My Leads" widget.
 */

const UNASSIGNED = "unassigned";

export interface AdminOption {
  id: string;
  label: string;
}

interface LeadAssignSelectProps {
  leadId: string;
  assignedTo: string | null;
  admins: AdminOption[];
}

export function LeadAssignSelect({
  leadId,
  assignedTo,
  admins,
}: LeadAssignSelectProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const adminId = value === UNASSIGNED ? null : value;

    startTransition(async () => {
      const result = await assignLeadAction({ leadId, adminId });

      if (result.ok) {
        const label =
          adminId === null
            ? "Lead unassigned."
            : `Assigned to ${admins.find((a) => a.id === adminId)?.label ?? "admin"}.`;
        toast({ title: "Assignment updated", description: label });
      } else {
        toast({
          title: "Couldn't update assignment",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={assignedTo ?? UNASSIGNED}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger
          className="h-9 w-[220px]"
          aria-label="Assign this lead to an admin"
        >
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {admins.map((admin) => (
            <SelectItem key={admin.id} value={admin.id}>
              {admin.label}
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