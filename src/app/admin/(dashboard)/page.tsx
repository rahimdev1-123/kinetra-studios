import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { Clapperboard, Inbox, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Kinetra CRM — /admin landing (Phase 1 placeholder).
 *
 * Proves the full stack end-to-end (auth → allowlist → typed DB reads).
 * Phase 2 replaces the placeholder area with the real dashboard
 * (KPIs, Recharts, business insights).
 */

export const metadata: Metadata = {
  title: "Dashboard",
};

interface LeadSnapshot {
  ok: boolean;
  total: number;
  lastSevenDays: number;
  latestAt: string | null;
}

async function getLeadSnapshot(): Promise<LeadSnapshot> {
  try {
    const admin = createSupabaseAdminClient();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [totalRes, weekRes, latestRes] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      admin
        .from("leads")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (totalRes.error || weekRes.error || latestRes.error) {
      throw totalRes.error ?? weekRes.error ?? latestRes.error;
    }

    return {
      ok: true,
      total: totalRes.count ?? 0,
      lastSevenDays: weekRes.count ?? 0,
      latestAt: latestRes.data?.created_at ?? null,
    };
  } catch (error) {
    console.error("[admin/dashboard] lead snapshot failed:", error);
    return { ok: false, total: 0, lastSevenDays: 0, latestAt: null };
  }
}

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const snapshot = await getLeadSnapshot();

  const firstName =
    profile.display_name?.split(" ")[0] ?? profile.email.split("@")[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a quick pulse on incoming leads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Inbox className="h-4 w-4" aria-hidden="true" />
              Total leads
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {snapshot.ok ? snapshot.total : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Every inquiry captured by the contact form.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              New this week
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {snapshot.ok ? snapshot.lastSevenDays : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Leads received in the last 7 days.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
              Latest lead
            </CardDescription>
            <CardTitle className="text-lg">
              {snapshot.ok && snapshot.latestAt
                ? formatDistanceToNow(new Date(snapshot.latestAt), {
                    addSuffix: true,
                  })
                : "No leads yet"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {snapshot.ok
                ? "Time since the most recent inquiry landed."
                : "Couldn't reach the database — check env vars & migrations."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-border bg-card/50">
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
            00:02 — Up next
          </CardTitle>
          <CardDescription>
            Phase 2 turns this page into the full dashboard: KPI trends,
            Recharts visualizations, lead-source breakdowns, and business
            insights. Leads, Analytics, Notifications, and Settings unlock in
            the phases after that.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}