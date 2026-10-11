-- Central Comercial: tasks, confirmed contacts, notes, attachments and immutable activities.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  type public.task_type not null,
  responsible_id uuid not null references public.profiles (id) on delete restrict,
  due_date date not null,
  due_time time,
  description text,
  opportunity_id uuid references public.opportunities (id) on delete restrict,
  company_id uuid references public.companies (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete restrict,
  post_sale_cycle_id uuid references public.post_sale_cycles (id) on delete restrict,
  status public.task_status not null default 'pending',
  creation_source public.task_creation_source not null default 'manual',
  created_by uuid references public.profiles (id) on delete restrict,
  operation_id uuid not null references public.business_operations (id) on delete restrict,
  automation_key text,
  stage_entry_id uuid references public.opportunity_stage_entries (id) on delete restrict,
  completed_by uuid references public.profiles (id) on delete restrict,
  completed_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete restrict,
  cancelled_at timestamptz,
  cancellation_reason text,
  deleted_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_creation_source_actor check (
    (creation_source = 'manual' and created_by is not null)
    or (creation_source = 'system' and created_by is null)
  ),
  constraint tasks_automation_fields check (
    (creation_source = 'manual' and automation_key is null and stage_entry_id is null)
    or (creation_source = 'system' and automation_key is not null)
  ),
  constraint tasks_completion_pair check ((completed_by is null) = (completed_at is null)),
  constraint tasks_cancellation_pair check ((cancelled_by is null) = (cancelled_at is null)),
  constraint tasks_deletion_pair check ((deleted_by is null) = (deleted_at is null)),
  constraint tasks_status_metadata check (
    (status = 'pending' and completed_at is null and cancelled_at is null)
    or (status = 'completed' and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null and completed_at is null)
  )
);

create index tasks_responsible_status_due_idx
  on public.tasks (responsible_id, status, due_date, due_time)
  where deleted_at is null;
create index tasks_creator_idx
  on public.tasks (created_by, status)
  where deleted_at is null and created_by is not null;
create index tasks_opportunity_idx
  on public.tasks (opportunity_id, status, due_date)
  where deleted_at is null and opportunity_id is not null;
create unique index tasks_automatic_stage_key_uidx
  on public.tasks (
    opportunity_id,
    coalesce(stage_entry_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(post_sale_cycle_id, '00000000-0000-0000-0000-000000000000'::uuid),
    automation_key
  )
  where creation_source = 'system' and deleted_at is null;

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

create table public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete restrict,
  channel public.contact_channel not null,
  occurred_at timestamptz not null,
  notes text,
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  recorded_at timestamptz not null default now()
);

create index contact_interactions_opportunity_idx
  on public.contact_interactions (opportunity_id, occurred_at desc);

create or replace function private.validate_contact_interaction_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.occurred_at > now() then
    raise exception using
      errcode = '22007',
      message = 'A data do contato não pode estar no futuro.';
  end if;
  return new;
end;
$$;

create trigger contact_interactions_validate_time
before insert or update on public.contact_interactions
for each row execute function private.validate_contact_interaction_time();

create table public.company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  body text not null check (btrim(body) <> ''),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  deleted_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_notes_deletion_pair check ((deleted_by is null) = (deleted_at is null))
);

create table public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  body text not null check (btrim(body) <> ''),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  deleted_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_notes_deletion_pair check ((deleted_by is null) = (deleted_at is null))
);

create table public.opportunity_notes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  body text not null check (btrim(body) <> ''),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  deleted_by uuid references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_notes_deletion_pair check ((deleted_by is null) = (deleted_at is null))
);

create trigger company_notes_set_updated_at before update on public.company_notes
for each row execute function private.set_updated_at();
create trigger contact_notes_set_updated_at before update on public.contact_notes
for each row execute function private.set_updated_at();
create trigger opportunity_notes_set_updated_at before update on public.opportunity_notes
for each row execute function private.set_updated_at();

create index company_notes_company_idx on public.company_notes (company_id, created_at desc);
create index contact_notes_contact_idx on public.contact_notes (contact_id, created_at desc);
create index opportunity_notes_opportunity_idx on public.opportunity_notes (opportunity_id, created_at desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete restrict,
  opportunity_id uuid references public.opportunities (id) on delete restrict,
  bucket_id text not null,
  object_path text not null unique check (btrim(object_path) <> ''),
  original_name text not null check (btrim(original_name) <> ''),
  mime_type text not null check (btrim(mime_type) <> ''),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  removed_by uuid references public.profiles (id) on delete restrict,
  removed_at timestamptz,
  constraint attachments_exactly_one_parent check (num_nonnulls(company_id, opportunity_id) = 1),
  constraint attachments_removal_pair check ((removed_by is null) = (removed_at is null)),
  constraint attachments_bucket_matches_parent check (
    (company_id is not null and bucket_id = 'company-attachments')
    or (opportunity_id is not null and bucket_id = 'opportunity-attachments')
  )
);

create index attachments_company_idx on public.attachments (company_id, uploaded_at desc)
  where company_id is not null;
create index attachments_opportunity_idx on public.attachments (opportunity_id, uploaded_at desc)
  where opportunity_id is not null;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (btrim(event_type) <> ''),
  summary text not null check (btrim(summary) <> ''),
  actor_id uuid references public.profiles (id) on delete restrict,
  opportunity_id uuid references public.opportunities (id) on delete restrict,
  company_id uuid references public.companies (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete restrict,
  stage_entry_id uuid references public.opportunity_stage_entries (id) on delete restrict,
  operation_id uuid references public.business_operations (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint activity_events_has_subject check (
    num_nonnulls(opportunity_id, company_id, contact_id, task_id) >= 1
  )
);

create index activity_events_opportunity_idx
  on public.activity_events (opportunity_id, occurred_at desc)
  where opportunity_id is not null;
create index activity_events_company_idx
  on public.activity_events (company_id, occurred_at desc)
  where company_id is not null;
create index activity_events_contact_idx
  on public.activity_events (contact_id, occurred_at desc)
  where contact_id is not null;
create index activity_events_task_idx
  on public.activity_events (task_id, occurred_at desc)
  where task_id is not null;

comment on table public.contact_interactions is 'Confirmed commercial contacts; only their real occurrence time updates last contact.';
comment on table public.activity_events is 'Immutable user-facing timeline and audit event stream.';
