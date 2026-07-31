import "server-only";

import { z } from "zod";

import {
  fetchAnalyticsSummary,
  type AnalyticsSummary,
} from "@/lib/admin/analytics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/types/crm";

/**
 * Kinetra CRM — Executive dashboard data layer (Phase 7).
 *
 * Composes the EXISTING Phase 6 analytics fetchers for KPI windows (no
 * duplicate SQL — the same kinetra_analytics_summary RPC serves month/week/
 * today/all-time views), and adds the Phase 7 productivity queries: task
 * center RPC, follow-ups, my-leads, recent lead options, and the global
 * cross-table search. Every function assumes requireAdmin()/getAdminContext()
 * ran upstream, matching the Phase 3–6 pattern.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_TIME_FROM = "2000-01-01T00:00:00.000Z";

function endOfTodayExclusive(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
}

/* ─────────────────────────── Executive summary ─────────────────────────── */

export interface ExecutiveSummary {
  /** Month-to-date (UTC calendar month). */
  month: AnalyticsSummary;
  /** Rolling last 7 days. */
  week: AnalyticsSummary;
  /** Today (UTC). */
  today: AnalyticsSummary;
  /** Everything ever received. */
  allTime: AnalyticsSummary;
}

/**
 * Four windows, one existing RPC — reused, not duplicated.
 */
export async function fetchExecutiveSummary(): Promise<ExecutiveSummary> {
  const end = endOfTodayExclusive();
  const endIso = end.toISOString();

  const now = new Date();
  const monthStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const weekStartIso = new Date(end.getTime() - 7 * DAY_MS).toISOString();
  const todayStartIso = new Date(end.getTime() - DAY_MS).toISOString();

  const [month, week, today, allTime] = await Promise.all([
    fetchAnalyticsSummary(monthStartIso, endIso, "all"),
    fetchAnalyticsSummary(weekStartIso, endIso, "all"),
    fetchAnalyticsSummary(todayStartIso, endIso, "all"),
    fetchAnalyticsSummary(ALL_TIME_FROM, endIso, "all"),
  ]);

  return { month, week, today, allTime };
}

/* ───────────────────────────── Task center ─────────────────────────────── */

const taskLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  budget_range: z.string().nullable(),
  event_at: z.string(),
});

const taskCenterSchema = z.object({
  no_follow_up: z.array(taskLeadSchema),
  waiting_24h: z.array(taskLeadSchema),
  high_value: z.array(taskLeadSchema),
  recent_won: z.array(taskLeadSchema),
  recent_archived: z.array(taskLeadSchema),
});

export type TaskCenterLead = z.infer<typeof taskLeadSchema>;
export type TaskCenterData = z.infer<typeof taskCenterSchema>;

export async function fetchTaskCenter(
  limit = 4,
): Promise<TaskCenterData> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("kinetra_task_center", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to load task center: ${error.message}`);
  }

  return taskCenterSchema.parse(data);
}

/* ────────────────────────────── Follow-ups ─────────────────────────────── */

export interface FollowUpView {
  id: string;
  leadId: string;
  leadName: string;
  dueDate: string;
  notes: string | null;
  overdue: boolean;
}

export interface MyFollowUps {
  overdue: FollowUpView[];
  upcoming: FollowUpView[];
}

/** The signed-in admin's pending follow-ups, split overdue/upcoming. */
export async function fetchMyFollowUps(adminId: string): Promise<MyFollowUps> {
  const admin = createSupabaseAdminClient();

  const { data: tasks, error } = await admin
    .from("follow_up_tasks")
    .select("id, lead_id, due_date, notes")
    .eq("admin_id", adminId)
    .eq("completed", false)
    .order("due_date", { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(`Failed to load follow-ups: ${error.message}`);
  }

  const rows = tasks ?? [];
  if (rows.length === 0) return { overdue: [], upcoming: [] };

  const leadIds = [...new Set(rows.map((t) => t.lead_id))];
  const { data: leads, error: leadsError } = await admin
    .from("leads")
    .select("id, name")
    .in("id", leadIds);

  if (leadsError) {
    throw new Error(`Failed to resolve follow-up leads: ${leadsError.message}`);
  }

  const nameById = new Map((leads ?? []).map((l) => [l.id, l.name]));
  const now = Date.now();

  const views: FollowUpView[] = rows.map((t) => ({
    id: t.id,
    leadId: t.lead_id,
    leadName: nameById.get(t.lead_id) ?? "Unknown lead",
    dueDate: t.due_date,
    notes: t.notes,
    overdue: new Date(t.due_date).getTime() < now,
  }));

  return {
    overdue: views.filter((v) => v.overdue),
    upcoming: views.filter((v) => !v.overdue),
  };
}

/* ─────────────────────────────── My leads ──────────────────────────────── */

/** Active leads assigned to the signed-in admin, newest first. */
export async function fetchMyLeads(
  adminId: string,
  limit = 6,
): Promise<Lead[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .select("*")
    .eq("assigned_to", adminId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load assigned leads: ${error.message}`);
  }

  return data ?? [];
}

/* ─────────────────────────── Recent lead options ───────────────────────── */

export interface LeadOption {
  id: string;
  name: string;
  email: string;
}

/** Recent active leads for pickers (e.g. the Compose Email quick action). */
export async function fetchRecentLeadOptions(
  limit = 20,
): Promise<LeadOption[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("leads")
    .select("id, name, email")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin/dashboard] lead options failed:", error.message);
    return [];
  }

  return data ?? [];
}

/* ────────────────────────────── Global search ──────────────────────────── */

export interface SearchLeadHit {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface SearchLinkedHit {
  id: string;
  leadId: string;
  leadName: string;
  excerpt: string;
}

export interface CrmSearchResults {
  leads: SearchLeadHit[];
  emails: SearchLinkedHit[];
  notes: SearchLinkedHit[];
  activities: SearchLinkedHit[];
}

const SEARCH_GROUP_LIMIT = 5;

/** Escape a term for PostgREST or(...ilike...) filters (Phase 3 pattern). */
function sanitizeSearchTerm(q: string): string {
  return q
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .trim();
}

function excerpt(value: string | null, max = 80): string {
  const s = (value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Cross-table ilike search over leads, emails, notes, and activities. */
export async function searchCrm(query: string): Promise<CrmSearchResults> {
  const term = sanitizeSearchTerm(query);
  if (term.length < 2) {
    return { leads: [], emails: [], notes: [], activities: [] };
  }

  const admin = createSupabaseAdminClient();
  const pattern = `*${term}*`;

  const [leadsRes, emailsRes, notesRes, activitiesRes] = await Promise.all([
    admin
      .from("leads")
      .select("id, name, email, status")
      .or(
        `name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`,
      )
      .order("created_at", { ascending: false })
      .limit(SEARCH_GROUP_LIMIT),
    admin
      .from("lead_emails")
      .select("id, lead_id, subject")
      .or(`subject.ilike.${pattern},body.ilike.${pattern}`)
      .order("sent_at", { ascending: false })
      .limit(SEARCH_GROUP_LIMIT),
    admin
      .from("lead_notes")
      .select("id, lead_id, body")
      .ilike("body", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(SEARCH_GROUP_LIMIT),
    admin
      .from("lead_activities")
      .select("id, lead_id, type, payload")
      .or(
        `payload->>excerpt.ilike.${pattern},payload->>subject.ilike.${pattern}`,
      )
      .order("created_at", { ascending: false })
      .limit(SEARCH_GROUP_LIMIT),
  ]);

  for (const res of [leadsRes, emailsRes, notesRes, activitiesRes]) {
    if (res.error) {
      throw new Error(`Search failed: ${res.error.message}`);
    }
  }

  const leads = leadsRes.data ?? [];
  const emails = emailsRes.data ?? [];
  const notes = notesRes.data ?? [];
  const activities = activitiesRes.data ?? [];

  // Resolve lead names for linked hits in one query.
  const linkedIds = [
    ...new Set([
      ...emails.map((e) => e.lead_id),
      ...notes.map((n) => n.lead_id),
      ...activities.map((a) => a.lead_id),
    ]),
  ];

  const nameById = new Map<string, string>(
    leads.map((l) => [l.id, l.name]),
  );

  const unresolved = linkedIds.filter((id) => !nameById.has(id));
  if (unresolved.length > 0) {
    const { data: linkedLeads } = await admin
      .from("leads")
      .select("id, name")
      .in("id", unresolved);
    for (const l of linkedLeads ?? []) {
      nameById.set(l.id, l.name);
    }
  }

  const leadName = (id: string) => nameById.get(id) ?? "Unknown lead";

  return {
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      status: l.status,
    })),
    emails: emails.map((e) => ({
      id: e.id,
      leadId: e.lead_id,
      leadName: leadName(e.lead_id),
      excerpt: excerpt(e.subject),
    })),
    notes: notes.map((n) => ({
      id: n.id,
      leadId: n.lead_id,
      leadName: leadName(n.lead_id),
      excerpt: excerpt(n.body),
    })),
    activities: activities.map((a) => {
      const payload = a.payload;
      const detail =
        payload !== null && typeof payload === "object" && !Array.isArray(payload)
          ? ((payload.excerpt ?? payload.subject) as string | undefined)
          : undefined;
      return {
        id: a.id,
        leadId: a.lead_id,
        leadName: leadName(a.lead_id),
        excerpt: excerpt(detail ?? a.type.replaceAll("_", " ")),
      };
    }),
  };
}