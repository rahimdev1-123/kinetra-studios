-- ============================================================================
-- Kinetra CRM · Phase 5 · Migration 6 — Client Communication Hub
-- ----------------------------------------------------------------------------
-- Fully idempotent and additive, like migrations 1–5. Safe to re-run.
--
-- Adds:
--   1. public.lead_emails — outbound emails sent to a lead from the CRM.
--      lead_id matches the LIVE type of public.leads.id (uuid or bigint),
--      resolved from the catalog exactly like migration 3 did.
--      Includes has_attachments for the Phase-6+ attachments feature.
--   2. RLS — only allowlisted admins may read/insert (service-role writes
--      from server actions bypass RLS as usual).
--   3. AFTER INSERT trigger — automatically logs an 'email_sent' event into
--      lead_activities (actor = sent_by, payload = email id + subject), so
--      the Phase 4 timeline shows emails without relying on app code.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Preconditions: earlier migrations must have run.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.leads') is null
     or to_regclass('public.lead_activities') is null
     or to_regclass('public.admin_users') is null then
    raise exception
      'Kinetra CRM: run migrations 1-5 first (see supabase/README.md) — leads / lead_activities / admin_users are missing.';
  end if;

  if to_regprocedure('public.kinetra_is_admin()') is null then
    raise exception
      'Kinetra CRM: kinetra_is_admin() is missing — run migration 1 first.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. lead_emails table (lead_id type resolved from the live schema).
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
    create table if not exists public.lead_emails (
      id              uuid primary key default gen_random_uuid(),
      lead_id         %1$s not null references public.leads (id) on delete cascade,
      sent_by         uuid references public.admin_users (id) on delete set null,
      subject         text not null,
      body            text not null,
      delivery_status text not null default 'sent',
      has_attachments boolean not null default false,
      sent_at         timestamptz not null default now()
    )
  $sql$, v_leads_id_type);
end $$;

comment on table public.lead_emails is
  'Kinetra CRM: outbound emails sent to leads from /admin (Phase 5). has_attachments reserved for the future attachments feature.';

create index if not exists kinetra_lead_emails_lead_idx
  on public.lead_emails (lead_id, sent_at desc);

create index if not exists kinetra_lead_emails_sent_by_idx
  on public.lead_emails (sent_by);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security — read/insert for allowlisted admins only.
--    No update/delete policies: sent email records are immutable history.
-- ----------------------------------------------------------------------------
alter table public.lead_emails enable row level security;

drop policy if exists kinetra_admins_select_lead_emails on public.lead_emails;
create policy kinetra_admins_select_lead_emails
  on public.lead_emails for select to authenticated
  using (public.kinetra_is_admin());

drop policy if exists kinetra_admins_insert_lead_emails on public.lead_emails;
create policy kinetra_admins_insert_lead_emails
  on public.lead_emails for insert to authenticated
  with check (public.kinetra_is_admin() and sent_by = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Timeline trigger: every stored email logs an 'email_sent' activity.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_log_email_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_activities (lead_id, actor_id, type, payload, created_at)
  values (
    new.lead_id,
    new.sent_by,
    'email_sent',
    jsonb_build_object(
      'email_id', new.id,
      'subject', left(new.subject, 200),
      'delivery_status', new.delivery_status
    ),
    coalesce(new.sent_at, now())
  );
  return new;
end;
$$;

drop trigger if exists kinetra_lead_emails_log_sent on public.lead_emails;
create trigger kinetra_lead_emails_log_sent
  after insert on public.lead_emails
  for each row
  execute function public.kinetra_log_email_sent();