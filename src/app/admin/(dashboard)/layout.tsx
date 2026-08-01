import type { Metadata } from "next";

import { signOutAction } from "@/app/admin/actions";
import { AdminShell, type ShellNotifications } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/auth";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  fetchUnreadCount,
} from "@/lib/admin/notifications";

/**
 * Kinetra CRM — guarded admin layout (Phase 1, extended in Phase 8).
 *
 * Wraps every /admin page except /admin/login (which lives in the (auth)
 * route group). requireAdmin() enforces the DB-backed allowlist on top of
 * the middleware session check — non-admins never see this shell.
 *
 * Phase 8: also loads the notification bell's data (unread count, recent
 * inbox items, realtime preference) in parallel. This block degrades
 * gracefully — if migration 9 hasn't run yet, the shell renders with an
 * empty bell instead of crashing the whole admin panel.
 */

export const metadata: Metadata = {
  title: {
    default: "Dashboard · Kinetra Admin",
    template: "%s · Kinetra Admin",
  },
  robots: { index: false, follow: false },
};

const BELL_RECENT_LIMIT = 8;

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireAdmin();

  let notifications: ShellNotifications = {
    adminId: profile.id,
    initialUnreadCount: 0,
    recent: [],
    realtimeEnabled: true,
  };

  try {
    const [unreadCount, recentPage, prefs] = await Promise.all([
      fetchUnreadCount(profile.id),
      fetchNotifications(profile.id, {
        type: "all",
        read: "all",
        view: "inbox",
        q: "",
        cursor: null,
        limit: BELL_RECENT_LIMIT,
      }),
      fetchNotificationPreferences(profile.id),
    ]);

    notifications = {
      adminId: profile.id,
      initialUnreadCount: unreadCount,
      recent: recentPage.items,
      realtimeEnabled: prefs.realtime_toggle,
    };
  } catch (error) {
    // Bell data is non-critical chrome — never take the admin panel down.
    console.error("[admin/layout] notification chrome failed:", error);
  }

  return (
    <AdminShell
      adminName={profile.display_name ?? profile.email}
      adminEmail={profile.email}
      signOutAction={signOutAction}
      notifications={notifications}
    >
      {children}
    </AdminShell>
  );
}
