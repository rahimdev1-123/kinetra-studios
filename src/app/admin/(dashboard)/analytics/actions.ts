"use server";

import { z } from "zod";

import { getAdminContext } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Kinetra CRM — Analytics export server action (Phase 6).
 *
 * Generates the filtered leads dataset as CSV entirely on the server (after
 * verifying the admin session), and returns it to the client, which saves it
 * as a file via a Blob. Note: Server Actions return serialized payloads
 * rather than raw HTTP streams — for the capped dataset size (5,000 rows)
 * this is equivalent in practice and keeps the export behind the same
 * auth/session machinery as every other admin mutation.
 */

const exportInputSchema = z.object({
  fromIso: z.string().datetime({ offset: true }).or(z.string().datetime()),
  toIso: z.string().datetime({ offset: true }).or(z.string().datetime()),
  source: z.string().trim().max(100),
});

export type ExportAnalyticsInput = z.infer<typeof exportInputSchema>;

export type ExportAnalyticsResult =
  | { ok: true; filename: string; csv: string; rowCount: number }
  | { ok: false; error: string };

const EXPORT_ROW_CAP = 5000;

const CSV_HEADERS = [
  "id",
  "name",
  "email",
  "company",
  "service_requested",
  "budget_range",
  "status",
  "source",
  "created_at",
  "status_changed_at",
  "archived_at",
] as const;

/** RFC-4180 escaping: quote fields containing commas, quotes, or newlines. */
function csvField(value: string | null): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export async function exportAnalyticsCsvAction(
  input: ExportAnalyticsInput,
): Promise<ExportAnalyticsResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ok: false, error: "Not authorized." };
  }

  const parsed = exportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid export range." };
  }

  const { fromIso, toIso, source } = parsed.data;

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("leads")
    .select(
      "id, name, email, company, project_type, budget_range, status, source, created_at, status_changed_at, archived_at",
    )
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: true })
    .limit(EXPORT_ROW_CAP);

  if (source && source !== "all") {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/analytics] export failed:", error.message);
    return { ok: false, error: "Couldn't generate the export. Try again." };
  }

  const rows = data ?? [];

  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((lead) =>
      [
        csvField(lead.id),
        csvField(lead.name),
        csvField(lead.email),
        csvField(lead.company),
        csvField(lead.project_type),
        csvField(lead.budget_range),
        csvField(lead.status),
        csvField(lead.source),
        csvField(lead.created_at),
        csvField(lead.status_changed_at),
        csvField(lead.archived_at),
      ].join(","),
    ),
  ];

  const fromTag = fromIso.slice(0, 10);
  const toTag = toIso.slice(0, 10);

  return {
    ok: true,
    filename: `kinetra-leads-${fromTag}_${toTag}.csv`,
    csv: lines.join("\r\n"),
    rowCount: rows.length,
  };
}