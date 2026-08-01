-- ============================================================================
-- Kinetra CRM · Phases 8 & 9 · Migration 9 — Notification system + Settings
--                                             infrastructure
-- ----------------------------------------------------------------------------
-- Fully idempotent and additive, like migrations 1–8. Safe to re-run.
--
-- REUSE, NOT DUPLICATION:
--   * public.admin_notifications (created in migration 3) IS the
--     notifications table — this migration EXTENDS it with the Phase 8
--     columns (priority, icon, link, metadata, archived_at). Its existing
--     RLS policies (recipient-or-broadcast read/update/delete for
--     allowlisted admins) keep working unchanged.
--   * public.admin_settings (created in migration 3) IS the global settings
--     store — Phase 9 uses well-known keys (general, crm, email,
--     notifications, appearance, security) seeded idempotently below.
--
-- NEW:
--   1. admin_notifications: +priority +icon +link +metadata +archived_at.
--   2. notification_preferences — per-admin delivery preferences
--      (realtime/email/browser toggles, digest frequency, quiet hours).
--   3. notification_templates — reusable subject/body templates.
--   4. Notification triggers: new lead, lead assigned, lead updated,
--      status changed, archived, restored, email sent, email failed.
--      Recipient logic: the lead's assignee when set (skipping the acting
--      admin's own events), otherwise broadcast (recipient_id NULL).
--   5. kinetra_generate_due_notifications() — idempotently materializes
--      task_due / task_overdue notifications from follow_up_tasks (time-
--      based events can't fire row triggers; the app calls this RPC).
--   6. Realtime publication for admin_notifications (guarded) — powers the
--      live unread badge and dropdown.
--   7. Indexes + idempotent seeds (settings keys, default templates, a
--      preferences row per existing admin).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Preconditions
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.admin_notifications') is null
     or to_regclass('public.admin_settings') is null
     or to_regclass('public.admin_users') is null
     or to_regclass('public.leads') is null
     or to_regclass('public.lead_emails') is null
     or to_regclass('public.follow_up_tasks') is null then
    raise exception
      'Kinetra CRM: run migrations 1-8 first — admin_notifications / admin_settings / lead_emails / follow_up_tasks are missing.';
  end if;

  if to_regprocedure('public.kinetra_is_admin()') is null then
    raise exception 'Kinetra CRM: kinetra_is_admin() is missing — run migration 1 first.';
  end if;

  if to_regprocedure('public.kinetra_set_updated_at()') is null then
    raise exception 'Kinetra CRM: kinetra_set_updated_at() is missing — run the earlier migrations first.';
  end if;

  if to_regprocedure('public.kinetra_budget_value(text)') is null then
    raise exception 'Kinetra CRM: kinetra_budget_value(text) is missing — run migration 6 (analytics) first.';
  end if;

  -- Columns the trigger bodies reference (plpgsql resolves these at RUNTIME,
  -- so we fail loudly at migration time instead of on the first lead write).
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'assigned_to'
  ) then
    raise exception 'Kinetra CRM: leads.assigned_to is missing — run migration 8 (dashboard) first.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'updated_by'
  ) then
    raise exception 'Kinetra CRM: leads.updated_by is missing — run migration 4 (workflow) first.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Extend admin_notifications (Phase 8 model).
--    priority: 'low' | 'normal' | 'high' — validated in the app, matching
--    the project's status-handling convention (no CHECK constraints on
--    enum-ish text).
-- ----------------------------------------------------------------------------
alter table public.admin_notifications add column if not exists priority    text not null default 'normal';
alter table public.admin_notifications add column if not exists icon        text;
alter table public.admin_notifications add column if not exists link        text;
alter table public.admin_notifications add column if not exists metadata    jsonb not null default '{}'::jsonb;
alter table public.admin_notifications add column if not exists archived_at timestamptz;

comment on table public.admin_notifications is
  'Kinetra CRM: in-app notifications (Phase 1 table, extended in Phase 8). recipient_id NULL = broadcast to every admin.';

create index if not exists kinetra_notifications_type_idx
  on public.admin_notifications (type, created_at desc);

create index if not exists kinetra_notifications_unarchived_idx
  on public.admin_notifications (created_at desc)
  where archived_at is null;

-- Guard index for idempotent task_due/task_overdue generation.
create index if not exists kinetra_notifications_task_guard_idx
  on public.admin_notifications (type, (metadata->>'task_id'));

-- Realtime quality-of-life: full replica identity so UPDATE/DELETE events
-- carry the whole old row (the client hook filters relevance by recipient).
-- Idempotent — re-running simply re-applies the same identity.
alter table public.admin_notifications replica identity full;

-- ----------------------------------------------------------------------------
-- 2. Per-admin notification preferences.
--    quiet_hours_start/end are hours of day (0-23, UTC); NULL = no quiet
--    hours. digest_frequency: 'off' | 'daily' | 'weekly' (app-validated).
-- ----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id           uuid primary key references public.admin_users (id) on delete cascade,
  realtime_toggle   boolean not null default true,
  email_toggle      boolean not null default false,
  browser_toggle    boolean not null default false,
  digest_frequency  text not null default 'off',
  quiet_hours_start smallint,
  quiet_hours_end   smallint,
  updated_at        timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Kinetra CRM: per-admin notification delivery preferences (Phase 8).';

-- Every query is a single-row lookup by user_id — the PRIMARY KEY is the
-- covering index. A supplemental index for freshness scans:
create index if not exists kinetra_notification_prefs_updated_idx
  on public.notification_preferences (updated_at desc);

drop trigger if exists kinetra_notification_prefs_updated_at on public.notification_preferences;
create trigger kinetra_notification_prefs_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.kinetra_set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists kinetra_admins_select_own_prefs on public.notification_preferences;
create policy kinetra_admins_select_own_prefs
  on public.notification_preferences for select to authenticated
  using (public.kinetra_is_admin() and user_id = auth.uid());

drop policy if exists kinetra_admins_insert_own_prefs on public.notification_preferences;
create policy kinetra_admins_insert_own_prefs
  on public.notification_preferences for insert to authenticated
  with check (public.kinetra_is_admin() and user_id = auth.uid());

drop policy if exists kinetra_admins_update_own_prefs on public.notification_preferences;
create policy kinetra_admins_update_own_prefs
  on public.notification_preferences for update to authenticated
  using (public.kinetra_is_admin() and user_id = auth.uid())
  with check (public.kinetra_is_admin() and user_id = auth.uid());

-- Seed a default row per existing admin (idempotent).
insert into public.notification_preferences (user_id)
select id from public.admin_users
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Notification templates.
-- ----------------------------------------------------------------------------
create table if not exists public.notification_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  subject    text not null,
  body       text not null,
  type       text not null default 'manual',
  updated_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_templates is
  'Kinetra CRM: reusable notification subject/body templates (Phase 8). Placeholders: {{lead_name}}, {{admin_name}}.';

drop trigger if exists kinetra_notification_templates_updated_at on public.notification_templates;
create trigger kinetra_notification_templates_updated_at
  before update on public.notification_templates
  for each row
  execute function public.kinetra_set_updated_at();

alter table public.notification_templates enable row level security;

drop policy if exists kinetra_admins_select_templates on public.notification_templates;
create policy kinetra_admins_select_templates
  on public.notification_templates for select to authenticated
  using (public.kinetra_is_admin());

-- Writes go through server actions (service role); no authenticated write
-- policies on purpose.

insert into public.notification_templates (name, subject, body, type)
values
  ('New lead alert', 'New lead: {{lead_name}}', 'A new inquiry from {{lead_name}} just arrived. Open the lead to respond while it''s hot.', 'new_lead'),
  ('Task due', 'Follow-up due: {{lead_name}}', 'Your scheduled follow-up for {{lead_name}} is due. Open the lead to act on it.', 'task_due'),
  ('Manual announcement', 'Team update', 'Write your announcement here. It will appear in every admin''s notification center.', 'manual')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Notification helper + event triggers.
--    kinetra_push_notification centralizes inserts; event triggers call it.
--    Recipient rule: assignee if set (skip when assignee = actor), else
--    broadcast (NULL recipient).
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_push_notification(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text,
  p_priority text default 'normal',
  p_icon text default null,
  p_link text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.admin_notifications
    (recipient_id, type, title, body, priority, icon, link, metadata)
  values
    (p_recipient, p_type, p_title, p_body, p_priority, p_icon, p_link, p_metadata);
$$;

revoke execute on function public.kinetra_push_notification(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.kinetra_push_notification(uuid, text, text, text, text, text, text, jsonb) to service_role;

-- 4a. New lead (fires for website form AND manual creation).
create or replace function public.kinetra_notify_lead_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.kinetra_push_notification(
    null,
    'new_lead',
    'New lead: ' || new.name,
    coalesce(new.project_type, 'New inquiry') || ' · ' ||
      case when new.source = 'website' then 'Website form' else initcap(new.source) end,
    case
      when public.kinetra_budget_value(new.budget_range) >= 5000 then 'high'
      else 'normal'
    end,
    'user-plus',
    '/admin/leads/' || new.id,
    jsonb_build_object('lead_id', new.id, 'source', new.source, 'status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists kinetra_leads_notify_insert on public.leads;
create trigger kinetra_leads_notify_insert
  after insert on public.leads
  for each row
  execute function public.kinetra_notify_lead_insert();

-- 4b. Lead updates: assigned / status changed / archived / restored /
--     contact-details updated.
create or replace function public.kinetra_notify_lead_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_link text := '/admin/leads/' || new.id;
  v_meta jsonb := jsonb_build_object('lead_id', new.id);
begin
  -- Recipient: assignee unless the assignee performed the action themselves.
  v_recipient := new.assigned_to;
  if v_recipient is not null and v_recipient = new.updated_by then
    v_recipient := null; -- fall back to broadcast so the team still sees it
  end if;

  -- Assigned (only notify the new assignee; skip self-assignment).
  if new.assigned_to is distinct from old.assigned_to
     and new.assigned_to is not null
     and new.assigned_to <> coalesce(new.updated_by, '00000000-0000-0000-0000-000000000000'::uuid) then
    perform public.kinetra_push_notification(
      new.assigned_to,
      'lead_assigned',
      'Lead assigned to you: ' || new.name,
      'You are now the owner of this lead.',
      'high',
      'user-check',
      v_link,
      v_meta
    );
  end if;

  -- Status changed.
  if new.status is distinct from old.status then
    perform public.kinetra_push_notification(
      v_recipient,
      'status_changed',
      new.name || ' moved to ' || new.status,
      'Pipeline status changed from ' || old.status || ' to ' || new.status || '.',
      case when new.status in ('won', 'lost') then 'high' else 'normal' end,
      'arrow-right',
      v_link,
      v_meta || jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  -- Archived / restored.
  if old.archived_at is null and new.archived_at is not null then
    perform public.kinetra_push_notification(
      v_recipient, 'lead_archived',
      'Lead archived: ' || new.name,
      'The lead was moved to the archive.',
      'low', 'archive', v_link, v_meta
    );
  elsif old.archived_at is not null and new.archived_at is null then
    perform public.kinetra_push_notification(
      v_recipient, 'lead_restored',
      'Lead restored: ' || new.name,
      'The lead is active again.',
      'normal', 'archive-restore', v_link, v_meta
    );
  end if;

  -- Contact/details updated (only when no other event fired for this row).
  if new.status = old.status
     and new.archived_at is not distinct from old.archived_at
     and new.assigned_to is not distinct from old.assigned_to
     and (new.name, new.email, coalesce(new.phone, ''), coalesce(new.company, ''),
          coalesce(new.project_type, ''), coalesce(new.budget_range, ''))
         is distinct from
         (old.name, old.email, coalesce(old.phone, ''), coalesce(old.company, ''),
          coalesce(old.project_type, ''), coalesce(old.budget_range, '')) then
    perform public.kinetra_push_notification(
      v_recipient, 'lead_updated',
      'Lead updated: ' || new.name,
      'Lead details were edited.',
      'low', 'pen-line', v_link, v_meta
    );
  end if;

  return new;
end;
$$;

drop trigger if exists kinetra_leads_notify_update on public.leads;
create trigger kinetra_leads_notify_update
  after update on public.leads
  for each row
  execute function public.kinetra_notify_lead_update();

-- 4c. Emails: sent / failed.
create or replace function public.kinetra_notify_email_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_name text;
begin
  select name into v_lead_name from public.leads where id = new.lead_id;

  if new.delivery_status = 'sent' then
    perform public.kinetra_push_notification(
      null,
      'email_sent',
      'Email sent to ' || coalesce(v_lead_name, 'lead'),
      left(new.subject, 140),
      'low',
      'mail',
      '/admin/leads/' || new.lead_id,
      jsonb_build_object('lead_id', new.lead_id, 'email_id', new.id)
    );
  else
    perform public.kinetra_push_notification(
      new.sent_by,
      'email_failed',
      'Email delivery problem: ' || coalesce(v_lead_name, 'lead'),
      'Delivery status "' || new.delivery_status || '" — ' || left(new.subject, 120),
      'high',
      'mail-x',
      '/admin/leads/' || new.lead_id,
      jsonb_build_object('lead_id', new.lead_id, 'email_id', new.id, 'delivery_status', new.delivery_status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists kinetra_lead_emails_notify_insert on public.lead_emails;
create trigger kinetra_lead_emails_notify_insert
  after insert on public.lead_emails
  for each row
  execute function public.kinetra_notify_email_insert();

-- ----------------------------------------------------------------------------
-- 5. Time-based notifications: task_due / task_overdue (idempotent RPC —
--    row triggers cannot fire on the passage of time). The app calls this
--    when notification surfaces load; each task gets at most one due and
--    one overdue notification, guarded by metadata->>'task_id'.
-- ----------------------------------------------------------------------------
create or replace function public.kinetra_generate_due_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  -- Due within the next 24 hours.
  for v_row in
    select t.id, t.admin_id, t.due_date, t.lead_id, l.name as lead_name
    from public.follow_up_tasks t
    join public.leads l on l.id = t.lead_id
    where t.completed = false
      and t.due_date > now()
      and t.due_date <= now() + interval '24 hours'
      and not exists (
        select 1 from public.admin_notifications n
        where n.type = 'task_due' and n.metadata->>'task_id' = t.id::text
      )
  loop
    perform public.kinetra_push_notification(
      v_row.admin_id, 'task_due',
      'Follow-up due soon: ' || v_row.lead_name,
      'Due ' || to_char(v_row.due_date, 'Mon DD · HH24:MI') || ' UTC.',
      'normal', 'alarm-clock',
      '/admin/leads/' || v_row.lead_id,
      jsonb_build_object('task_id', v_row.id, 'lead_id', v_row.lead_id)
    );
    v_count := v_count + 1;
  end loop;

  -- Overdue.
  for v_row in
    select t.id, t.admin_id, t.due_date, t.lead_id, l.name as lead_name
    from public.follow_up_tasks t
    join public.leads l on l.id = t.lead_id
    where t.completed = false
      and t.due_date <= now()
      and not exists (
        select 1 from public.admin_notifications n
        where n.type = 'task_overdue' and n.metadata->>'task_id' = t.id::text
      )
  loop
    perform public.kinetra_push_notification(
      v_row.admin_id, 'task_overdue',
      'Follow-up overdue: ' || v_row.lead_name,
      'Was due ' || to_char(v_row.due_date, 'Mon DD · HH24:MI') || ' UTC.',
      'high', 'alarm-clock-off',
      '/admin/leads/' || v_row.lead_id,
      jsonb_build_object('task_id', v_row.id, 'lead_id', v_row.lead_id)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.kinetra_generate_due_notifications() from public, anon, authenticated;
grant execute on function public.kinetra_generate_due_notifications() to service_role;

-- ----------------------------------------------------------------------------
-- 6. Realtime: publish admin_notifications (guarded) — live badge/dropdown.
--    RLS applies to subscribers; recipients only receive their own rows and
--    broadcasts per the migration-3 policies.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
       select 1 from pg_publication
       where pubname = 'supabase_realtime' and not puballtables
     )
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'admin_notifications'
     ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7. Phase 9 settings seeds — idempotent defaults in the EXISTING
--    admin_settings key/value store. The Settings UI reads/merges these.
-- ----------------------------------------------------------------------------
insert into public.admin_settings (key, value) values
  ('general', jsonb_build_object(
    'company_name', 'Kinetra Studios',
    'timezone', 'UTC',
    'currency', 'USD',
    'language', 'en',
    'working_hours', jsonb_build_object('start', '09:00', 'end', '18:00'),
    'business_info', ''
  )),
  ('crm', jsonb_build_object(
    'pipeline_stages', jsonb_build_array('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'),
    'lead_sources', jsonb_build_array('website', 'manual'),
    'archive_rules', jsonb_build_object('auto_archive_lost_after_days', null),
    'default_owner', null,
    'default_status', 'new',
    'lead_numbering', jsonb_build_object('prefix', 'KIN-', 'next', 1)
  )),
  ('email', jsonb_build_object(
    'sender_name', 'Kinetra Studios',
    'sender_email', 'onboarding@resend.dev',
    'reply_to', null,
    'signature', 'Kinetra Studios — Edited for impact.',
    'smtp', jsonb_build_object('host', '', 'port', 587, 'username', ''),
    'branding', jsonb_build_object('footer', 'Kinetra Studios — Edited for impact.')
  )),
  ('appearance', jsonb_build_object(
    'density', 'comfortable',
    'dashboard', jsonb_build_object('default_range', '30d'),
    'charts', jsonb_build_object('show_legend', true)
  )),
  ('security', jsonb_build_object(
    'audit_retention_days', 90
  ))
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 8. Grants (explicit, additive, idempotent). Supabase default privileges
--    normally cover these; a production database with tightened defaults
--    still gets exactly what the app needs:
--      * service_role — used by every server action / data-layer query.
--      * authenticated — browser client: realtime subscription + unread
--        head-count on admin_notifications, both constrained by RLS; own-row
--        preferences per the policies above; read-only templates.
--    No table access for anon. Function EXECUTE stays service_role-only
--    (revoked above). No sequences involved (uuid primary keys).
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.admin_notifications to service_role;
grant select, update on public.admin_notifications to authenticated;

grant select, insert, update, delete on public.notification_preferences to service_role;
grant select, insert, update on public.notification_preferences to authenticated;

grant select, insert, update, delete on public.notification_templates to service_role;
grant select on public.notification_templates to authenticated;

revoke all on public.notification_preferences from anon;
revoke all on public.notification_templates from anon;