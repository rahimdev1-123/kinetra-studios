import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  toLeadStatus,
  type LeadStatus,
} from "@/types/crm";

/**
 * Kinetra CRM — lead status badge (Phase 3).
 *
 * Server-safe (no client hooks). Unknown/legacy status values fall back to
 * "New" via toLeadStatus, so historical data can never crash the table.
 */

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "border-primary/40 bg-primary/10 text-primary",
  contacted: "border-sky-400/40 bg-sky-400/10 text-sky-400",
  qualified: "border-violet-400/40 bg-violet-400/10 text-violet-400",
  proposal: "border-amber-300/40 bg-amber-300/10 text-amber-300",
  won: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  lost: "border-destructive/40 bg-destructive/10 text-destructive",
};

interface LeadStatusBadgeProps {
  status: string;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const normalized = toLeadStatus(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        STATUS_CLASSES[normalized],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[normalized]}
    </Badge>
  );
}