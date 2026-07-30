"use client";

import { FilterX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/types/crm";
import { useLeadsUrl } from "./use-leads-url";

/**
 * Kinetra CRM — leads filter + sort toolbar (Phase 3).
 *
 * Pure URL-state controls: status, service, budget, archive state, date
 * range, and sort. Service/budget options are derived server-side from the
 * actual data and passed down, so the menus never drift from reality.
 */

interface LeadFiltersProps {
  status: string;
  service: string;
  budget: string;
  archived: string;
  from: string;
  to: string;
  sort: string;
  services: string[];
  budgets: string[];
  hasActiveFilters: boolean;
}

const ARCHIVE_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "Active + archived" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
] as const;

export function LeadFilters({
  status,
  service,
  budget,
  archived,
  from,
  to,
  sort,
  services,
  budgets,
  hasActiveFilters,
}: LeadFiltersProps) {
  const { update } = useLeadsUrl();

  return (
    <div className="flex flex-wrap items-end gap-2">
      {/* Status */}
      <Select
        value={status}
        onValueChange={(v) => update({ status: v === "all" ? null : v })}
      >
        <SelectTrigger
          className="h-9 w-[140px]"
          aria-label="Filter by status"
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Service */}
      <Select
        value={service}
        onValueChange={(v) => update({ service: v === "all" ? null : v })}
      >
        <SelectTrigger
          className="h-9 w-[160px]"
          aria-label="Filter by service requested"
        >
          <SelectValue placeholder="Service" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All services</SelectItem>
          {services.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Budget */}
      <Select
        value={budget}
        onValueChange={(v) => update({ budget: v === "all" ? null : v })}
      >
        <SelectTrigger
          className="h-9 w-[140px]"
          aria-label="Filter by budget"
        >
          <SelectValue placeholder="Budget" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All budgets</SelectItem>
          {budgets.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Archive state */}
      <Select
        value={archived}
        onValueChange={(v) => update({ archived: v === "active" ? null : v })}
      >
        <SelectTrigger
          className="h-9 w-[150px]"
          aria-label="Filter by archive state"
        >
          <SelectValue placeholder="Active" />
        </SelectTrigger>
        <SelectContent>
          {ARCHIVE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="leads-from"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            From
          </Label>
          <Input
            id="leads-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => update({ from: e.target.value || null })}
            className="h-9 w-[140px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="leads-to"
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
          >
            To
          </Label>
          <Input
            id="leads-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => update({ to: e.target.value || null })}
            className="h-9 w-[140px]"
          />
        </div>
      </div>

      {/* Sort */}
      <Select
        value={sort}
        onValueChange={(v) => update({ sort: v === "newest" ? null : v })}
      >
        <SelectTrigger className="h-9 w-[140px]" aria-label="Sort leads">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() =>
            update({
              q: null,
              status: null,
              service: null,
              budget: null,
              archived: null,
              from: null,
              to: null,
            })
          }
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}