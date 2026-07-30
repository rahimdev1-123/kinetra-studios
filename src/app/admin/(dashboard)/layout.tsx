import type { Metadata } from "next";

import { signOutAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Kinetra CRM — guarded admin layout (Phase 1).
 *
 * Wraps every /admin page except /admin/login (which lives in the (auth)
 * route group). requireAdmin() enforces the DB-backed allowlist on top of
 * the middleware session check — non-admins never see this shell.
 */

export const metadata: Metadata = {
  title: {
    default: "Dashboard · Kinetra Admin",
    template: "%s · Kinetra Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireAdmin();

  return (
    <AdminShell
      adminName={profile.display_name ?? profile.email}
      adminEmail={profile.email}
      signOutAction={signOutAction}
    >
      {children}
    </AdminShell>
  );
}