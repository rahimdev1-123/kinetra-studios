import type { Metadata } from "next";
import { Suspense } from "react";

import { RealtimeRefresher } from "@/components/admin/analytics/realtime-refresher";
import {
  ChartTilesSkeleton,
  KpiGridSkeleton,
  WidgetSkeleton,
} from "@/components/admin/dashboard/dashboard-skeletons";
import { ExecutiveKpis } from "@/components/admin/dashboard/executive-kpis";
import { FollowUpsWidget } from "@/components/admin/dashboard/follow-ups-widget";
import { GlobalSearch } from "@/components/admin/dashboard/global-search";
import { LiveActivityFeed } from "@/components/admin/dashboard/live-activity-feed";
import {
  FunnelSummaryCard,
  MiniAnalytics,
} from "@/components/admin/dashboard/mini-analytics";
import { MyLeadsWidget } from "@/components/admin/dashboard/my-leads-widget";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { TaskCenter } from "@/components/admin/dashboard/task-center";
import { requireAdmin } from "@/lib/admin/auth";
import { fetchRecentLeadOptions } from "@/lib/admin/dashboard";

/**
 * Kinetra CRM — /admin executive dashboard (Phase 7).
 *
 * Replaces the Phase 1 placeholder with the primary daily workspace:
 * executive KPIs, quick actions, mini analytics, task center, follow-ups,
 * my-leads, and the live activity feed. Every widget is an async server
 * component streamed through its own Suspense boundary (lazy-loaded), all
 * data comes from the existing analytics RPCs + the Phase 7 productivity
 * layer, and the RealtimeRefresher re-runs everything when leads or
 * activities change.
 */

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();

  const firstName =
    profile.display_name?.split(" ")[0] ?? profile.email.split("@")[0];

  // Light query for the Compose Email picker; heavy sections stream below.
  const recentLeads = await fetchRecentLeadOptions(20);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your executive view of the whole pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearch />
          <RealtimeRefresher tables={["leads", "lead_activities"]} />
        </div>
      </div>

      {/* Quick actions */}
      <QuickActions recentLeads={recentLeads} />

      {/* Executive KPIs */}
      <Suspense fallback={<KpiGridSkeleton />}>
        <ExecutiveKpis />
      </Suspense>

      {/* Mini analytics */}
      <Suspense fallback={<ChartTilesSkeleton />}>
        <MiniAnalytics />
      </Suspense>

      {/* Productivity widgets */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<WidgetSkeleton rows={8} />}>
          <TaskCenter />
        </Suspense>

        <Suspense fallback={<WidgetSkeleton rows={5} />}>
          <FollowUpsWidget adminId={profile.id} />
        </Suspense>

        <div className="flex flex-col gap-6">
          <Suspense fallback={<WidgetSkeleton rows={4} />}>
            <MyLeadsWidget adminId={profile.id} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton rows={4} />}>
            <FunnelSummaryCard />
          </Suspense>
        </div>
      </div>

      {/* Live activity */}
      <Suspense fallback={<WidgetSkeleton rows={6} />}>
        <LiveActivityFeed />
      </Suspense>
    </div>
  );
}