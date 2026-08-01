import type { Metadata } from "next";
import { Suspense } from "react";

import { AnnouncementDialog } from "@/components/admin/notifications/announcement-dialog";
import { NotificationFilters } from "@/components/admin/notifications/notification-filters";
import {
  NotificationList,
  NotificationListSkeleton,
} from "@/components/admin/notifications/notification-list";
import { requireAdmin } from "@/lib/admin/auth";
import { fetchAdminDirectory } from "@/lib/admin/leads";
import {
  ensureDueNotifications,
  fetchNotifications,
  fetchUnreadCount,
  parseNotificationListParams,
  type NotificationListParams,
} from "@/lib/admin/notifications";

/**
 * Kinetra CRM — /admin/notifications (Phase 8).
 *
 * The full notification center behind the bell: inbox/archived views, type +
 * read filters, debounced search, cursor-based "load more", undoable delete,
 * and the manual announcement composer. Same architecture as the Phase 3
 * leads list — all filter state in the URL, the list section streamed
 * through a params-keyed Suspense boundary.
 */

export const metadata: Metadata = {
  title: "Notifications",
};

interface NotificationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function NotificationListSection({
  adminId,
  params,
}: {
  adminId: string;
  params: NotificationListParams;
}) {
  // Materialize task_due / task_overdue rows first (idempotent RPC), so the
  // list the admin is about to read is complete.
  await ensureDueNotifications();

  const page = await fetchNotifications(adminId, params);

  return (
    <NotificationList
      initialItems={page.items}
      initialCursor={page.nextCursor}
      initialHasMore={page.hasMore}
      view={params.view}
      type={params.type}
      read={params.read}
      q={params.q}
      limit={params.limit}
    />
  );
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  const { profile } = await requireAdmin();

  const params = parseNotificationListParams(await searchParams);

  const [unreadCount, directory] = await Promise.all([
    fetchUnreadCount(profile.id),
    fetchAdminDirectory(),
  ]);

  const adminOptions = [...directory.values()]
    .map((entry) => ({ id: entry.id, label: entry.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            Notifications
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Notification center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread — new leads, status changes, emails, and due tasks.`
              : "You're all caught up — new activity lands here as it happens."}
          </p>
        </div>
        <AnnouncementDialog admins={adminOptions} />
      </div>

      <NotificationFilters
        view={params.view}
        type={params.type}
        read={params.read}
        q={params.q}
        hasUnread={unreadCount > 0}
      />

      <Suspense
        key={JSON.stringify(params)}
        fallback={<NotificationListSkeleton />}
      >
        <NotificationListSection adminId={profile.id} params={params} />
      </Suspense>
    </div>
  );
}