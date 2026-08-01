"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  toNotificationPriority,
  type AdminNotification,
  type NotificationPriority,
} from "@/types/crm";

/**
 * Kinetra CRM — live notifications hook (Phase 8).
 *
 * Client-side companion to the server-rendered notification surfaces.
 * Subscribes to admin_notifications changes via Supabase realtime (same
 * browser client + RLS story as the Phase 6 RealtimeRefresher), keeps the
 * bell badge count accurate, surfaces the newest incoming notification for
 * toasts, and debounce-refreshes the router so server-fetched lists catch up.
 *
 * The server remains the source of truth: `initialUnreadCount` (fetched with
 * fetchUnreadCount) re-syncs local state on every server render, so optimistic
 * drift self-heals after mark-read / archive actions revalidate.
 */

const SYNC_DEBOUNCE_MS = 1200;

export interface IncomingNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  link: string | null;
  createdAt: string;
}

export interface UseNotificationsOptions {
  /** admin_users.id of the signed-in admin (scopes counts + relevance). */
  adminId: string;
  /** Server-computed unread count — re-syncs state on every render. */
  initialUnreadCount: number;
  /** Respects the user's realtime preference; false = badge only, no socket. */
  enabled?: boolean;
}

export interface UseNotificationsResult {
  unreadCount: number;
  /** True while the realtime channel is SUBSCRIBED. */
  isLive: boolean;
  /** Newest INSERT since the last dismiss — drive toasts off this. */
  incoming: IncomingNotification | null;
  dismissIncoming: () => void;
  /** Force a badge re-count (e.g. after an optimistic mutation). */
  refresh: () => Promise<void>;
}

export function useNotifications({
  adminId,
  initialUnreadCount,
  enabled = true,
}: UseNotificationsOptions): UseNotificationsResult {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLive, setIsLive] = useState(false);
  const [incoming, setIncoming] = useState<IncomingNotification | null>(null);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server truth wins whenever a server render supplies a fresh count.
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    const { count, error } = await supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .or(`recipient_id.eq.${adminId},recipient_id.is.null`)
      .is("read_at", null)
      .is("archived_at", null);

    if (!error && typeof count === "number") {
      setUnreadCount(count);
    }
  }, [adminId]);

  useEffect(() => {
    if (!enabled || !adminId) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const scheduleSync = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void refresh();
        startTransition(() => {
          router.refresh();
        });
      }, SYNC_DEBOUNCE_MS);
    };

    const handleChange = (
      payload: RealtimePostgresChangesPayload<AdminNotification>,
    ) => {
      // DELETE payloads may only carry the primary key — when recipient is
      // unknown, err on the side of re-syncing (cheap head-count query).
      const source =
        payload.eventType === "DELETE" ? payload.old : payload.new;
      const recipient = (source as Partial<AdminNotification>).recipient_id;

      if (
        recipient !== undefined &&
        recipient !== null &&
        recipient !== adminId
      ) {
        return; // Someone else's direct notification — not ours.
      }

      if (payload.eventType === "INSERT") {
        const fresh = payload.new as AdminNotification;
        if (fresh?.id) {
          setIncoming({
            id: fresh.id,
            type: fresh.type,
            title: fresh.title,
            body: fresh.body,
            priority: toNotificationPriority(fresh.priority),
            link: fresh.link,
            createdAt: fresh.created_at,
          });
        }
      }

      scheduleSync();
    };

    const channel = supabase
      .channel(`kinetra-notifications-${adminId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        handleChange,
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setIsLive(false);
      supabase.removeChannel(channel);
    };
  }, [adminId, enabled, refresh, router]);

  const dismissIncoming = useCallback(() => {
    setIncoming(null);
  }, []);

  return { unreadCount, isLive, incoming, dismissIncoming, refresh };
}