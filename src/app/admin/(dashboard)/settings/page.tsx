import type { Metadata } from "next";

import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { requireAdmin } from "@/lib/admin/auth";
import { fetchNotificationPreferences } from "@/lib/admin/notifications";
import { fetchAllSettings, fetchSecurityOverview } from "@/lib/admin/settings";
import {
  isSettingsTab,
  type SettingsTab,
} from "@/lib/admin/settings-tabs";

/**
 * Kinetra CRM — /admin/settings (Phase 9).
 *
 * Server page for the settings module: loads every settings group
 * (defaults-merged + zod-validated by the Block 2 readers), the caller's
 * notification preferences, and the security overview in parallel, then
 * hands serialized values to the tabbed client UI. Every reader degrades to
 * defaults, so this page renders even before migration 9 is applied.
 */

export const metadata: Metadata = {
  title: "Settings",
};

interface SettingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { profile } = await requireAdmin();

  const sp = await searchParams;
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const initialTab: SettingsTab = isSettingsTab(rawTab) ? rawTab : "general";

  const [settings, preferences, overview] = await Promise.all([
    fetchAllSettings(),
    fetchNotificationPreferences(profile.id),
    fetchSecurityOverview(),
  ]);

  const adminOptions = overview.admins
    .map((admin) => ({ id: admin.id, label: admin.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Studio settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CRM configuration, your account, notification preferences, and
          security — validated on the client and re-validated on the server.
        </p>
      </div>

      <SettingsTabs
        initialTab={initialTab}
        settings={settings}
        preferences={preferences}
        admins={overview.admins}
        adminOptions={adminOptions}
        apiKeys={overview.apiKeys}
        auditEvents={overview.auditEvents}
        self={{
          id: profile.id,
          displayName: profile.display_name ?? "",
          email: profile.email,
        }}
      />
    </div>
  );
}