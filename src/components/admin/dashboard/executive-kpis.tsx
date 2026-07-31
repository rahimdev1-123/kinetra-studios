import {
  CalendarDays,
  CalendarPlus,
  Clapperboard,
  DollarSign,
  Percent,
  PiggyBank,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchExecutiveSummary } from "@/lib/admin/dashboard";

/**
 * Kinetra CRM — executive KPI grid (Phase 7).
 *
 * Async server component (Suspense-streamed from the dashboard). Nine
 * headline metrics computed by the EXISTING kinetra_analytics_summary RPC
 * across four windows (month-to-date / 7 days / today / all-time) — reused,
 * not duplicated. Revenue figures are estimates from budget-range midpoints.
 */

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

export async function ExecutiveKpis() {
  const { month, week, today, allTime } = await fetchExecutiveSummary();

  const cards = [
    {
      key: "revenue-month",
      label: "Revenue this month",
      icon: DollarSign,
      value: usd.format(month.est_revenue_won),
      sub: "Est. from budget ranges · month to date",
    },
    {
      key: "pipeline",
      label: "Open pipeline",
      icon: PiggyBank,
      value: usd.format(allTime.est_pipeline_value),
      sub: "Est. value of all open, unarchived leads",
    },
    {
      key: "won",
      label: "Won deals",
      icon: Trophy,
      value: String(allTime.won_leads),
      sub: `${month.won_leads} won this month`,
    },
    {
      key: "lost",
      label: "Lost deals",
      icon: XCircle,
      value: String(allTime.lost_leads),
      sub: `${month.lost_leads} lost this month`,
    },
    {
      key: "conversion",
      label: "Conversion rate",
      icon: Percent,
      value: `${allTime.conversion_rate}%`,
      sub: `${allTime.won_leads} won of ${allTime.total_leads} all-time leads`,
    },
    {
      key: "response",
      label: "Avg response time",
      icon: Timer,
      value: formatHours(allTime.avg_response_hours),
      sub: "First admin touch after a lead arrives",
    },
    {
      key: "projects",
      label: "Active projects",
      icon: Clapperboard,
      value: String(allTime.active_projects),
      sub: "Won leads currently in production",
    },
    {
      key: "today",
      label: "New leads today",
      icon: CalendarPlus,
      value: String(today.total_leads),
      sub: "Received since midnight UTC",
    },
    {
      key: "week",
      label: "New leads this week",
      icon: CalendarDays,
      value: String(week.total_leads),
      sub: "Received in the last 7 days",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {card.label}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}