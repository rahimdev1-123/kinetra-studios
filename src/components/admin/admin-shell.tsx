"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { NotificationBell } from "@/components/admin/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotifications } from "@/hooks/use-notifications";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { AdminNotification } from "@/types/crm";

/**
 * Kinetra CRM — admin app shell (Phase 1, extended in Phase 8).
 *
 * Self-contained sidebar + header built only on primitives that already
 * exist in src/components/ui and the design tokens already defined in
 * globals.css — no changes to public styles, no new CSS variables.
 *
 * Phase 8: the Notifications nav entry goes live with an unread badge, and
 * the NotificationBell mounts in the sidebar brand row (desktop) and the
 * mobile header. The realtime subscription lives HERE — one useNotifications
 * instance feeds both bell instances and the nav badge, so only a single
 * socket channel ever opens. The `notifications` prop stays optional: the
 * shell renders exactly as before if the layout doesn't supply it.
 */

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  comingSoon?: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Leads", href: "/admin/leads", icon: Users },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];;

export interface ShellNotifications {
  /** admin_users.id of the signed-in admin. */
  adminId: string;
  /** Server-computed unread count (re-synced on every server render). */
  initialUnreadCount: number;
  /** Most recent inbox notifications for the bell dropdown. */
  recent: AdminNotification[];
  /** The admin's realtime preference (notification_preferences). */
  realtimeEnabled: boolean;
}

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  signOutAction: () => Promise<void>;
  notifications?: ShellNotifications;
  children: React.ReactNode;
}

function BrandMark() {
  return (
    <div className="flex items-baseline gap-2 px-2">
      <span className="font-display text-xl font-extrabold tracking-wide text-foreground">
        KINETRA
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">
        Admin
      </span>
    </div>
  );
}

function NavLinks({
  pathname,
  unreadCount,
  onNavigate,
}: {
  pathname: string;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const showUnread =
          item.href === "/admin/notifications" && unreadCount > 0;

        if (item.disabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title={
                item.comingSoon ? `Coming in ${item.comingSoon}` : undefined
              }
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.title}</span>
              {item.comingSoon ? (
                <Badge
                  variant="outline"
                  className="border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                >
                  {item.comingSoon}
                </Badge>
              ) : null}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.title}</span>
            {showUnread ? (
              <Badge className="h-5 min-w-5 justify-center bg-primary px-1.5 font-mono text-[10px] font-bold text-primary-foreground hover:bg-primary">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  adminName,
  adminEmail,
  signOutAction,
  notifications,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast } = useToast();

  // Single realtime subscription for the whole shell (badge + both bells).
  const { unreadCount, isLive, incoming, dismissIncoming } = useNotifications({
    adminId: notifications?.adminId ?? "",
    initialUnreadCount: notifications?.initialUnreadCount ?? 0,
    enabled:
      Boolean(notifications?.adminId) &&
      (notifications?.realtimeEnabled ?? true),
  });

  // Surface newly arrived notifications as a toast, once, shell-wide.
  useEffect(() => {
    if (!incoming) {
      return;
    }
    toast({
      title: incoming.title,
      description: incoming.body ?? undefined,
    });
    dismissIncoming();
  }, [incoming, dismissIncoming, toast]);

  const recent = notifications?.recent ?? [];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-16 items-center justify-between px-4">
          <BrandMark />
          {notifications ? (
            <NotificationBell
              unreadCount={unreadCount}
              isLive={isLive}
              recent={recent}
              side="right"
              align="start"
            />
          ) : null}
        </div>
        <Separator className="bg-border" />
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} unreadCount={unreadCount} />
        </div>
        <Separator className="bg-border" />
        <div className="p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-foreground">
              {adminName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {adminEmail}
            </p>
          </div>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open admin menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-border bg-card p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle>
                  <BrandMark />
                </SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <NavLinks
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <div className="mt-auto border-t border-border p-3">
                <div className="mb-2 px-3">
                  <p className="truncate text-sm font-medium">{adminName}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {adminEmail}
                  </p>
                </div>
                <form action={signOutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
          <BrandMark />
          {notifications ? (
            <div className="ml-auto">
              <NotificationBell
                unreadCount={unreadCount}
                isLive={isLive}
                recent={recent}
                side="bottom"
                align="end"
              />
            </div>
          ) : null}
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}