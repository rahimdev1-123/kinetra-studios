"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AccountSettings,
  type AdminAccountRow,
} from "@/components/admin/settings/account-settings";
import { AppearanceSettingsForm } from "@/components/admin/settings/appearance-settings-form";
import { CrmSettingsForm } from "@/components/admin/settings/crm-settings-form";
import { DangerZone } from "@/components/admin/settings/danger-zone";
import { EmailSettingsForm } from "@/components/admin/settings/email-settings-form";
import { GeneralSettingsForm } from "@/components/admin/settings/general-settings-form";
import { NotificationPreferencesForm } from "@/components/admin/settings/notification-preferences-form";
import {
  SecuritySettingsPanel,
  type ApiKeyStatus,
  type AuditEventRow,
} from "@/components/admin/settings/security-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isSettingsTab,
  SETTINGS_TAB_LABELS,
  SETTINGS_TABS,
  type SettingsTab,
} from "@/lib/admin/settings-tabs";
import type { AllSettings } from "@/lib/admin/settings-schemas";
import type { NotificationPreference } from "@/types/crm";

/**
 * Kinetra CRM — Settings tabs shell (Phase 9).
 *
 * Eight tabs over the Block 2 data layer. The active tab is mirrored into
 * ?tab= so views are deep-linkable (e.g. /admin/settings?tab=notifications
 * from the bell). All initial values arrive serialized from the server page.
 * Tab ids/labels/guard live in @/lib/admin/settings-tabs (single source of
 * truth shared with the server page) — no local duplicates here.
 */

interface SettingsTabsProps {
  initialTab: SettingsTab;
  settings: AllSettings;
  preferences: NotificationPreference;
  admins: AdminAccountRow[];
  adminOptions: { id: string; label: string }[];
  apiKeys: ApiKeyStatus[];
  auditEvents: AuditEventRow[];
  self: { id: string; displayName: string; email: string };
}

export function SettingsTabs({
  initialTab,
  settings,
  preferences,
  admins,
  adminOptions,
  apiKeys,
  auditEvents,
  self,
}: SettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  const handleTabChange = (value: string) => {
    const next = isSettingsTab(value) ? value : "general";
    setTab(next);
    router.replace(
      next === "general" ? pathname : `${pathname}?tab=${next}`,
      { scroll: false },
    );
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 border border-border bg-card/40 p-1">
        {SETTINGS_TABS.map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            className={
              id === "danger"
                ? "text-xs data-[state=active]:text-destructive"
                : "text-xs"
            }
          >
            {SETTINGS_TAB_LABELS[id]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="general" className="mt-6">
        <GeneralSettingsForm initial={settings.general} />
      </TabsContent>

      <TabsContent value="crm" className="mt-6">
        <CrmSettingsForm initial={settings.crm} admins={adminOptions} />
      </TabsContent>

      <TabsContent value="email" className="mt-6">
        <EmailSettingsForm initial={settings.email} />
      </TabsContent>

      <TabsContent value="notifications" className="mt-6">
        <NotificationPreferencesForm initial={preferences} />
      </TabsContent>

      <TabsContent value="users" className="mt-6">
        <AccountSettings
          selfId={self.id}
          displayName={self.displayName}
          email={self.email}
          admins={admins}
        />
      </TabsContent>

      <TabsContent value="appearance" className="mt-6">
        <AppearanceSettingsForm initial={settings.appearance} />
      </TabsContent>

      <TabsContent value="security" className="mt-6">
        <SecuritySettingsPanel
          initial={settings.security}
          apiKeys={apiKeys}
          auditEvents={auditEvents}
        />
      </TabsContent>

      <TabsContent value="danger" className="mt-6">
        <DangerZone />
      </TabsContent>
    </Tabs>
  );
}