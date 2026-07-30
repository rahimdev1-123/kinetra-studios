import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Kinetra CRM — /admin middleware handler (Phase 1).
 *
 * This is intentionally NOT a `src/middleware.ts` file: it is a drop-in
 * handler that EXTENDS your existing middleware (CSP, rate limiting, etc.)
 * instead of replacing it. Wire it in like this:
 *
 *   // inside your existing src/middleware.ts
 *   import { adminMiddleware } from "@/lib/admin/admin-middleware";
 *
 *   export async function middleware(request: NextRequest) {
 *     const adminResponse = await adminMiddleware(request);
 *     const response = adminResponse ?? NextResponse.next();
 *     // ... your existing CSP / security-header logic applied to `response` ...
 *     return response;
 *   }
 *
 * and make sure your matcher also covers "/admin/:path*" (see
 * supabase/README.md for a full example, including a complete fallback
 * middleware for environments that don't have one yet).
 *
 * Behavior:
 *   - Non-/admin paths        → returns null (zero effect on the public site)
 *   - /admin, signed out      → redirect to /admin/login?next=…
 *   - /admin/login, signed in → redirect to /admin
 *   - Otherwise               → refreshes the Supabase session cookies
 *
 * Deep authorization (admin_users allowlist) is enforced server-side in the
 * admin layout via requireAdmin() — middleware stays fast and DB-free.
 */

export const ADMIN_PATH_PREFIX = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === ADMIN_PATH_PREFIX ||
    pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)
  );
}

export async function adminMiddleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    return null;
  }

  const { url, anonKey } = getPublicSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() validates the JWT against Supabase Auth and
  // refreshes expired sessions (via the setAll callback above).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = pathname === ADMIN_LOGIN_PATH;

  if (!user && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN_PATH;
    loginUrl.search = "";
    if (pathname !== ADMIN_PATH_PREFIX) {
      loginUrl.searchParams.set("next", pathname);
    }
    return withCookies(NextResponse.redirect(loginUrl), response);
  }

  if (user && isLoginRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = ADMIN_PATH_PREFIX;
    dashboardUrl.search = "";
    return withCookies(NextResponse.redirect(dashboardUrl), response);
  }

  return response;
}

/** Carry refreshed session cookies over to a redirect response. */
function withCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}