"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  Check,
  ExternalLink,
  Inbox,
  Loader2,
  SearchX,
  Trash2,
} from "lucide-react";

import {
  archiveNotificationAction,
  deleteNotificationAction,
  loadMoreNotificationsAction,
  markNotificationReadAction,
  restoreDeletedNotificationAction,
  unarchiveNotificationAction,
} from "@/app/admin/(dashboard)/notifications/actions";
import {
  notificationIcon,
  priorityDotClass,
  priorityIconClass,
} from "@/components/admin/notifications/notification-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_TYPE_LABELS,
  toNotificationPriority,
  type AdminNotification,
  type NotificationType,
} from "@/types/crm";

/**
 * Kinetra CRM — notification list (Phase 8).
 *
 * Interactive list for /admin/notifications. The server page streams the
 * first cursor page in; this component owns the accumulated list state:
 * optimistic mark-read, archive/unarchive, DELETE WITH UNDO (the server
 * action returns a snapshot that the toast's Undo button re-inserts), and
 * cursor-based "Load more". Filter changes remount it via the page's
 * Suspense key, so state always starts from fresh server truth.
 */

interface NotificationListProps {
  initialItems: AdminNotification[];
  initialCursor: string | null;
  initialHasMore: boolean;
  view: "inbox" | "archived";
  type: string;
  read: "all" | "unread" | "read";
  q: string;
  limit: number;
}

function typeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type as NotificationType] ?? "Notification";
}

/** Re-insert a row keeping the newest-first ordering intact. */
function insertSorted(
  items: AdminNotification[],
  item: AdminNotification,
): AdminNotification[] {
  return [...items, item].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}

export function NotificationList({
  initialItems,
  initialCursor,
  initialHasMore,
  view,
  type,
  read,
  q,
  limit,
}: NotificationListProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<AdminNotification[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, startLoadMore] = useTransition();
  const [, startAction] = useTransition();

  /* ────────────────────────── Row actions ──────────────────────────────── */

  const handleMarkRead = (item: AdminNotification) => {
    if (item.read_at) return;
    const readAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: readAt } : n)),
    );
    startAction(async () => {
      await markNotificationReadAction(item.id);
      router.refresh();
    });
  };

  const handleOpen = (item: AdminNotification) => {
    handleMarkRead(item);
    if (item.link) {
      router.push(item.link);
    }
  };

  const handleArchive = (item: AdminNotification) => {
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    startAction(async () => {
      const result = await archiveNotificationAction(item.id);
      if (!result.ok) {
        setItems((prev) => insertSorted(prev, item));
        toast({ title: "Couldn't archive", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: "Notification archived",
        action: (
          <ToastAction
            altText="Undo archive"
            onClick={() => {
              void unarchiveNotificationAction(item.id).then((undo) => {
                if (undo.ok) {
                  setItems((prev) => insertSorted(prev, item));
                  router.refresh();
                }
              });
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    });
  };

  const handleUnarchive = (item: AdminNotification) => {
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    startAction(async () => {
      const result = await unarchiveNotificationAction(item.id);
      if (!result.ok) {
        setItems((prev) => insertSorted(prev, item));
        toast({ title: "Couldn't restore", description: result.error });
        return;
      }
      router.refresh();
      toast({ title: "Moved back to inbox" });
    });
  };

  const handleDelete = (item: AdminNotification) => {
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    startAction(async () => {
      const result = await deleteNotificationAction(item.id);
      if (!result.ok) {
        setItems((prev) => insertSorted(prev, item));
        toast({ title: "Couldn't delete", description: result.error });
        return;
      }
      router.refresh();
      const { snapshot } = result;
      toast({
        title: "Notification deleted",
        action: (
          <ToastAction
            altText="Undo delete"
            onClick={() => {
              void restoreDeletedNotificationAction(snapshot).then((undo) => {
                if (undo.ok) {
                  setItems((prev) => insertSorted(prev, item));
                  router.refresh();
                } else {
                  toast({
                    title: "Couldn't restore",
                    description: undo.error,
                  });
                }
              });
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    });
  };

  const handleLoadMore = () => {
    if (!cursor) return;
    startLoadMore(async () => {
      const result = await loadMoreNotificationsAction({
        type,
        read,
        view,
        q,
        cursor,
        limit,
      });
      if (!result.ok) {
        toast({ title: "Couldn't load more", description: result.error });
        return;
      }
      // Guard against duplicates if a realtime refresh raced the cursor.
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...result.items.filter((n) => !seen.has(n.id))];
      });
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    });
  };

  /* ────────────────────────── Empty states ─────────────────────────────── */

  if (items.length === 0) {
    const hasActiveFilters = type !== "all" || read !== "all" || q !== "";
    const EmptyIcon = hasActiveFilters
      ? SearchX
      : view === "archived"
        ? BellOff
        : Inbox;

    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/20 px-6 py-16 text-center">
        <EmptyIcon
          className="h-10 w-10 text-muted-foreground/40"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {hasActiveFilters
              ? "No notifications match your filters"
              : view === "archived"
                ? "No archived notifications"
                : "You're all caught up"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try a different type, read state, or search term."
              : view === "archived"
                ? "Archived notifications will appear here."
                : "New leads, status changes, emails, and due tasks will show up here."}
          </p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────── List ────────────────────────────────── */

  return (
    <div className="flex flex-col gap-4">
      <ul
        className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/40"
        role="list"
      >
        {items.map((item) => {
          const priority = toNotificationPriority(item.priority);
          const Icon = notificationIcon(item.type);
          const isUnread = !item.read_at;
          const created = new Date(item.created_at);

          return (
            <li
              key={item.id}
              className={cn(
                "group relative flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40",
                isUnread && "bg-primary/[0.04]",
              )}
            >
              {/* Unread accent */}
              {isUnread ? (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-0.5",
                    priorityDotClass(priority),
                  )}
                  aria-hidden="true"
                />
              ) : null}

              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  priorityIconClass(priority),
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>

              {/* Content */}
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      isUnread
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground",
                    )}
                  >
                    {item.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                  >
                    {typeLabel(item.type)}
                  </Badge>
                  {priority === "high" ? (
                    <Badge
                      variant="outline"
                      className="border-destructive/40 font-mono text-[9px] uppercase tracking-wider text-destructive"
                    >
                      High
                    </Badge>
                  ) : null}
                  {item.link ? (
                    <ExternalLink
                      className="h-3 w-3 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                {item.body ? (
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                    {item.body}
                  </span>
                ) : null}
                <span
                  className="mt-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70"
                  title={format(created, "PPpp")}
                >
                  {formatDistanceToNow(created, { addSuffix: true })}
                </span>
              </button>

              {/* Row actions */}
              <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                {isUnread ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleMarkRead(item)}
                    aria-label="Mark as read"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
                {view === "inbox" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleArchive(item)}
                    aria-label="Archive notification"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleUnarchive(item)}
                    aria-label="Move back to inbox"
                    title="Move back to inbox"
                  >
                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item)}
                  aria-label="Delete notification"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore ? (
        <Button
          variant="outline"
          className="mx-auto border-border"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading…
            </>
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}
    </div>
  );
}

/** Suspense fallback for the streamed list section. */
export function NotificationListSkeleton() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/40">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}