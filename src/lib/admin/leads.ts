import "server-only";

import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLeadStatus, type Lead, type LeadStatus } from "@/types/crm";

/**
 * Kinetra CRM — Leads data layer (Phase 3).
 *
 * Server-only query + URL-param utilities for /admin/leads. Every function
 * assumes the caller has already been authorized via requireAdmin() (done in
 * the (dashboard) layout and re-checked in pages/actions).
 */

export const LEADS_PAGE_SIZE = 10;

export const LEAD_SORTS = ["newest", "oldest", "name"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export const LEAD_ARCHIVE_FILTERS = ["active", "archived", "all"] as const;
export type LeadArchiveFilter = (typeof LEAD_ARCHIVE_FILTERS)[number];

export interface LeadListParams {
  /** Search term matched against name, email, and company. */
  q: string;
  status: LeadStatus | "all";
  service: string | "all";
  budget: string | "all";
  /** ISO date (yyyy-mm-dd) lower bound on created_at, inclusive. */
  from: string;
  /** ISO date (yyyy-mm-dd) upper bound on created_at, inclusive. */
  to: string;
  archived: LeadArchiveFilter;
  sort: LeadSort;
  page: number;
}

export interface LeadListResult {
  leads: Lead[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  /** 1-based index of the first row shown, 0 when empty. */
  rangeStart: number;
  /** 1-based index of the last row shown, 0 when empty. */
  rangeEnd: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse and clamp raw searchParams into a safe, typed param object. */
export function parseLeadListParams(
  searchParams: Record<string, string | string[] | undefined>,
): LeadListParams {
  const rawStatus = first(searchParams.status);
  const rawService = first(searchParams.service)?.trim() ?? "";
  const rawBudget = first(searchParams.budget)?.trim() ?? "";
  const rawFrom = first(searchParams.from) ?? "";
  const rawTo = first(searchParams.to) ?? "";
  const rawArchived = first(searchParams.archived);
  const rawSort = first(searchParams.sort);
  const rawPage = Number.parseInt(first(searchParams.page) ?? "1", 10);

  return {
    q: (first(searchParams.q) ?? "").trim().slice(0, 200),
    status: isLeadStatus(rawStatus) ? rawStatus : "all",
    service:
      rawService && rawService !== "all" ? rawService.slice(0, 100) : "all",
    budget:
      rawBudget && rawBudget !== "all" ? rawBudget.slice(0, 100) : "all",
    from: DATE_RE.test(rawFrom) ? rawFrom : "",
    to: DATE_RE.test(rawTo) ? rawTo : "",
    archived: (LEAD_ARCHIVE_FILTERS as readonly string[]).includes(
      rawArchived ?? "",
    )
      ? (rawArchived as LeadArchiveFilter)
      : "active",
    sort: (LEAD_SORTS as readonly string[]).includes(rawSort ?? "")
      ? (rawSort as LeadSort)
      : "newest",
    page:
      Number.isFinite(rawPage) && rawPage >= 1
        ? Math.min(rawPage, 10_000)
        : 1,
  };
}

/** True when any non-default search/filter is active (used by empty state). */
export function hasActiveLeadFilters(params: LeadListParams): boolean {
  return (
    params.q !== "" ||
    params.status !== "all" ||
    params.service !== "all" ||
    params.budget !== "all" ||
    params.from !== "" ||
    params.to !== "" ||
    params.archived !== "active"
  );
}

/**
 * Escape a search term for use inside a PostgREST `or=(...ilike...)` filter:
 * strips the syntax characters (commas/parens) and escapes SQL wildcards.
 */
function sanitizeSearchTerm(q: string): string {
  return q
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}

/** Exclusive upper bound: midnight UTC of the day AFTER `date`. */
function nextDayIso(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  return new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function buildLeadsQuery(params: LeadListParams) {
  const admin = createSupabaseAdminClient();

  let query = admin.from("leads").select("*", { count: "exact" });

  if (params.archived === "active") {
    query = query.is("archived_at", null);
  } else if (params.archived === "archived") {
    query = query.not("archived_at", "is", null);
  }

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.service !== "all") {
    query = query.eq("project_type", params.service);
  }

  if (params.budget !== "all") {
    query = query.eq("budget_range", params.budget);
  }

  if (params.from) {
    query = query.gte("created_at", `${params.from}T00:00:00.000Z`);
  }

  if (params.to) {
    query = query.lt("created_at", nextDayIso(params.to));
  }

  const term = sanitizeSearchTerm(params.q);
  if (term) {
    query = query.or(
      `name.ilike.*${term}*,email.ilike.*${term}*,company.ilike.*${term}*`,
    );
  }

  switch (params.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name":
      query = query
        .order("name", { ascending: true })
        .order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  return query;
}

/**
 * Fetch one page of leads plus the exact total for pagination.
 * If the requested page is beyond the last page (stale URL, deleted rows),
 * transparently retries on page 1 instead of erroring.
 */
export async function fetchLeads(
  params: LeadListParams,
): Promise<LeadListResult> {
  const rangeFrom = (params.page - 1) * LEADS_PAGE_SIZE;
  const rangeTo = rangeFrom + LEADS_PAGE_SIZE - 1;

  const { data, count, error } = await buildLeadsQuery(params).range(
    rangeFrom,
    rangeTo,
  );

  if (error) {
    // PGRST103 = requested range not satisfiable (page beyond the end).
    if (error.code === "PGRST103" && params.page > 1) {
      return fetchLeads({ ...params, page: 1 });
    }
    throw new Error(`Failed to load leads: ${error.message}`);
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const leads = data ?? [];

  return {
    leads,
    total,
    page: params.page,
    pageCount,
    pageSize: LEADS_PAGE_SIZE,
    rangeStart: total === 0 ? 0 : rangeFrom + 1,
    rangeEnd: total === 0 ? 0 : rangeFrom + leads.length,
  };
}

export interface LeadFilterOptions {
  services: string[];
  budgets: string[];
}

/**
 * Distinct service + budget values observed in the data, for filter menus.
 * Derived from the DB (not hardcoded) so options never drift from reality.
 * Wrapped in React cache() to dedupe within a single render pass.
 */
export const fetchLeadFilterOptions = cache(
  async (): Promise<LeadFilterOptions> => {
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("leads")
      .select("project_type, budget_range")
      .limit(1000);

    if (error) {
      // Filters are non-critical chrome — degrade to empty menus.
      console.error("[admin/leads] filter options failed:", error.message);
      return { services: [], budgets: [] };
    }

    const services = new Set<string>();
    const budgets = new Set<string>();

    for (const row of data ?? []) {
      if (row.project_type) services.add(row.project_type);
      if (row.budget_range) budgets.add(row.budget_range);
    }

    return {
      services: [...services].sort((a, b) => a.localeCompare(b)),
      budgets: [...budgets].sort((a, b) => a.localeCompare(b)),
    };
  },
);

/** Single lead by id (View action / Phase 4 details). Null when absent. */
export const fetchLeadById = cache(
  async (id: string): Promise<Lead | null> => {
    if (!id || id.length > 100) return null;

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      // Malformed ids (non-uuid) surface as query errors — treat as not found.
      console.error("[admin/leads] fetchLeadById failed:", error.message);
      return null;
    }

    return data;
  },
);

/** Human label for a lead source value. */
export function formatLeadSource(source: string | null | undefined): string {
  if (!source || source === "website") return "Website form";
  return source.charAt(0).toUpperCase() + source.slice(1);
}