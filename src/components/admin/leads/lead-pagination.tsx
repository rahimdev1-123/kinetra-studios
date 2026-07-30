"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useLeadsUrl } from "./use-leads-url";

/**
 * Kinetra CRM — leads pagination (Phase 3).
 *
 * Link-based (URL `page` param) so pages are bookmarkable and work without
 * JS once rendered. Preserves every active search/filter/sort param.
 */

interface LeadPaginationProps {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
}

/** Windowed page list: 1 … (p-1) p (p+1) … last, with `null` = ellipsis. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([
    1,
    pageCount,
    page - 1,
    page,
    page + 1,
  ]);

  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}

export function LeadPagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
}: LeadPaginationProps) {
  const { buildHref } = useLeadsUrl();

  const href = (p: number) =>
    buildHref({ page: p <= 1 ? null : String(p) }, { resetPage: false });

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {total === 0
          ? "0 leads"
          : `Showing ${rangeStart}–${rangeEnd} of ${total} lead${total === 1 ? "" : "s"}`}
      </p>

      {pageCount > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={prevDisabled ? "#" : href(page - 1)}
                aria-disabled={prevDisabled}
                tabIndex={prevDisabled ? -1 : undefined}
                className={cn(
                  prevDisabled && "pointer-events-none opacity-40",
                )}
              />
            </PaginationItem>

            {pageWindow(page, pageCount).map((p, i) =>
              p === null ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={href(p)}
                    isActive={p === page}
                    aria-label={`Go to page ${p}`}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href={nextDisabled ? "#" : href(page + 1)}
                aria-disabled={nextDisabled}
                tabIndex={nextDisabled ? -1 : undefined}
                className={cn(
                  nextDisabled && "pointer-events-none opacity-40",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}