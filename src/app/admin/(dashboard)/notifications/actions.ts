"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import { fetchNotifications } from "@/lib/admin/notifications";
import { notificationPreferencesSchema } from "@/lib/admin/settings-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isNotificationType,
  toNotificationPriority,
  type AdminNotification,
} from "@/types/crm";
import type { Json } from "@/types/database.types";

/**
 * Kinetra CRM — Notification server actions (Phase 8).
 *
 * Mark read / mark all read / delete (with undo snapshot) / archive /
 * unarchive / manual notifications / delivery preferences. Every action
 * re-verifies the admin session and scopes mutations to rows the caller may
 * touch (their own + broadcasts), then revalidates the notification
 * surfaces. Event notifications themselves are created by the migration-9
 * database triggers — no duplicate creation logic here.
 */

const idSchema = z.string().trim().min(1).max(100);

/**
 * The unread badge + the bell's recent list are fetched in the (dashboard)
 * LAYOUT, so bust the whole layout subtree — a mutation made from the bell
 * while on /admin/leads must refresh the badge there too, not just on /admin.
 */
function revalidateNotificationSurfaces(): void {
  revalidatePath("/admin", "layout");
}

export interface NotificationActionResult {
  ok: boolean;
  error?: string;
}

/* ───────────────────────────── Mark read ───────────────────────────────── */

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification reference." };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .or(`recipient_id.eq.${ctx.profile.id},recipient_id.is.null`)
    .is("read_at", null);

  if (error) {
    console.error("[admin/notifications] mark read failed:", error.message);
    return { ok: false, error: "Couldn't mark as read. Try again." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .or(`recipient_id.eq.${ctx.profile.id},recipient_id.is.null`)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) {
    console.error("[admin/notifications] mark all read failed:", error.message);
    return { ok: false, error: "Couldn't mark all as read. Try again." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

/* ──────────────────────── Archive / unarchive (undo) ───────────────────── */

export async function archiveNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .or(`recipient_id.eq.${ctx.profile.id},recipient_id.is.null`)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/notifications] archive failed:", error.message);
    return { ok: false, error: "Couldn't archive the notification." };
  }

  if (!data) {
    return { ok: false, error: "Notification not found or already archived." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

export async function unarchiveNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_notifications")
    .update({ archived_at: null })
    .eq("id", parsed.data)
    .or(`recipient_id.eq.${ctx.profile.id},recipient_id.is.null`)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/notifications] unarchive failed:", error.message);
    return { ok: false, error: "Couldn't restore the notification." };
  }

  if (!data) {
    return { ok: false, error: "Notification not found or not archived." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

/* ─────────────────────────── Delete (with undo) ────────────────────────── */

const snapshotSchema = z.object({
  id: z.string(),
  recipient_id: z.string().nullable(),
  lead_id: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  priority: z.string(),
  icon: z.string().nullable(),
  link: z.string().nullable(),
  metadata: z.unknown(),
  archived_at: z.string().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type NotificationSnapshot = z.infer<typeof snapshotSchema>;

export type DeleteNotificationResult =
  | { ok: true; snapshot: NotificationSnapshot }
  | { ok: false; error: string };

export async function deleteNotificationAction(
  notificationId: string,
): Promise<DeleteNotificationResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = idSchema.safeParse(notificationId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid notification reference." };
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("admin_notifications")
    .delete()
    .eq("id", parsed.data)
    .or(`recipient_id.eq.${ctx.profile.id},recipient_id.is.null`)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[admin/notifications] delete failed:", error.message);
    return { ok: false, error: "Couldn't delete the notification." };
  }

  if (!data) {
    return { ok: false, error: "Notification not found." };
  }

  revalidateNotificationSurfaces();

  return {
    ok: true,
    snapshot: {
      id: data.id,
      recipient_id: data.recipient_id,
      lead_id: data.lead_id,
      type: data.type,
      title: data.title,
      body: data.body,
      priority: data.priority,
      icon: data.icon,
      link: data.link,
      metadata: data.metadata,
      archived_at: data.archived_at,
      read_at: data.read_at,
      created_at: data.created_at,
    },
  };
}

/** Undo for deleteNotificationAction — re-inserts the exact snapshot. */
export async function restoreDeletedNotificationAction(
  snapshot: NotificationSnapshot,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    return { ok: false, error: "Invalid undo payload." };
  }

  const s = parsed.data;
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("admin_notifications").insert({
    id: s.id,
    recipient_id: s.recipient_id,
    lead_id: s.lead_id,
    type: s.type,
    title: s.title,
    body: s.body,
    priority: s.priority,
    icon: s.icon,
    link: s.link,
    metadata: (s.metadata ?? {}) as Json,
    archived_at: s.archived_at,
    read_at: s.read_at,
    created_at: s.created_at,
  });

  if (error) {
    console.error("[admin/notifications] undo delete failed:", error.message);
    return { ok: false, error: "Couldn't restore the notification." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

/* ───────────────────────── Manual notification ─────────────────────────── */

const manualNotificationSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(140),
  body: z.string().trim().max(1000).optional(),
  /** null = broadcast to every admin. */
  recipientId: z.string().trim().max(100).nullable(),
  priority: z.string().optional(),
  link: z.string().trim().max(300).optional(),
});

export type ManualNotificationInput = z.infer<typeof manualNotificationSchema>;

export async function createManualNotificationAction(
  input: ManualNotificationInput,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = manualNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid notification.",
    };
  }

  const d = parsed.data;

  // Internal links only — never let a manual notification point off-site.
  const link =
    d.link && d.link.startsWith("/admin") && !d.link.startsWith("//")
      ? d.link
      : null;

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("admin_notifications").insert({
    recipient_id: d.recipientId,
    type: "manual",
    title: d.title,
    body: d.body || null,
    priority: toNotificationPriority(d.priority),
    icon: "megaphone",
    link,
    metadata: { created_by: ctx.profile.id },
  });

  if (error) {
    console.error("[admin/notifications] manual create failed:", error.message);
    return { ok: false, error: "Couldn't send the notification." };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

/* ───────────────────────────── Preferences ─────────────────────────────── */

export async function saveNotificationPreferencesAction(
  input: unknown,
): Promise<NotificationActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid preferences.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("notification_preferences").upsert(
    {
      user_id: ctx.profile.id,
      ...parsed.data,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[admin/notifications] prefs save failed:", error.message);
    return { ok: false, error: "Couldn't save preferences. Try again." };
  }

  revalidatePath("/admin/settings");
  revalidateNotificationSurfaces();
  return { ok: true };
}

/* ─────────────────────── Cursor pagination (load more) ─────────────────── */

const loadMoreSchema = z.object({
  type: z.string().max(40),
  read: z.enum(["all", "unread", "read"]),
  view: z.enum(["inbox", "archived"]),
  q: z.string().max(200),
  /** ISO created_at of the last rendered row. */
  cursor: z.string().trim().min(1).max(64),
  limit: z.number().int().min(1).max(50),
});

export type LoadMoreNotificationsInput = z.infer<typeof loadMoreSchema>;

export type LoadMoreNotificationsResult =
  | {
      ok: true;
      items: AdminNotification[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | { ok: false; error: string };

/**
 * Next page for the /admin/notifications infinite list. Read-only, but still
 * session-verified — the page count/cursor are caller-supplied input.
 */
export async function loadMoreNotificationsAction(
  input: LoadMoreNotificationsInput,
): Promise<LoadMoreNotificationsResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = loadMoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid pagination request." };
  }

  const d = parsed.data;

  try {
    const page = await fetchNotifications(ctx.profile.id, {
      type: isNotificationType(d.type) ? d.type : "all",
      read: d.read,
      view: d.view,
      q: d.q,
      cursor: d.cursor,
      limit: d.limit,
    });

    return {
      ok: true,
      items: page.items,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  } catch (error) {
    console.error("[admin/notifications] load more failed:", error);
    return { ok: false, error: "Couldn't load more notifications." };
  }
}