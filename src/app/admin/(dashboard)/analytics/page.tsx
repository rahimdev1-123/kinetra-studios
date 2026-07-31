import type { Metadata } from "next";
import { format } from "date-fns";

import { ActivityHeatmap } from "@/components/admin/analytics/activity-heatmap";
import {
  ConversionFunnelChart,
  LeadSourcesChart,
  LeadTrendChart,
  RevenueByStageChart,
  StatusDistributionChart,
} from "@/components/admin/analytics/analytics-charts";
import { AnalyticsFilters } from "@/components/admin/analytics/analytics-filters";
import { KpiCards } from "@/components/admin/analytics/kpi-cards";
import { RealtimeRefresher } from "@/components/admin/analytics/realtime-refresher";
import { RecentActivity } from "@/components/admin/analytics/recent-activity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import {
  fetchAnalyticsBreakdowns,
  fetchAnalyticsHeatmap,
  fetchAnalyticsSummary,
  fetchAnalyticsTrend,
  fetchLeadSources,
  fetchRecentActivity,
  parseAnalyticsParams,
  previousWindow,
} from "@/lib/admin/analytics";

/**
 * Kinetra CRM — /admin/analytics (Phase 6).
 *
 * Server component: every metric is aggregated in PostgreSQL (migration-7
 * RPCs) and fetched here in parallel; Recharts renders client-side from the
 * pre-computed data. The RealtimeRefresher re-runs this page's aggregations
 * automatically when leads change.
 */

export const metadata: Metadata = {
  title: "Analytics",
};

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  await requireAdmin();

  const params = parseAnalyticsParams(await searchParams);
  const prev = previousWindow(params);

  const [
    summary,
    previousSummary,
    breakdowns,
    trend,
    heatmap,
    recentActivity,
    sources,
  ] = await Promise.all([
    fetchAnalyticsSummary(params.fromIso, params.toIso, params.source),
    fetchAnalyticsSummary(prev.fromIso, prev.toIso, params.source),
    fetchAnalyticsBreakdowns(params.fromIso, params.toIso, params.source),
    fetchAnalyticsTrend(
      params.fromIso,
      params.toIso,
      params.source,
      params.bucket,
    ),
    fetchAnalyticsHeatmap(params.fromIso, params.toIso, params.source),
    fetchRecentActivity(),
    fetchLeadSources(),
  ]);

  const windowLabel = `${format(new Date(params.fromIso), "MMM d, yyyy")} – ${format(
    new Date(new Date(params.toIso).getTime() - 1),
    "MMM d, yyyy",
  )}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Business intelligence
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {windowLabel}
            {params.source !== "all" ? ` · source: ${params.source}` : ""} ·
            aggregated in PostgreSQL
          </p>
        </div>
        <RealtimeRefresher />
      </div>

      {/* Filters + export */}
      <AnalyticsFilters
        preset={params.preset}
        customFrom={params.customFrom}
        customTo={params.customTo}
        source={params.source}
        sources={sources}
        fromIso={params.fromIso}
        toIso={params.toIso}
      />

      {/* KPI cards */}
      <KpiCards summary={summary} previous={previousSummary} />

      {/* Trend — full width */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Lead trend
          </CardTitle>
          <CardDescription>
            Leads received vs won per{" "}
            {params.bucket === "day"
              ? "day"
              : params.bucket === "week"
                ? "week"
                : "month"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadTrendChart data={trend} bucket={params.bucket} />
        </CardContent>
      </Card>

      {/* Funnel + revenue pipeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Conversion funnel
            </CardTitle>
            <CardDescription>
              Leads currently at or beyond each pipeline stage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnelChart funnel={breakdowns.funnel} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Revenue pipeline
            </CardTitle>
            <CardDescription>
              Estimated value by stage, from budget-range midpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByStageChart
              revenueByStatus={breakdowns.revenue_by_status}
            />
          </CardContent>
        </Card>
      </div>

      {/* Status + sources donuts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Status distribution
            </CardTitle>
            <CardDescription>
              Current pipeline status of leads received in the period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDistributionChart
              statusCounts={breakdowns.status_counts}
            />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Lead sources
            </CardTitle>
            <CardDescription>
              Where inquiries in this period came from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadSourcesChart sourceCounts={breakdowns.source_counts} />
          </CardContent>
        </Card>
      </div>

      {/* Heatmap + recent activity */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Activity heatmap
            </CardTitle>
            <CardDescription>
              CRM activity by day of week and hour (UTC) in the period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap cells={heatmap} />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Recent activity
            </CardTitle>
            <CardDescription>
              Latest events across all leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity items={recentActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}