"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/admin/(dashboard)/notifications/actions";
import {
  notificationIcon,
  priorityDotClass,
  priorityIconClass,
} from "@/components/admin/notifications/notification-meta";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toNotificationPriority, type AdminNotification } from "@/types/crm";

/**
 * Kinetra CRM — notification bell (Phase 8).
 *
 * Presentational popover: the unread count + recent list arrive as props
 * (fetched by the dashboard layout; the realtime subscription lives once in
 * AdminShell so the two bell instances — desktop sidebar and mobile header —
 * never open duplicate sockets). Clicking an item marks it read and follows
 * its link; the server action revalidates the layout so both instances and
 * the nav badge stay in sync.
 */

interface NotificationBellProps {
  unreadCount: number;
  isLive: boolean;
  recent: AdminNotification[];
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function NotificationBell({
  unreadCount,
  isLive,
  recent,
  side = "bottom",
  align = "end",
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMarkingAll, startMarkAll] = useTransition();

  const handleMarkAllRead = () => {
    startMarkAll(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  const handleItemClick = (item: AdminNotification) => {
    setOpen(false);

    if (!item.read_at) {
      // Fire-and-forget — revalidation + realtime keep every surface honest.
      void markNotificationReadAction(item.id).then(() => router.refresh());
    }

    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-[22rem] max-w-[calc(100vw-2rem)] border-border bg-card p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Notifications
            </p>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isLive ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/40",
              )}
              title={isLive ? "Live updates connected" : "Live updates offline"}
              aria-hidden="true"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Mark all read
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Recent list */}
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox
              className="h-8 w-8 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto" role="list">
            {recent.map((item) => {
              const priority = toNotificationPriority(item.priority);
              const Icon = notificationIcon(item.type);
              const isUnread = !item.read_at;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      isUnread && "bg-primary/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        priorityIconClass(priority),
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          isUnread
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {item.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                    {isUnread ? (
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          priorityDotClass(priority),
                        )}
                        aria-label="Unread"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Separator className="bg-border" />

        {/* Footer */}
        <div className="p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
          >
            <Link href="/admin/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}