"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, CheckCheck, Inbox, Loader2, Search, X } from "lucide-react";

import { markAllNotificationsReadAction } from "@/app/admin/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPES } from "@/types/crm";

/**
 * Kinetra CRM — notification filters toolbar (Phase 8).
 *
 * Same URL-state philosophy as the Phase 3 leads toolbar: every filter lives
 * in the query string, so views are shareable and the server component
 * re-queries on change. Inbox/Archived view toggle, type + read selects,
 * debounced search, clear-filters, and a mark-all-read shortcut.
 */

const SEARCH_DEBOUNCE_MS = 350;

interface NotificationFiltersProps {
  view: "inbox" | "archived";
  type: string;
  read: "all" | "unread" | "read";
  q: string;
  hasUnread: boolean;
}

export function NotificationFilters({
  view,
  type,
  read,
  q,
  hasUnread,
}: NotificationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMarkingAll, startMarkAll] = useTransition();

  /** Apply query-string changes (null/"" deletes a param). */
  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  /* Debounced search — skips the initial render and no-op updates. */
  const [searchValue, setSearchValue] = useState(q);
  const latestQ = useRef(q);
  latestQ.current = q;

  useEffect(() => {
    if (searchValue === latestQ.current) {
      return;
    }
    const handle = setTimeout(() => {
      update({ q: searchValue || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchValue, update]);

  const hasActiveFilters = type !== "all" || read !== "all" || q !== "";

  const handleClear = () => {
    setSearchValue("");
    update({ type: null, read: null, q: null });
  };

  const handleMarkAllRead = () => {
    startMarkAll(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* View toggle + mark all read */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/40 p-1"
          role="tablist"
          aria-label="Notification view"
        >
          <Button
            variant={view === "inbox" ? "secondary" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={view === "inbox"}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              view !== "inbox" && "text-muted-foreground",
            )}
            onClick={() => update({ view: null })}
          >
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            Inbox
          </Button>
          <Button
            variant={view === "archived" ? "secondary" : "ghost"}
            size="sm"
            role="tab"
            aria-selected={view === "archived"}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs",
              view !== "archived" && "text-muted-foreground",
            )}
            onClick={() => update({ view: "archived" })}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Archived
          </Button>
        </div>

        {view === "inbox" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border text-xs"
            onClick={handleMarkAllRead}
            disabled={!hasUnread || isMarkingAll}
          >
            {isMarkingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Mark all as read
          </Button>
        ) : null}
      </div>

      {/* Search + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search notifications…"
            aria-label="Search notifications"
            className="border-border bg-card/40 pl-9"
          />
          {isPending ? (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : null}
        </div>

        <Select
          value={type}
          onValueChange={(value) =>
            update({ type: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className="w-44 border-border bg-card/40"
            aria-label="Filter by type"
          >
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {NOTIFICATION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={read}
          onValueChange={(value) =>
            update({ read: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className="w-32 border-border bg-card/40"
            aria-label="Filter by read state"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}