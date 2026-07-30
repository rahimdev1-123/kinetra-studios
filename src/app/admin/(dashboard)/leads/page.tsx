import type { Metadata } from "next";
import { Suspense } from "react";

import { LeadEmptyState } from "@/components/admin/leads/lead-empty-state";
import { LeadFilters } from "@/components/admin/leads/lead-filters";
import { LeadPagination } from "@/components/admin/leads/lead-pagination";
import { LeadSearch } from "@/components/admin/leads/lead-search";
import { LeadTable } from "@/components/admin/leads/lead-table";
import { LeadsTableSkeleton } from "@/components/admin/leads/leads-skeleton";
import { requireAdmin } from "@/lib/admin/auth";
import {
  fetchLeadFilterOptions,
  fetchLeads,
  hasActiveLeadFilters,
  parseLeadListParams,
  type LeadListParams,
} from "@/lib/admin/leads";

/**
 * Kinetra CRM — /admin/leads (Phase 3).
 *
 * Server component. All list state (search, filters, sort, page) lives in
 * the URL; the table section streams inside a keyed Suspense boundary so
 * every state change swaps in a skeleton instead of blocking the page.
 */

export const metadata: Metadata = {
  title: "Leads",
};

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function LeadsTableSection({ params }: { params: LeadListParams }) {
  const result = await fetchLeads(params);
  const hasFilters = hasActiveLeadFilters(params);

  if (result.total === 0) {
    return <LeadEmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <LeadTable leads={result.leads} />
      <LeadPagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        rangeStart={result.rangeStart}
        rangeEnd={result.rangeEnd}
      />
    </div>
  );
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  await requireAdmin();

  const params = parseLeadListParams(await searchParams);
  const { services, budgets } = await fetchLeadFilterOptions();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          Leads
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Lead management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every inquiry from the contact form — search, filter, and work the
          pipeline.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <LeadSearch defaultValue={params.q} />
        <LeadFilters
          status={params.status}
          service={params.service}
          budget={params.budget}
          archived={params.archived}
          from={params.from}
          to={params.to}
          sort={params.sort}
          services={services}
          budgets={budgets}
          hasActiveFilters={hasActiveLeadFilters(params)}
        />
      </div>

      <Suspense key={JSON.stringify(params)} fallback={<LeadsTableSkeleton />}>
        <LeadsTableSection params={params} />
      </Suspense>
    </div>
  );
}