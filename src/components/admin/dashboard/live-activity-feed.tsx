import { RecentActivity } from "@/components/admin/analytics/recent-activity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchRecentActivity } from "@/lib/admin/analytics";

/**
 * Kinetra CRM — live activity feed (Phase 7).
 *
 * Async server component. REUSES the Phase 6 fetcher + RecentActivity
 * renderer (lead-linked rows, newest first, covering lead created / status
 * changed / note added / email sent / archived / restored). "Live" comes
 * from the dashboard-level RealtimeRefresher, which re-runs this section on
 * leads AND lead_activities changes (migration 8 publication).
 */

export async function LiveActivityFeed() {
  const items = await fetchRecentActivity();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Live activity
        </CardTitle>
        <CardDescription>
          Newest first, across every lead — refreshes automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RecentActivity items={items} />
      </CardContent>
    </Card>
  );
}