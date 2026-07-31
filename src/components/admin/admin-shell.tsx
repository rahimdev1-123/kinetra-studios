"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

/**
 * Kinetra CRM — admin app shell (Phase 1).
 *
 * Self-contained sidebar + header built only on primitives that already
 * exist in src/components/ui and the design tokens already defined in
 * globals.css — no changes to public styles, no new CSS variables.
 * Later phases enable the remaining navigation entries.
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
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    disabled: true,
    comingSoon: "Phase 6",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    disabled: true,
    comingSoon: "Phase 6",
  },
];

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  signOutAction: () => Promise<void>;
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
  onNavigate,
}: {
  pathname: string;
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
            <span>{item.title}</span>
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
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-16 items-center px-4">
          <BrandMark />
        </div>
        <Separator className="bg-border" />
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} />
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
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}