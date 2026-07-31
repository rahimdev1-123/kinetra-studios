-- ============================================================================
-- Kinetra CRM · Phase 4 · Migration 5 — Lead workflow: attribution +
--                                        automatic activity triggers
-- ----------------------------------------------------------------------------
-- Fully idempotent and additive, like migrations 1–4. Safe to re-run.
--
-- IMPORTANT — what this migration does NOT do:
--   * lead_notes and lead_activities were ALREADY created by migration 3
--     (20260722000300_crm_tables.sql), complete with foreign keys, indexes,
--     and RLS policies restricting access to allowlisted admins. They are
--     not recreated here.
--
-- What it DOES:
--   0. SELF-HEALING PRECHECK — verifies migration-3 tables exist (clear
--      error if not) and re-asserts the migration-4 lead columns
--      idempotently (company, source, updated_at, status_changed_at,
--      archived_at), so this migration works even if migration 4's file
--      was mangled during copy (the committed superbase/…leads_phase3.sql
--      currently contains TypeScript, not SQL).
--   1. Adds leads.updated_by — which admin made the latest change. Server
--      actions set it in the same UPDATE; the contact form never sets it,
--      so visitor-created rows keep it NULL.
--   2. BEFORE UPDATE trigger — stamps status_changed_at automatically
--      whenever status changes (exact time of the change, enforced in DB).
--   3. AFTER INSERT/UPDATE triggers on leads + AFTER INSERT/UPDATE/DELETE
--      triggers on lead_notes that append lead_activities rows for:
--      lead_created, status_changed, lead_archived, lead_restored,
--      note_added, note_updated, note_deleted. Events are logged at the
--      database level, so no code path can skip the timeline.
--   4. One-time, idempotent backfill of 'lead_created' events for leads
--      that predate the triggers (timestamped at the lead's created_at so
--      timeline ordering stays truthful).
--
-- Double-logging note: Phase 3's server actions logged lead_archived /
-- lead_restored from application code. Phase 4 moves that into these
-- triggers, and the updated actions.ts no longer logs manually — apply
-- both together to avoid duplicate timeline entries.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0a. Precondition: migration-3 tables must exist.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.lead_activities') is null
     or to_regclass('public.lead_notes') is null
     or to_regclass('public.admin_users') is null then
    raise exception
      'Kinetra CRM: run migrations 1-3 first (see supabase/README.md) — lead_activities / lead_notes / admin_users are missing.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 0b. Self-healing: re-assert Phase 1/3 lead columns (no-ops when present).
-- ----------------------------------------------------------------------------
alter table public.leads add column if not exists updated_at        timestamptz;
alter table public.leads add column if not exists status_changed_at timestamptz;
alter table public.leads add column if not exists archived_at       timestamptz;
alter table public.leads add column if not exists company           text;
alter table public.leads add column if not exists source            text not null default 'website';

-- ----------------------------------------------------------------------------
-- 1. Attribution column: which admin last changed this lead.
-- ----------------------------------------------------------------------------
alter table public.leads add column if not exists updated_by uuid
  references public.admin_users (id) on delete set null;

comment on column public.leads.updated_by is
  'Kinetra CRM: admin who made the latest change. NULL for visitor-created rows (contact form). Read by activity triggers for actor attribution.';

-- ----------------------------------------------------------------------------
-- 2. Exact status-change timestamp, enforced in the database.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_track_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists kinetra_leads_track_status on public.leads;
create trigger kinetra_leads_track_status
  before update on public.leads
  for each row
  execute function public.kinetra_track_status_change();

-- ----------------------------------------------------------------------------
-- 3a. Activity trigger: lead created (covers contact-form inserts too).
--     Activity timestamps mirror the lead's own created_at.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_log_lead_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_activities (lead_id, actor_id, type, payload, created_at)
  values (
    new.id,
    new.updated_by,
    'lead_created',
    jsonb_build_object('status', new.status, 'source', new.source),
    coalesce(new.created_at, now())
  );
  return new;
end;
$$;

drop trigger if exists kinetra_leads_log_insert on public.leads;
create trigger kinetra_leads_log_insert
  after insert on public.leads
  for each row
  execute function public.kinetra_log_lead_insert();

-- ----------------------------------------------------------------------------
-- 3b. Activity trigger: status changes + archive / restore.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_log_lead_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.lead_activities (lead_id, actor_id, type, payload)
    values (
      new.id,
      new.updated_by,
      'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if old.archived_at is null and new.archived_at is not null then
    insert into public.lead_activities (lead_id, actor_id, type, payload)
    values (new.id, new.updated_by, 'lead_archived', '{}'::jsonb);
  elsif old.archived_at is not null and new.archived_at is null then
    insert into public.lead_activities (lead_id, actor_id, type, payload)
    values (new.id, new.updated_by, 'lead_restored', '{}'::jsonb);
  end if;

  return new;
end;
$$;

drop trigger if exists kinetra_leads_log_update on public.leads;
create trigger kinetra_leads_log_update
  after update on public.leads
  for each row
  execute function public.kinetra_log_lead_update();

-- ----------------------------------------------------------------------------
-- 3c. Activity triggers: notes (author attribution comes from the note row;
--     a short excerpt is stored so the timeline stays meaningful even after
--     a note is deleted).
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_log_note_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_activities (lead_id, actor_id, type, payload)
    values (
      new.lead_id,
      new.author_id,
      'note_added',
      jsonb_build_object('note_id', new.id, 'excerpt', left(new.body, 120))
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.body is distinct from old.body then
      insert into public.lead_activities (lead_id, actor_id, type, payload)
      values (
        new.lead_id,
        new.author_id,
        'note_updated',
        jsonb_build_object('note_id', new.id, 'excerpt', left(new.body, 120))
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.lead_activities (lead_id, actor_id, type, payload)
    values (
      old.lead_id,
      old.author_id,
      'note_deleted',
      jsonb_build_object('note_id', old.id, 'excerpt', left(old.body, 120))
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists kinetra_lead_notes_log_changes on public.lead_notes;
create trigger kinetra_lead_notes_log_changes
  after insert or update or delete on public.lead_notes
  for each row
  execute function public.kinetra_log_note_changes();

-- ----------------------------------------------------------------------------
-- 4. Backfill 'lead_created' for pre-existing leads (idempotent: skips any
--    lead that already has one). Timestamped at the lead's created_at so the
--    timeline reads correctly.
-- ----------------------------------------------------------------------------
insert into public.lead_activities (lead_id, actor_id, type, payload, created_at)
select
  l.id,
  null,
  'lead_created',
  jsonb_build_object('status', l.status, 'source', l.source, 'backfilled', true),
  l.created_at
from public.leads l
where not exists (
  select 1
  from public.lead_activities a
  where a.lead_id = l.id
    and a.type = 'lead_created'
);