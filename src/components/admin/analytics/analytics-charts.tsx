"use client";

import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AnalyticsBreakdowns,
  TrendBucket,
  TrendPoint,
} from "@/lib/admin/analytics";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/types/crm";

/**
 * Kinetra CRM — Recharts visualizations (Phase 6).
 *
 * Client components (Recharts renders in the browser); all DATA arrives
 * pre-aggregated from the server RPCs. Palette echoes the Kinetra admin
 * tokens (amber primary, teal-dark canvas) without touching globals.css.
 */

const COLORS = {
  amber: "#D4A24E",
  sky: "#38bdf8",
  violet: "#a78bfa",
  emerald: "#34d399",
  red: "#C1443B",
  slate: "#6B6B66",
} as const;

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: COLORS.amber,
  contacted: COLORS.sky,
  qualified: COLORS.violet,
  proposal: "#fbbf24",
  won: COLORS.emerald,
  lost: COLORS.red,
};

const SOURCE_PALETTE = [
  COLORS.amber,
  COLORS.sky,
  COLORS.emerald,
  COLORS.violet,
  "#fbbf24",
  COLORS.slate,
];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#141418",
  border: "1px solid rgba(237, 231, 221, 0.10)",
  borderRadius: 8,
  color: "#EDE7DD",
  fontSize: 12,
};

const AXIS_TICK = { fill: "#6B6B66", fontSize: 11 } as const;
const GRID_STROKE = "rgba(237, 231, 221, 0.06)";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/* ─────────────────────────────── Trend ─────────────────────────────────── */

interface LeadTrendChartProps {
  data: TrendPoint[];
  bucket: TrendBucket;
}

export function LeadTrendChart({ data, bucket }: LeadTrendChartProps) {
  const points = data.map((p) => ({
    ...p,
    label: format(
      new Date(p.bucketStart),
      bucket === "month" ? "MMM yyyy" : "MMM d",
    ),
  }));

  return (
    <div
      className="h-[280px] w-full"
      role="img"
      aria-label="Lead volume trend over the selected period"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -16 }}>
          <defs>
            <linearGradient id="kinetraLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="kinetraWon" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.3} />
              <stop
                offset="100%"
                stopColor={COLORS.emerald}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={48}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: GRID_STROKE }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="leadCount"
            name="Leads received"
            stroke={COLORS.amber}
            strokeWidth={2}
            fill="url(#kinetraLeads)"
          />
          <Area
            type="monotone"
            dataKey="wonCount"
            name="Won"
            stroke={COLORS.emerald}
            strokeWidth={2}
            fill="url(#kinetraWon)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────── Funnel ────────────────────────────────── */

interface ConversionFunnelChartProps {
  funnel: AnalyticsBreakdowns["funnel"];
}

export function ConversionFunnelChart({ funnel }: ConversionFunnelChartProps) {
  const top = funnel.new || 1;

  const data = (
    ["new", "contacted", "qualified", "proposal", "won"] as const
  ).map((stage) => ({
    stage: LEAD_STATUS_LABELS[stage],
    count: funnel[stage],
    pct: Math.round((funnel[stage] / top) * 100),
    fill: STATUS_COLORS[stage],
  }));

  return (
    <div
      className="h-[280px] w-full"
      role="img"
      aria-label="Lead conversion funnel by pipeline stage"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8 }}
        >
          <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="stage"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(237, 231, 221, 0.04)" }}
            formatter={(value: number, _name, entry) => [
              `${value} (${(entry?.payload as { pct: number }).pct}% of top)`,
              "Leads",
            ]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fill: "#EDE7DD", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────────────── Revenue pipeline by stage ──────────────────────── */

interface RevenueByStageChartProps {
  revenueByStatus: Record<string, number>;
}

export function RevenueByStageChart({
  revenueByStatus,
}: RevenueByStageChartProps) {
  const data = LEAD_STATUSES.map((status) => ({
    stage: LEAD_STATUS_LABELS[status],
    value: revenueByStatus[status] ?? 0,
    fill: STATUS_COLORS[status],
  }));

  return (
    <div
      className="h-[280px] w-full"
      role="img"
      aria-label="Estimated pipeline value by pipeline stage"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="stage"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => usd.format(v)}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: "rgba(237, 231, 221, 0.04)" }}
            formatter={(value: number) => [usd.format(value), "Est. value"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───────────────────────────── Donut charts ────────────────────────────── */

function Donut({
  data,
  ariaLabel,
}: {
  data: { name: string; value: number; fill: string }[];
  ariaLabel: string;
}) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No data in this period.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="#141418"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StatusDistributionChartProps {
  statusCounts: Record<string, number>;
}

export function StatusDistributionChart({
  statusCounts,
}: StatusDistributionChartProps) {
  const data = LEAD_STATUSES.map((status) => ({
    name: LEAD_STATUS_LABELS[status],
    value: statusCounts[status] ?? 0,
    fill: STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  return (
    <Donut data={data} ariaLabel="Lead status distribution" />
  );
}

interface LeadSourcesChartProps {
  sourceCounts: Record<string, number>;
}

export function LeadSourcesChart({ sourceCounts }: LeadSourcesChartProps) {
  const data = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, value], i) => ({
      name:
        source === "website"
          ? "Website form"
          : source.charAt(0).toUpperCase() + source.slice(1),
      value,
      fill: SOURCE_PALETTE[i % SOURCE_PALETTE.length],
    }));

  return <Donut data={data} ariaLabel="Lead sources distribution" />; 
} 