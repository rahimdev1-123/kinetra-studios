-- ============================================================================
-- Kinetra CRM · Phase 7 · Migration 8 — Dashboard modernization + productivity
-- ----------------------------------------------------------------------------
-- Fully idempotent and additive, like migrations 1–7. Safe to re-run.
--
-- Adds:
--   1. leads.assigned_to — lead ownership (references admin_users), powering
--      assignment + the "My Leads" dashboard widget.
--   2. follow_up_tasks — lightweight follow-up/reminder system
--      (lead_id, admin_id, due_date, completed, notes) with RLS.
--   3. kinetra_analytics_trend — RECREATED with an extra won_value column
--      (estimated revenue of won leads per bucket) to power the dashboard
--      revenue sparkline. Backward compatible: existing callers read named
--      fields and simply ignore the new one.
--   4. kinetra_task_center(p_limit) — one aggregated jsonb payload for the
--      Task Center widget: leads without follow-up, waiting >24h, high
--      value (by kinetra_budget_value), recently won, recently archived.
--   5. Guarded: adds lead_activities to the supabase_realtime publication so
--      the dashboard's live feed refreshes on note/email/status events too.
--
-- Security: new/recreated functions are EXECUTE-revoked from anon and
-- authenticated — they are called exclusively through the server-side
-- service-role client after requireAdmin()/getAdminContext() checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Preconditions
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.leads') is null
     or to_regclass('public.lead_activities') is null
     or to_regclass('public.admin_users') is null then
    raise exception
      'Kinetra CRM: run migrations 1-7 first — leads / lead_activities / admin_users are missing.';
  end if;

  if to_regprocedure('public.kinetra_budget_value(text)') is null then
    raise exception
      'Kinetra CRM: kinetra_budget_value() is missing — run migration 7 first.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Lead assignment
-- ----------------------------------------------------------------------------
alter table public.leads add column if not exists assigned_to uuid
  references public.admin_users (id) on delete set null;

comment on column public.leads.assigned_to is
  'Kinetra CRM: admin who owns this lead. NULL = unassigned.';

create index if not exists kinetra_leads_assigned_idx
  on public.leads (assigned_to)
  where archived_at is null;

-- ----------------------------------------------------------------------------
-- 2. Follow-up tasks (lead_id type-matched to the live leads.id, like
--    migrations 3 and 6)
-- ----------------------------------------------------------------------------
do $$
declare
  v_leads_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into v_leads_id_type
  from pg_attribute a
  where a.attrelid = 'public.leads'::regclass
    and a.attname = 'id'
    and not a.attisdropped;

  if v_leads_id_type is null then
    raise exception 'public.leads.id not found.';
  end if;

  execute format($sql$
    create table if not exists public.follow_up_tasks (
      id           uuid primary key default gen_random_uuid(),
      lead_id      %1$s not null references public.leads (id) on delete cascade,
      admin_id     uuid not null references public.admin_users (id) on delete cascade,
      due_date     timestamptz not null,
      completed    boolean not null default false,
      completed_at timestamptz,
      notes        text,
      created_at   timestamptz not null default now()
    )
  $sql$, v_leads_id_type);
end $$;

comment on table public.follow_up_tasks is
  'Kinetra CRM: lightweight follow-up reminders per lead, owned by an admin (Phase 7).';

create index if not exists kinetra_follow_ups_admin_idx
  on public.follow_up_tasks (admin_id, completed, due_date);

create index if not exists kinetra_follow_ups_lead_idx
  on public.follow_up_tasks (lead_id, completed);

alter table public.follow_up_tasks enable row level security;

drop policy if exists kinetra_admins_select_follow_ups on public.follow_up_tasks;
create policy kinetra_admins_select_follow_ups
  on public.follow_up_tasks for select to authenticated
  using (public.kinetra_is_admin());

drop policy if exists kinetra_admins_insert_follow_ups on public.follow_up_tasks;
create policy kinetra_admins_insert_follow_ups
  on public.follow_up_tasks for insert to authenticated
  with check (public.kinetra_is_admin() and admin_id = auth.uid());

drop policy if exists kinetra_admins_update_follow_ups on public.follow_up_tasks;
create policy kinetra_admins_update_follow_ups
  on public.follow_up_tasks for update to authenticated
  using (public.kinetra_is_admin())
  with check (public.kinetra_is_admin());

drop policy if exists kinetra_owners_delete_follow_ups on public.follow_up_tasks;
create policy kinetra_owners_delete_follow_ups
  on public.follow_up_tasks for delete to authenticated
  using (public.kinetra_is_admin() and admin_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Recreate the trend function with won_value (revenue sparkline).
--    DROP is required because the OUT row type changes; the replacement is a
--    superset, so Phase 6 callers keep working unchanged.
-- ----------------------------------------------------------------------------
drop function if exists public.kinetra_analytics_trend(timestamptz, timestamptz, text, text);

create or replace function public.kinetra_analytics_trend(
  p_from timestamptz,
  p_to timestamptz,
  p_source text default null,
  p_bucket text default 'day'
)
returns table (
  bucket_start timestamptz,
  lead_count bigint,
  won_count bigint,
  won_value numeric
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
    count(l.id) filter (where l.status = 'won') as won_count,
    coalesce(
      round(
        sum(public.kinetra_budget_value(l.budget_range))
          filter (where l.status = 'won')
      ),
      0
    ) as won_value
  from buckets b
  left join public.leads l
    on date_trunc((select u from unit), l.created_at) = b.b
   and l.created_at >= p_from
   and l.created_at < p_to
   and (p_source is null or l.source = p_source)
  group by b.b
  order by b.b;
$$;

revoke execute on function public.kinetra_analytics_trend(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.kinetra_analytics_trend(timestamptz, timestamptz, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- 4. Task Center aggregation — one round trip for all five buckets.
--    Bucket definitions:
--      no_follow_up    — active, workable (not won/lost), with NO pending
--                        follow-up task
--      waiting_24h     — active, still 'new' more than 24h after arriving
--      high_value      — active open leads ranked by estimated budget value
--      recent_won      — latest wins (event = status_changed_at)
--      recent_archived — latest archived (event = archived_at)
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_task_center(p_limit integer default 5)
returns jsonb
language sql
stable
as $$
  with active as (
    select * from public.leads where archived_at is null
  )
  select jsonb_build_object(
    'no_follow_up',
      coalesce(
        (select jsonb_agg(row_json) from (
          select jsonb_build_object(
            'id', l.id, 'name', l.name, 'status', l.status,
            'budget_range', l.budget_range, 'event_at', l.created_at
          ) as row_json
          from active l
          where l.status in ('new', 'contacted', 'qualified', 'proposal')
            and not exists (
              select 1 from public.follow_up_tasks t
              where t.lead_id = l.id and t.completed = false
            )
          order by l.created_at asc
          limit p_limit
        ) s),
        '[]'::jsonb
      ),
    'waiting_24h',
      coalesce(
        (select jsonb_agg(row_json) from (
          select jsonb_build_object(
            'id', l.id, 'name', l.name, 'status', l.status,
            'budget_range', l.budget_range, 'event_at', l.created_at
          ) as row_json
          from active l
          where l.status = 'new'
            and l.created_at < now() - interval '24 hours'
          order by l.created_at asc
          limit p_limit
        ) s),
        '[]'::jsonb
      ),
    'high_value',
      coalesce(
        (select jsonb_agg(row_json) from (
          select jsonb_build_object(
            'id', l.id, 'name', l.name, 'status', l.status,
            'budget_range', l.budget_range, 'event_at', l.created_at
          ) as row_json
          from active l
          where l.status not in ('lost')
          order by public.kinetra_budget_value(l.budget_range) desc nulls last,
                   l.created_at desc
          limit p_limit
        ) s),
        '[]'::jsonb
      ),
    'recent_won',
      coalesce(
        (select jsonb_agg(row_json) from (
          select jsonb_build_object(
            'id', l.id, 'name', l.name, 'status', l.status,
            'budget_range', l.budget_range,
            'event_at', coalesce(l.status_changed_at, l.created_at)
          ) as row_json
          from public.leads l
          where l.status = 'won'
          order by coalesce(l.status_changed_at, l.created_at) desc
          limit p_limit
        ) s),
        '[]'::jsonb
      ),
    'recent_archived',
      coalesce(
        (select jsonb_agg(row_json) from (
          select jsonb_build_object(
            'id', l.id, 'name', l.name, 'status', l.status,
            'budget_range', l.budget_range, 'event_at', l.archived_at
          ) as row_json
          from public.leads l
          where l.archived_at is not null
          order by l.archived_at desc
          limit p_limit
        ) s),
        '[]'::jsonb
      )
  );
$$;

revoke execute on function public.kinetra_task_center(integer) from public, anon, authenticated;
grant execute on function public.kinetra_task_center(integer) to service_role;

-- ----------------------------------------------------------------------------
-- 5. Realtime: publish lead_activities too, so the live activity feed
--    refreshes on notes/emails/status events (guarded no-op).
--    RLS still applies to subscribers.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'lead_activities'
     ) then
    alter publication supabase_realtime add table public.lead_activities;
  end if;
end $$;