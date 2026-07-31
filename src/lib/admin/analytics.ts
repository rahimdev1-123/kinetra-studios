import "server-only";

import { cache } from "react";
import { z } from "zod";

import { fetchAdminDirectory } from "@/lib/admin/leads";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Kinetra CRM — Analytics data layer (Phase 6).
 *
 * All metrics are aggregated inside PostgreSQL via the migration-7 RPC
 * functions (kinetra_analytics_*) — no raw-row fetching + JS math. Every
 * fetcher assumes the caller was authorized via requireAdmin() and runs on
 * the service-role client, matching the Phase 3–5 data-layer pattern.
 */

/* ────────────────────────────── URL params ─────────────────────────────── */

export const ANALYTICS_RANGE_PRESETS = [
  "7d",
  "30d",
  "90d",
  "12m",
  "custom",
] as const;

export type AnalyticsRangePreset = (typeof ANALYTICS_RANGE_PRESETS)[number];

export type TrendBucket = "day" | "week" | "month";

export interface AnalyticsParams {
  preset: AnalyticsRangePreset;
  /** Resolved inclusive range start (ISO). */
  fromIso: string;
  /** Resolved exclusive range end (ISO). */
  toIso: string;
  /** yyyy-mm-dd values for the custom picker UI ("" unless preset=custom). */
  customFrom: string;
  customTo: string;
  source: string | "all";
  bucket: TrendBucket;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse searchParams into a resolved, clamped analytics window. */
export function parseAnalyticsParams(
  searchParams: Record<string, string | string[] | undefined>,
): AnalyticsParams {
  const rawRange = first(searchParams.range);
  const rawFrom = first(searchParams.from) ?? "";
  const rawTo = first(searchParams.to) ?? "";
  const rawSource = first(searchParams.source)?.trim() ?? "";

  const preset: AnalyticsRangePreset = (
    ANALYTICS_RANGE_PRESETS as readonly string[]
  ).includes(rawRange ?? "")
    ? (rawRange as AnalyticsRangePreset)
    : "30d";

  // End of today (exclusive upper bound = start of tomorrow, UTC).
  const now = new Date();
  const endExclusive = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ),
  );

  let from: Date;
  let to: Date = endExclusive;
  let customFrom = "";
  let customTo = "";

  if (preset === "custom" && DATE_RE.test(rawFrom) && DATE_RE.test(rawTo)) {
    const f = new Date(`${rawFrom}T00:00:00.000Z`);
    const t = new Date(`${rawTo}T00:00:00.000Z`);
    if (f.getTime() <= t.getTime()) {
      from = f;
      to = new Date(t.getTime() + DAY_MS); // inclusive end day
      customFrom = rawFrom;
      customTo = rawTo;
    } else {
      from = new Date(endExclusive.getTime() - 30 * DAY_MS);
    }
  } else if (preset === "7d") {
    from = new Date(endExclusive.getTime() - 7 * DAY_MS);
  } else if (preset === "90d") {
    from = new Date(endExclusive.getTime() - 90 * DAY_MS);
  } else if (preset === "12m") {
    from = new Date(endExclusive.getTime() - 365 * DAY_MS);
  } else {
    from = new Date(endExclusive.getTime() - 30 * DAY_MS);
  }

  const rangeDays = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / DAY_MS),
  );

  const bucket: TrendBucket =
    rangeDays <= 31 ? "day" : rangeDays <= 180 ? "week" : "month";

  return {
    preset,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    customFrom,
    customTo,
    source: rawSource && rawSource !== "all" ? rawSource.slice(0, 100) : "all",
    bucket,
  };
}

/** The window immediately before [from, to) with the same length. */
export function previousWindow(params: AnalyticsParams): {
  fromIso: string;
  toIso: string;
} {
  const from = new Date(params.fromIso).getTime();
  const to = new Date(params.toIso).getTime();
  const span = Math.max(to - from, DAY_MS);
  return {
    fromIso: new Date(from - span).toISOString(),
    toIso: params.fromIso,
  };
}

/* ─────────────────────────────── Summary ───────────────────────────────── */

const summarySchema = z.object({
  total_leads: z.number(),
  won_leads: z.number(),
  lost_leads: z.number(),
  active_projects: z.number(),
  conversion_rate: z.number(),
  est_revenue_won: z.number(),
  est_pipeline_value: z.number(),
  avg_response_hours: z.number(),
  avg_conversion_days: z.number(),
});

export type AnalyticsSummary = z.infer<typeof summarySchema>;

function rpcSource(source: string | "all"): string | null {
  return source === "all" ? null : source;
}

export async function fetchAnalyticsSummary(
  fromIso: string,
  toIso: string,
  source: string | "all",
): Promise<AnalyticsSummary> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("kinetra_analytics_summary", {
    p_from: fromIso,
    p_to: toIso,
    p_source: rpcSource(source),
  });

  if (error) {
    throw new Error(`Failed to load analytics summary: ${error.message}`);
  }

  return summarySchema.parse(data);
}

/* ────────────────────────────── Breakdowns ─────────────────────────────── */

const breakdownsSchema = z.object({
  status_counts: z.record(z.string(), z.number()),
  source_counts: z.record(z.string(), z.number()),
  revenue_by_status: z.record(z.string(), z.number()),
  funnel: z.object({
    new: z.number(),
    contacted: z.number(),
    qualified: z.number(),
    proposal: z.number(),
    won: z.number(),
  }),
});

export type AnalyticsBreakdowns = z.infer<typeof breakdownsSchema>;

export async function fetchAnalyticsBreakdowns(
  fromIso: string,
  toIso: string,
  source: string | "all",
): Promise<AnalyticsBreakdowns> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("kinetra_analytics_breakdowns", {
    p_from: fromIso,
    p_to: toIso,
    p_source: rpcSource(source),
  });

  if (error) {
    throw new Error(`Failed to load analytics breakdowns: ${error.message}`);
  }

  return breakdownsSchema.parse(data);
}

/* ──────────────────────────────── Trend ────────────────────────────────── */

export interface TrendPoint {
  bucketStart: string;
  leadCount: number;
  wonCount: number;
}

export async function fetchAnalyticsTrend(
  fromIso: string,
  toIso: string,
  source: string | "all",
  bucket: TrendBucket,
): Promise<TrendPoint[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("kinetra_analytics_trend", {
    p_from: fromIso,
    p_to: toIso,
    p_source: rpcSource(source),
    p_bucket: bucket,
  });

  if (error) {
    throw new Error(`Failed to load lead trend: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    bucketStart: row.bucket_start,
    leadCount: Number(row.lead_count),
    wonCount: Number(row.won_count),
  }));
}

/* ─────────────────────────────── Heatmap ───────────────────────────────── */

export interface HeatmapCell {
  dow: number;
  hour: number;
  count: number;
}

export async function fetchAnalyticsHeatmap(
  fromIso: string,
  toIso: string,
  source: string | "all",
): Promise<HeatmapCell[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("kinetra_analytics_heatmap", {
    p_from: fromIso,
    p_to: toIso,
    p_source: rpcSource(source),
  });

  if (error) {
    throw new Error(`Failed to load activity heatmap: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    dow: row.dow,
    hour: row.hour,
    count: Number(row.activity_count),
  }));
}

/* ─────────────────────────── Recent activity ───────────────────────────── */

export interface RecentActivityItem {
  id: string;
  type: string;
  leadId: string;
  leadName: string;
  actorLabel: string | null;
  createdAt: string;
}

const RECENT_ACTIVITY_LIMIT = 12;

/** Latest activity across ALL leads, with lead + actor labels resolved. */
export async function fetchRecentActivity(): Promise<RecentActivityItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: activities, error } = await admin
    .from("lead_activities")
    .select("id, lead_id, actor_id, type, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_ACTIVITY_LIMIT);

  if (error) {
    throw new Error(`Failed to load recent activity: ${error.message}`);
  }

  const rows = activities ?? [];
  if (rows.length === 0) return [];

  const leadIds = [...new Set(rows.map((r) => r.lead_id))];

  const [{ data: leads, error: leadsError }, directory] = await Promise.all([
    admin.from("leads").select("id, name").in("id", leadIds),
    fetchAdminDirectory(),
  ]);

  if (leadsError) {
    throw new Error(`Failed to resolve lead names: ${leadsError.message}`);
  }

  const nameById = new Map((leads ?? []).map((l) => [l.id, l.name]));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    leadId: row.lead_id,
    leadName: nameById.get(row.lead_id) ?? "Unknown lead",
    actorLabel: row.actor_id
      ? (directory.get(row.actor_id)?.label ?? "Former admin")
      : null,
    createdAt: row.created_at,
  }));
}

/* ─────────────────────────── Source options ────────────────────────────── */

/** Distinct lead sources observed in the data (filter menu options). */
export const fetchLeadSources = cache(async (): Promise<string[]> => {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .select("source")
    .limit(1000);

  if (error) {
    console.error("[admin/analytics] sources fetch failed:", error.message);
    return [];
  }

  const sources = new Set<string>();
  for (const row of data ?? []) {
    if (row.source) sources.add(row.source);
  }

  return [...sources].sort((a, b) => a.localeCompare(b));
});