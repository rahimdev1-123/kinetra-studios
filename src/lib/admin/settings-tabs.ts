/**
 * Kinetra CRM — Settings tab registry (Phase 9).
 *
 * SINGLE SOURCE OF TRUTH for the settings tab ids, labels, and the type
 * guard. Client-safe (no server-only import, no React) so BOTH sides use it:
 *   * server:  src/app/admin/(dashboard)/settings/page.tsx validates ?tab=
 *   * client:  src/components/admin/settings/settings-tabs.tsx renders them
 * Do not redefine these anywhere else.
 */

export const SETTINGS_TABS = [
  "general",
  "crm",
  "email",
  "notifications",
  "users",
  "appearance",
  "security",
  "danger",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export function isSettingsTab(value: unknown): value is SettingsTab {
  return (
    typeof value === "string" &&
    (SETTINGS_TABS as readonly string[]).includes(value)
  );
}

export const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  general: "General",
  crm: "CRM",
  email: "Email",
  notifications: "Notifications",
  users: "Users",
  appearance: "Appearance",
  security: "Security",
  danger: "Danger Zone",
};