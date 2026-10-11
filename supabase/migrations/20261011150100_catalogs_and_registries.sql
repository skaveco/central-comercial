-- Central Comercial: pipelines, configurable catalogs, companies, contacts and products.

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('pre_sales', 'sales', 'post_sales')),
  name text not null unique check (btrim(name) <> ''),
  sort_order smallint not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines (id) on delete restrict,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  sort_order smallint not null check (sort_order > 0),
  is_terminal_action boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pipeline_id, code),
  unique (pipeline_id, sort_order),
  unique (id, pipeline_id)
);

create table public.user_stage_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id) on delete cascade,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage_id)
);

create trigger user_stage_preferences_set_updated_at
before update on public.user_stage_preferences
for each row execute function private.set_updated_at();

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.loss_reasons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.qualification_parameters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

create table public.sales_goal_changes (
  id uuid primary key default gen_random_uuid(),
  effective_month date not null unique,
  amount numeric(14,2) not null check (amount > 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_month = date_trunc('month', effective_month)::date)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  cnpj text,
  cnpj_normalized text,
  email text,
  phone text,
  address text,
  segment_id uuid references public.segments (id) on delete restrict,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  status_changed_by uuid references public.profiles (id) on delete restrict,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_cnpj_normalized_format check (
    cnpj_normalized is null or cnpj_normalized ~ '^[0-9]{14}$'
  ),
  constraint companies_status_change_pair check (
    (status_changed_by is null) = (status_changed_at is null)
  )
);

create unique index companies_cnpj_normalized_uidx
  on public.companies (cnpj_normalized)
  where cnpj_normalized is not null;
create index companies_name_idx on public.companies (lower(name));
create index companies_segment_status_idx on public.companies (segment_id, is_active);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  phone text,
  phone_normalized text,
  email text,
  email_normalized text,
  source_id uuid references public.opportunity_sources (id) on delete restrict,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  status_changed_by uuid references public.profiles (id) on delete restrict,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_status_change_pair check (
    (status_changed_by is null) = (status_changed_at is null)
  )
);

create index contacts_name_idx on public.contacts (lower(name));
create index contacts_email_normalized_idx on public.contacts (email_normalized);
create index contacts_phone_normalized_idx on public.contacts (phone_normalized);
create index contacts_source_status_idx on public.contacts (source_id, is_active);

create table public.company_contacts (
  company_id uuid not null references public.companies (id) on delete restrict,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  job_title text,
  is_active boolean not null default true,
  linked_by uuid not null references public.profiles (id) on delete restrict,
  linked_at timestamptz not null default now(),
  unlinked_by uuid references public.profiles (id) on delete restrict,
  unlinked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (company_id, contact_id),
  constraint company_contacts_unlink_pair check (
    (unlinked_by is null) = (unlinked_at is null)
  ),
  constraint company_contacts_active_unlink check (
    (is_active and unlinked_at is null) or (not is_active and unlinked_at is not null)
  )
);

create index company_contacts_contact_idx on public.company_contacts (contact_id, is_active);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  description text,
  base_price numeric(14,2) check (base_price is null or base_price >= 0),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  status_changed_by uuid references public.profiles (id) on delete restrict,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_status_change_pair check (
    (status_changed_by is null) = (status_changed_at is null)
  )
);

create index products_name_idx on public.products (lower(name));
create index products_category_status_idx on public.products (category_id, is_active);

create trigger segments_set_updated_at before update on public.segments
for each row execute function private.set_updated_at();
create trigger opportunity_sources_set_updated_at before update on public.opportunity_sources
for each row execute function private.set_updated_at();
create trigger loss_reasons_set_updated_at before update on public.loss_reasons
for each row execute function private.set_updated_at();
create trigger product_categories_set_updated_at before update on public.product_categories
for each row execute function private.set_updated_at();
create trigger qualification_parameters_set_updated_at before update on public.qualification_parameters
for each row execute function private.set_updated_at();
create trigger sales_goal_changes_set_updated_at before update on public.sales_goal_changes
for each row execute function private.set_updated_at();
create trigger companies_set_updated_at before update on public.companies
for each row execute function private.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts
for each row execute function private.set_updated_at();
create trigger company_contacts_set_updated_at before update on public.company_contacts
for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function private.set_updated_at();

comment on table public.sales_goal_changes is 'Effective-dated global monthly sales target changes.';
comment on table public.company_contacts is 'Reusable many-to-many company/contact relationship with preserved inactive links.';

