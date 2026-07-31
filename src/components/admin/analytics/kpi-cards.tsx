import {
  Clapperboard,
  DollarSign,
  Percent,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/lib/admin/analytics";

/**
 * Kinetra CRM — analytics KPI cards (Phase 6).
 *
 * Server component. Shows the four headline metrics with deltas against the
 * previous window of equal length. Revenue figures are estimates derived
 * from budget-range midpoints (see kinetra_budget_value in migration 7) —
 * labeled as such to stay honest.
 */

interface KpiCardsProps {
  summary: AnalyticsSummary;
  previous: AnalyticsSummary;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatHours(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

interface DeltaProps {
  current: number;
  previous: number;
  /** For metrics where a decrease is an improvement (response time). */
  lowerIsBetter?: boolean;
}

function Delta({ current, previous, lowerIsBetter = false }: DeltaProps) {
  if (previous <= 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        No prior-period data
      </p>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);

  if (rounded === 0) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Flat vs prior period
      </p>
    );
  }

  const isGood = lowerIsBetter ? rounded < 0 : rounded > 0;
  const Icon = rounded > 0 ? TrendingUp : TrendingDown;

  return (
    <p
      className={cn(
        "flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
        isGood ? "text-emerald-400" : "text-destructive",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {rounded > 0 ? "+" : ""}
      {rounded}% vs prior period
    </p>
  );
}

export function KpiCards({ summary, previous }: KpiCardsProps) {
  const cards = [
    {
      key: "revenue",
      label: "Est. revenue (won)",
      icon: DollarSign,
      value: usd.format(summary.est_revenue_won),
      sub: `Pipeline: ${usd.format(summary.est_pipeline_value)} open · from budget ranges`,
      delta: (
        <Delta
          current={summary.est_revenue_won}
          previous={previous.est_revenue_won}
        />
      ),
    },
    {
      key: "conversion",
      label: "Conversion rate",
      icon: Percent,
      value: `${summary.conversion_rate}%`,
      sub: `${summary.won_leads} won of ${summary.total_leads} leads received`,
      delta: (
        <Delta
          current={summary.conversion_rate}
          previous={previous.conversion_rate}
        />
      ),
    },
    {
      key: "projects",
      label: "Active projects",
      icon: Clapperboard,
      value: String(summary.active_projects),
      sub: "Won leads currently in production (not archived)",
      delta: (
        <Delta
          current={summary.active_projects}
          previous={previous.active_projects}
        />
      ),
    },
    {
      key: "response",
      label: "Avg response time",
      icon: Timer,
      value: formatHours(summary.avg_response_hours),
      sub:
        summary.avg_conversion_days > 0
          ? `Time to win: ${summary.avg_conversion_days}d avg`
          : "First admin touch after a lead arrives",
      delta: (
        <Delta
          current={summary.avg_response_hours}
          previous={previous.avg_response_hours}
          lowerIsBetter
        />
      ),
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {card.label}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {card.delta}
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}