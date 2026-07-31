import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  LeadSourcesChart,
  LeadTrendChart,
  RevenueSparkline,
} from "@/components/admin/analytics/analytics-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchAnalyticsBreakdowns,
  fetchAnalyticsTrend,
} from "@/lib/admin/analytics";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/types/crm";

/**
 * Kinetra CRM — dashboard mini analytics (Phase 7).
 *
 * Async server components (Suspense-streamed). Data comes from the EXISTING
 * Phase 6 fetchers/RPCs and renders through the EXISTING Recharts components
 * (via their new heightClass prop) — zero duplicated chart or SQL logic.
 * Fixed 30-day window; the full Analytics page handles deep dives.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function last30Days(): { fromIso: string; toIso: string } {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return {
    fromIso: new Date(end.getTime() - 30 * DAY_MS).toISOString(),
    toIso: end.toISOString(),
  };
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export async function MiniAnalytics() {
  const { fromIso, toIso } = last30Days();

  const [trend, breakdowns] = await Promise.all([
    fetchAnalyticsTrend(fromIso, toIso, "all", "day"),
    fetchAnalyticsBreakdowns(fromIso, toIso, "all"),
  ]);

  const revenue30d = trend.reduce((sum, p) => sum + p.wonValue, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border bg-card md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Lead trend · 30d
              </CardTitle>
              <CardDescription>Received vs won per day.</CardDescription>
            </div>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
            >
              Full analytics
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <LeadTrendChart data={trend} bucket="day" heightClass="h-[180px]" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Revenue · 30d
          </CardTitle>
          <CardDescription className="text-2xl font-semibold tabular-nums text-foreground">
            {usd.format(revenue30d)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueSparkline data={trend} heightClass="h-[132px]" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Sources · 30d
          </CardTitle>
          <CardDescription>Where inquiries came from.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeadSourcesChart
            sourceCounts={breakdowns.source_counts}
            heightClass="h-[180px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────── Conversion funnel summary ─────────────────────── */

const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
] as const satisfies readonly LeadStatus[];

/**
 * Compact textual funnel (30d): stage counts with proportional bars — the
 * chart-free summary variant for the widget column.
 */
export async function FunnelSummaryCard() {
  const { fromIso, toIso } = last30Days();
  const breakdowns = await fetchAnalyticsBreakdowns(fromIso, toIso, "all");
  const funnel = breakdowns.funnel;
  const top = funnel.new || 1;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Funnel · 30d
        </CardTitle>
        <CardDescription>
          Leads at or beyond each stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {FUNNEL_STAGES.map((stage) => {
          const count = funnel[stage];
          const pct = Math.round((count / top) * 100);
          return (
            <div key={stage} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {LEAD_STATUS_LABELS[stage]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
                {count}
              </span>
            </div>
          );
        })}
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {funnel.new > 0
            ? `${Math.round((funnel.won / (funnel.new || 1)) * 100)}% of new leads reach won`
            : "No leads in this period"}
        </p>
      </CardContent>
    </Card>
  );
}