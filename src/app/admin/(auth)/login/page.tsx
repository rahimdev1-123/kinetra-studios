import type { Metadata } from "next";

import { LoginForm } from "./login-form";

/**
 * Kinetra CRM — /admin/login (Phase 1).
 * Lives in the (auth) route group so it is NOT wrapped by the guarded
 * (dashboard) layout. Middleware redirects signed-in admins away from here.
 */

export const metadata: Metadata = {
  title: "Admin sign in — Kinetra",
  robots: { index: false, follow: false },
};

interface AdminLoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { next } = await searchParams;

  const safeNext =
    next && next.startsWith("/admin") && !next.startsWith("//")
      ? next
      : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="font-display text-3xl font-extrabold tracking-wide text-foreground">
            KINETRA
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Admin access
          </span>
        </div>

        <LoginForm next={safeNext} />

        <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
          Restricted area. Authorized team members only.
        </p>
      </div>
    </main>
  );
}