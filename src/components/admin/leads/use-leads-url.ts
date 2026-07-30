"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Kinetra CRM — URL state for the leads list (Phase 3).
 *
 * All search/filter/sort/pagination state lives in the URL, so views are
 * shareable/bookmarkable and the server component re-queries on change.
 * This hook centralizes query-string updates for every toolbar control.
 */

export type LeadsUrlUpdates = Record<string, string | null>;

export function useLeadsUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /** Build an href with the given param changes (null/"" deletes a param). */
  const buildHref = useCallback(
    (updates: LeadsUrlUpdates, { resetPage = true } = {}): string => {
      const next = new URLSearchParams(searchParams.toString());

      if (resetPage) {
        next.delete("page");
      }

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, searchParams],
  );

  /** Apply param changes via history replace (no scroll jump). */
  const update = useCallback(
    (updates: LeadsUrlUpdates, opts?: { resetPage?: boolean }) => {
      const href = buildHref(updates, opts);
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [buildHref, router],
  );

  return { update, buildHref, searchParams, pathname, isPending };
}
