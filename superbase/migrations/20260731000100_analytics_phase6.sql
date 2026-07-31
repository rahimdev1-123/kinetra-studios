-- ============================================================================
-- Kinetra CRM · Phase 6 · Migration 7 — Analytics & Business Intelligence
-- ----------------------------------------------------------------------------
-- Fully idempotent and additive, like migrations 1–6. Safe to re-run.
-- No tables are created or modified — analytics is computed from the existing
-- schema with set-based SQL functions (called via RPC), so metrics are
-- aggregated in PostgreSQL, never by fetching raw rows into JS.
--
-- Adds:
--   1. kinetra_budget_value(text)        — parses budget_range strings
--      ("$1,000 – $2,500", "5k-10k", "Under $500") into an estimated numeric
--      midpoint. Powers the revenue estimates.
--   2. kinetra_analytics_summary(...)    — KPI jsonb: totals, conversion
--      rate, active projects, estimated revenue/pipeline, avg first-response
--      time (from lead_activities), avg time-to-conversion.
--   3. kinetra_analytics_breakdowns(...) — status/source/revenue-by-status
--      maps + pipeline funnel (leads at-or-beyond each stage).
--   4. kinetra_analytics_trend(...)      — zero-filled day/week/month lead
--      + won series via generate_series.
--   5. kinetra_analytics_heatmap(...)    — activity counts by day-of-week ×
--      hour from lead_activities.
--   6. Guarded: adds public.leads to the supabase_realtime publication so
--      the dashboard can subscribe to live changes (no-op if already added
--      or if the publication doesn't exist).
--
-- Security: EXECUTE is revoked from anon/authenticated — these functions are
-- called exclusively through the server-side service-role client after
-- requireAdmin()/getAdminContext() checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Preconditions
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.leads') is null
     or to_regclass('public.lead_activities') is null then
    raise exception
      'Kinetra CRM: run migrations 1-6 first — leads / lead_activities are missing.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Budget text → estimated numeric value.
--    Extracts every numeric token (with optional k/K multiplier) and averages
--    them, so a range becomes its midpoint and a single figure stands alone.
--    Returns 0 for null/non-numeric values.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_budget_value(p_budget text)
returns numeric
language sql
immutable
as $$
  select coalesce(
    avg(
      (replace(m[1], ',', ''))::numeric
      * case when m[2] is not null then 1000 else 1 end
    ),
    0
  )
  from regexp_matches(
    coalesce(p_budget, ''),
    '(\d[\d,]*(?:\.\d+)?)\s*([kK])?',
    'g'
  ) as m;
$$;

-- ----------------------------------------------------------------------------
-- 2. KPI summary for a date range (+ optional source filter).
--    Metric definitions (documented for the UI):
--      * conversion_rate   — % of leads received in range currently 'won'
--      * active_projects   — 'won' leads in range that are not archived
--      * est_revenue_won   — Σ budget midpoints of 'won' leads
--      * est_pipeline_value— Σ budget midpoints of open leads (not lost /
--                            not archived)
--      * avg_response_hours— avg(first admin-attributed activity − created)
--      * avg_conversion_days — avg(first status change to 'won' − created)
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_analytics_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_source text default null
)
returns jsonb
language sql
stable
as $$
  with range_leads as (
    select *
    from public.leads l
    where l.created_at >= p_from
      and l.created_at < p_to
      and (p_source is null or l.source = p_source)
  ),
  first_touch as (
    select a.lead_id, min(a.created_at) as first_action_at
    from public.lead_activities a
    join range_leads rl on rl.id = a.lead_id
    where a.actor_id is not null
    group by a.lead_id
  ),
  won_time as (
    select a.lead_id, min(a.created_at) as won_at
    from public.lead_activities a
    join range_leads rl on rl.id = a.lead_id
    where a.type = 'status_changed'
      and a.payload->>'to' = 'won'
    group by a.lead_id
  )
  select jsonb_build_object(
    'total_leads',
      (select count(*) from range_leads),
    'won_leads',
      (select count(*) from range_leads where status = 'won'),
    'lost_leads',
      (select count(*) from range_leads where status = 'lost'),
    'active_projects',
      (select count(*) from range_leads
        where status = 'won' and archived_at is null),
    'conversion_rate',
      case
        when (select count(*) from range_leads) = 0 then 0
        else round(
          (select count(*) from range_leads where status = 'won')::numeric
          / (select count(*) from range_leads) * 100,
          1
        )
      end,
    'est_revenue_won',
      coalesce(
        (select round(sum(public.kinetra_budget_value(budget_range)))
         from range_leads where status = 'won'),
        0
      ),
    'est_pipeline_value',
      coalesce(
        (select round(sum(public.kinetra_budget_value(budget_range)))
         from range_leads
         where status <> 'lost' and archived_at is null),
        0
      ),
    'avg_response_hours',
      coalesce(
        (select round(
           (avg(extract(epoch from ft.first_action_at - rl.created_at)) / 3600)::numeric,
           1
         )
         from first_touch ft
         join range_leads rl on rl.id = ft.lead_id),
        0
      ),
    'avg_conversion_days',
      coalesce(
        (select round(
           (avg(extract(epoch from wt.won_at - rl.created_at)) / 86400)::numeric,
           1
         )
         from won_time wt
         join range_leads rl on rl.id = wt.lead_id),
        0
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Chart breakdowns: status / source / revenue-by-status maps + funnel.
--    Funnel counts leads currently AT or BEYOND each pipeline stage
--    (new → contacted → qualified → proposal → won); 'lost' is excluded
--    from the funnel and reported via status_counts.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_analytics_breakdowns(
  p_from timestamptz,
  p_to timestamptz,
  p_source text default null
)
returns jsonb
language sql
stable
as $$
  with range_leads as (
    select *,
      case status
        when 'new' then 1
        when 'contacted' then 2
        when 'qualified' then 3
        when 'proposal' then 4
        when 'won' then 5
        else 0
      end as stage_ord
    from public.leads l
    where l.created_at >= p_from
      and l.created_at < p_to
      and (p_source is null or l.source = p_source)
  )
  select jsonb_build_object(
    'status_counts',
      coalesce(
        (select jsonb_object_agg(status, cnt)
         from (select status, count(*) as cnt from range_leads group by status) s),
        '{}'::jsonb
      ),
    'source_counts',
      coalesce(
        (select jsonb_object_agg(source, cnt)
         from (select source, count(*) as cnt from range_leads group by source) s),
        '{}'::jsonb
      ),
    'revenue_by_status',
      coalesce(
        (select jsonb_object_agg(status, val)
         from (
           select status,
                  round(sum(public.kinetra_budget_value(budget_range))) as val
           from range_leads
           group by status
         ) s),
        '{}'::jsonb
      ),
    'funnel',
      (select jsonb_build_object(
         'new',       count(*) filter (where stage_ord >= 1),
         'contacted', count(*) filter (where stage_ord >= 2),
         'qualified', count(*) filter (where stage_ord >= 3),
         'proposal',  count(*) filter (where stage_ord >= 4),
         'won',       count(*) filter (where stage_ord >= 5)
       )
       from range_leads)
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. Lead trend: zero-filled buckets (day / week / month) of received + won.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_analytics_trend(
  p_from timestamptz,
  p_to timestamptz,
  p_source text default null,
  p_bucket text default 'day'
)
returns table (
  bucket_start timestamptz,
  lead_count bigint,
  won_count bigint
)
language sql
stable
as $$
  with unit as (
    select case
      when p_bucket in ('day', 'week', 'month') then p_bucket
      else 'day'
    end as u
  ),
  buckets as (
    select generate_series(
      date_trunc((select u from unit), p_from),
      p_to,
      case (select u from unit)
        when 'week' then interval '1 week'
        when 'month' then interval '1 month'
        else interval '1 day'
      end
    ) as b
  )
  select
    b.b as bucket_start,
    count(l.id) as lead_count,
    count(l.id) filter (where l.status = 'won') as won_count
  from buckets b
  left join public.leads l
    on date_trunc((select u from unit), l.created_at) = b.b
   and l.created_at >= p_from
   and l.created_at < p_to
   and (p_source is null or l.source = p_source)
  group by b.b
  order by b.b;
$$;

-- ----------------------------------------------------------------------------
-- 5. Activity heatmap: lead_activities count by day-of-week (0=Sun) × hour.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_analytics_heatmap(
  p_from timestamptz,
  p_to timestamptz,
  p_source text default null
)
returns table (
  dow integer,
  hour integer,
  activity_count bigint
)
language sql
stable
as $$
  select
    extract(dow from a.created_at)::integer as dow,
    extract(hour from a.created_at)::integer as hour,
    count(*) as activity_count
  from public.lead_activities a
  join public.leads l on l.id = a.lead_id
  where a.created_at >= p_from
    and a.created_at < p_to
    and (p_source is null or l.source = p_source)
  group by 1, 2;
$$;

-- ----------------------------------------------------------------------------
-- 6. Lock down: server-side (service role) use only.
-- ----------------------------------------------------------------------------
revoke execute on function public.kinetra_budget_value(text) from public, anon, authenticated;
revoke execute on function public.kinetra_analytics_summary(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.kinetra_analytics_breakdowns(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.kinetra_analytics_trend(timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.kinetra_analytics_heatmap(timestamptz, timestamptz, text) from public, anon, authenticated;

grant execute on function public.kinetra_budget_value(text) to service_role;
grant execute on function public.kinetra_analytics_summary(timestamptz, timestamptz, text) to service_role;
grant execute on function public.kinetra_analytics_breakdowns(timestamptz, timestamptz, text) to service_role;
grant execute on function public.kinetra_analytics_trend(timestamptz, timestamptz, text, text) to service_role;
grant execute on function public.kinetra_analytics_heatmap(timestamptz, timestamptz, text) to service_role;

-- ----------------------------------------------------------------------------
-- 7. Realtime: publish leads changes for the live dashboard (guarded no-op
--    if already published or if the publication doesn't exist).
--    RLS still applies to subscribers — only allowlisted admins receive rows.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'leads'
     ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;