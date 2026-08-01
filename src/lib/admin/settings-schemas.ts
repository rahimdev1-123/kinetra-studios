import { z } from "zod";

/**
 * Kinetra CRM — Settings schemas (Phase 9).
 *
 * CLIENT-SAFE (no server-only import): these zod schemas validate both the
 * React Hook Form tabs (Block 4) and the saveSettingsAction server action,
 * so client and server can never drift. Values live in the EXISTING
 * admin_settings key/value store under the keys below (seeded by
 * migration 9).
 */

export const SETTINGS_KEYS = [
  "general",
  "crm",
  "email",
  "appearance",
  "security",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

/* ─────────────────────────────── General ───────────────────────────────── */

export const generalSettingsSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required.").max(120),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().min(1).max(8),
  language: z.string().trim().min(1).max(16),
  working_hours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM."),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM."),
  }),
  business_info: z.string().max(2000),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export const GENERAL_DEFAULTS: GeneralSettings = {
  company_name: "Kinetra Studios",
  timezone: "UTC",
  currency: "USD",
  language: "en",
  working_hours: { start: "09:00", end: "18:00" },
  business_info: "",
};

/* ───────────────────────────────── CRM ─────────────────────────────────── */

export const crmSettingsSchema = z.object({
  pipeline_stages: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Keep at least one stage."),
  lead_sources: z
    .array(z.string().trim().min(1).max(40))
    .min(1, "Keep at least one source."),
  archive_rules: z.object({
    auto_archive_lost_after_days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .nullable(),
  }),
  default_owner: z.string().nullable(),
  default_status: z.string().trim().min(1).max(40),
  lead_numbering: z.object({
    prefix: z.string().trim().max(10),
    next: z.number().int().min(1),
  }),
});

export type CrmSettings = z.infer<typeof crmSettingsSchema>;

export const CRM_DEFAULTS: CrmSettings = {
  pipeline_stages: ["new", "contacted", "qualified", "proposal", "won", "lost"],
  lead_sources: ["website", "manual"],
  archive_rules: { auto_archive_lost_after_days: null },
  default_owner: null,
  default_status: "new",
  lead_numbering: { prefix: "KIN-", next: 1 },
};

/* ──────────────────────────────── Email ────────────────────────────────── */

export const emailSettingsSchema = z.object({
  sender_name: z.string().trim().min(1).max(120),
  sender_email: z.string().trim().email("Enter a valid email.").max(254),
  reply_to: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(254)
    .nullable(),
  signature: z.string().max(2000),
  smtp: z.object({
    host: z.string().trim().max(255),
    port: z.number().int().min(1).max(65535),
    username: z.string().trim().max(255),
  }),
  branding: z.object({
    footer: z.string().max(300),
  }),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const EMAIL_DEFAULTS: EmailSettings = {
  sender_name: "Kinetra Studios",
  sender_email: "onboarding@resend.dev",
  reply_to: null,
  signature: "Kinetra Studios — Edited for impact.",
  smtp: { host: "", port: 587, username: "" },
  branding: { footer: "Kinetra Studios — Edited for impact." },
};

/* ────────────────────────────── Appearance ─────────────────────────────── */

export const appearanceSettingsSchema = z.object({
  density: z.enum(["comfortable", "compact"]),
  dashboard: z.object({
    default_range: z.enum(["7d", "30d", "90d", "12m"]),
  }),
  charts: z.object({
    show_legend: z.boolean(),
  }),
});

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;

export const APPEARANCE_DEFAULTS: AppearanceSettings = {
  density: "comfortable",
  dashboard: { default_range: "30d" },
  charts: { show_legend: true },
};

/* ─────────────────────────────── Security ──────────────────────────────── */

export const securitySettingsSchema = z.object({
  audit_retention_days: z.number().int().min(7).max(365),
});

export type SecuritySettings = z.infer<typeof securitySettingsSchema>;

export const SECURITY_DEFAULTS: SecuritySettings = {
  audit_retention_days: 90,
};

/* ──────────────────── Notification preferences (Phase 8) ───────────────── */

export const notificationPreferencesSchema = z.object({
  realtime_toggle: z.boolean(),
  email_toggle: z.boolean(),
  browser_toggle: z.boolean(),
  digest_frequency: z.enum(["off", "daily", "weekly"]),
  quiet_hours_start: z.number().int().min(0).max(23).nullable(),
  quiet_hours_end: z.number().int().min(0).max(23).nullable(),
});

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;

/* ─────────────────────────────── Registry ──────────────────────────────── */

export const SETTINGS_SCHEMAS = {
  general: generalSettingsSchema,
  crm: crmSettingsSchema,
  email: emailSettingsSchema,
  appearance: appearanceSettingsSchema,
  security: securitySettingsSchema,
} as const;

export const SETTINGS_DEFAULTS = {
  general: GENERAL_DEFAULTS,
  crm: CRM_DEFAULTS,
  email: EMAIL_DEFAULTS,
  appearance: APPEARANCE_DEFAULTS,
  security: SECURITY_DEFAULTS,
} as const;

export interface AllSettings {
  general: GeneralSettings;
  crm: CrmSettings;
  email: EmailSettings;
  appearance: AppearanceSettings;
  security: SecuritySettings;
}

export function isSettingsKey(value: unknown): value is SettingsKey {
  return (
    typeof value === "string" &&
    (SETTINGS_KEYS as readonly string[]).includes(value)
  );
}
