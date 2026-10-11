-- Central Comercial: foundational types, identities and shared helpers.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('admin', 'pre_sales', 'commercial');
create type public.access_status as enum ('pending', 'active', 'rejected', 'disabled');
create type public.commercial_status as enum ('active', 'won', 'lost', 'disqualified', 'archived');
create type public.post_sale_status as enum ('active', 'finished', 'interrupted');
create type public.lead_temperature as enum ('cold', 'warm', 'hot');
create type public.opportunity_value_mode as enum ('calculated', 'manual');
create type public.outcome_result as enum ('won', 'lost', 'disqualified', 'archived');
create type public.stage_entry_source as enum ('creation', 'movement', 'transfer', 'restoration', 'reopening', 'automation');
create type public.post_sale_cycle_status as enum ('active', 'finished', 'interrupted');
create type public.task_type as enum ('first_contact', 'qualification', 'follow_up', 'scheduling', 'proposal', 'management');
create type public.task_status as enum ('pending', 'completed', 'cancelled');
create type public.task_creation_source as enum ('manual', 'system');
create type public.contact_channel as enum ('whatsapp', 'phone', 'email', 'online_meeting', 'in_person_meeting', 'other');
create type public.operation_status as enum ('running', 'completed', 'failed');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  role public.app_role,
  access_status public.access_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete restrict,
  approved_at timestamptz,
  disabled_by uuid references public.profiles (id) on delete restrict,
  disabled_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_active_requires_role check (access_status <> 'active' or role is not null),
  constraint profiles_approval_pair check ((approved_by is null) = (approved_at is null)),
  constraint profiles_disabled_pair check ((disabled_by is null) = (disabled_at is null))
);

create index profiles_access_status_idx on public.profiles (access_status);
create index profiles_role_status_idx on public.profiles (role, access_status);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create table public.business_operations (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  operation_type text not null check (btrim(operation_type) <> ''),
  idempotency_key uuid not null,
  status public.operation_status not null default 'running',
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (actor_id, operation_type, idempotency_key),
  constraint business_operations_completion check (
    (status = 'running' and completed_at is null)
    or (status in ('completed', 'failed') and completed_at is not null)
  )
);

create index business_operations_created_at_idx
  on public.business_operations (created_at desc);

comment on table public.profiles is 'Application profile and approval state for each Supabase Auth user.';
comment on table public.business_operations is 'Idempotency ledger for critical business transactions.';
