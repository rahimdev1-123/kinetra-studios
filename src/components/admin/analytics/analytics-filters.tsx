"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Download, Loader2 } from "lucide-react";

import { exportAnalyticsCsvAction } from "@/app/admin/(dashboard)/analytics/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLeadsUrl } from "@/components/admin/leads/use-leads-url";

/**
 * Kinetra CRM — analytics toolbar (Phase 6).
 *
 * URL-state controls (same pattern as the Phase 3 leads toolbar, reusing the
 * existing useLeadsUrl hook — no duplication): range preset Select, custom
 * date-range picker (Shadcn Calendar in a Popover), source Select, and the
 * CSV export button, which calls a server action and saves the result as a
 * file via a Blob.
 */

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
] as const;

interface AnalyticsFiltersProps {
  preset: string;
  customFrom: string;
  customTo: string;
  source: string;
  sources: string[];
  /** Resolved window (ISO) — used by the export action. */
  fromIso: string;
  toIso: string;
}

export function AnalyticsFilters({
  preset,
  customFrom,
  customTo,
  source,
  sources,
  fromIso,
  toIso,
}: AnalyticsFiltersProps) {
  const { update } = useLeadsUrl();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    customFrom && customTo
      ? {
          from: new Date(`${customFrom}T00:00:00`),
          to: new Date(`${customTo}T00:00:00`),
        }
      : undefined,
  );
  const [isExporting, startExport] = useTransition();

  function handlePreset(value: string) {
    if (value === "custom") {
      setPickerOpen(true);
      return;
    }
    update({ range: value === "30d" ? null : value, from: null, to: null });
  }

  function applyDraftRange(range: DateRange | undefined) {
    setDraftRange(range);
    if (range?.from && range?.to) {
      update({
        range: "custom",
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
      });
      setPickerOpen(false);
    }
  }

  function handleExport() {
    startExport(async () => {
      const result = await exportAnalyticsCsvAction({
        fromIso,
        toIso,
        source,
      });

      if (!result.ok) {
        toast({
          title: "Export failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
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
        description: `${result.rowCount} lead${result.rowCount === 1 ? "" : "s"} exported to ${result.filename}.`,
      });
    });
  }

  const customLabel =
    customFrom && customTo ? `${customFrom} → ${customTo}` : "Pick dates";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Range preset */}
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger
          className="h-9 w-[160px]"
          aria-label="Select date range preset"
        >
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom range picker */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={
              preset === "custom"
                ? "h-9 gap-2"
                : "h-9 gap-2 text-muted-foreground"
            }
            aria-label="Pick a custom date range"
          >
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            {preset === "custom" ? customLabel : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draftRange}
            onSelect={applyDraftRange}
            disabled={{ after: new Date() }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {/* Source filter */}
      <Select
        value={source}
        onValueChange={(v) => update({ source: v === "all" ? null : v })}
      >
        <SelectTrigger
          className="h-9 w-[160px]"
          aria-label="Filter by lead source"
        >
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "website"
                ? "Website form"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-2"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          Export CSV
        </Button>
      </div>
    </div>
  );
}