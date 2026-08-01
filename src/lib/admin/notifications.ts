import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isNotificationType,
  type AdminNotification,
  type NotificationPreference,
  type NotificationType,
} from "@/types/crm";

/**
 * Kinetra CRM — Notifications data layer (Phase 8).
 *
 * Server-only queries for the bell dropdown and /admin/notifications.
 * Notifications live in the EXISTING admin_notifications table (migration 3,
 * extended in migration 9): recipient_id NULL = broadcast to every admin.
 * Type constants live client-safe in @/types/crm (like LEAD_STATUSES).
 * Every function assumes requireAdmin()/getAdminContext() ran upstream.
 *
 * NOTE on read state: read_at lives on the notification row itself, so
 * marking a broadcast notification read marks it read for the whole team —
 * the deliberate, simple model for a small studio team.
 */

/* ─────────────────────────── List parameters ───────────────────────────── */

export const NOTIFICATION_READ_FILTERS = ["all", "unread", "read"] as const;
export type NotificationReadFilter =
  (typeof NOTIFICATION_READ_FILTERS)[number];

export const NOTIFICATION_VIEWS = ["inbox", "archived"] as const;
export type NotificationView = (typeof NOTIFICATION_VIEWS)[number];

export interface NotificationListParams {
  type: NotificationType | "all";
  read: NotificationReadFilter;
  view: NotificationView;
  /** Search term matched against title and body. */
  q: string;
  /** Cursor: only rows created strictly BEFORE this ISO timestamp. */
  cursor: string | null;
  limit: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse raw searchParams into safe, typed list params. */
export function parseNotificationListParams(
  searchParams: Record<string, string | string[] | undefined>,
): NotificationListParams {
  const rawType = first(searchParams.type);
  const rawRead = first(searchParams.read);
  const rawView = first(searchParams.view);

  return {
    type: isNotificationType(rawType) ? rawType : "all",
    read: (NOTIFICATION_READ_FILTERS as readonly string[]).includes(
      rawRead ?? "",
    )
      ? (rawRead as NotificationReadFilter)
      : "all",
    view: (NOTIFICATION_VIEWS as readonly string[]).includes(rawView ?? "")
      ? (rawView as NotificationView)
      : "inbox",
    q: (first(searchParams.q) ?? "").trim().slice(0, 200),
    cursor: null,
    limit: DEFAULT_PAGE_SIZE,
  };
}

/* ─────────────────────────────── Queries ───────────────────────────────── */

/** Escape a term for PostgREST or(...ilike...) filters (Phase 3 pattern). */
function sanitizeSearchTerm(q: string): string {
  return q
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}

export interface NotificationPage {
  items: AdminNotification[];
  /** Pass as `cursor` to fetch the next page; null when exhausted. */
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * One page of the admin's notifications (own + broadcasts), newest first.
 * Cursor-based so the page and the infinite-scroll list stay stable while
 * new notifications arrive at the top.
 */
export async function fetchNotifications(
  adminId: string,
  params: NotificationListParams,
): Promise<NotificationPage> {
  const admin = createSupabaseAdminClient();
  const limit = Math.min(Math.max(params.limit, 1), MAX_PAGE_SIZE);

  let query = admin
    .from("admin_notifications")
    .select("*")
    .or(`recipient_id.eq.${adminId},recipient_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (params.view === "archived") {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (params.type !== "all") {
    query = query.eq("type", params.type);
  }

  if (params.read === "unread") {
    query = query.is("read_at", null);
  } else if (params.read === "read") {
    query = query.not("read_at", "is", null);
  }

  const term = sanitizeSearchTerm(params.q);
  if (term) {
    query = query.or(`title.ilike.*${term}*,body.ilike.*${term}*`);
  }

  if (params.cursor) {
    query = query.lt("created_at", params.cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? (items[items.length - 1]?.created_at ?? null) : null,
  };
}

/** Unread, unarchived notifications for the badge. */
export async function fetchUnreadCount(adminId: string): Promise<number> {
  const admin = createSupabaseAdminClient();

  const { count, error } = await admin
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .or(`recipient_id.eq.${adminId},recipient_id.is.null`)
    .is("read_at", null)
    .is("archived_at", null);

  if (error) {
    console.error("[admin/notifications] unread count failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Materialize task_due / task_overdue notifications (idempotent RPC from
 * migration 9). Failures are non-fatal — surfaces still render.
 */
export async function ensureDueNotifications(): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.rpc("kinetra_generate_due_notifications");

  if (error) {
    console.error(
      "[admin/notifications] due-notification generation failed:",
      error.message,
    );
  }
}

/** The admin's delivery preferences (defaults when the row is missing). */
export async function fetchNotificationPreferences(
  adminId: string,
): Promise<NotificationPreference> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", adminId)
    .maybeSingle();

  if (error) {
    console.error("[admin/notifications] prefs fetch failed:", error.message);
  }

  return (
    data ?? {
      user_id: adminId,
      realtime_toggle: true,
      email_toggle: false,
      browser_toggle: false,
      digest_frequency: "off",
      quiet_hours_start: null,
      quiet_hours_end: null,
      updated_at: new Date().toISOString(),
    }
  );
}