-- Central Comercial: opportunities, value snapshots, qualification and lifecycle history.

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  company_id uuid references public.companies (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete restrict,
  source_id uuid references public.opportunity_sources (id) on delete restrict,
  responsible_id uuid not null references public.profiles (id) on delete restrict,
  current_pipeline_id uuid references public.pipelines (id) on delete restrict,
  current_stage_id uuid,
  commercial_status public.commercial_status not null default 'active',
  post_sale_status public.post_sale_status,
  temperature public.lead_temperature,
  description text,
  expected_close_date date,
  value_mode public.opportunity_value_mode not null default 'calculated',
  final_value numeric(14,2) check (final_value is null or final_value >= 0),
  last_contact_at timestamptz,
  created_directly_as_won boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_stage_pipeline_fk
    foreign key (current_stage_id, current_pipeline_id)
    references public.pipeline_stages (id, pipeline_id)
    on delete restrict,
  constraint opportunities_stage_and_pipeline_pair check (
    (current_stage_id is null) = (current_pipeline_id is null)
  ),
  constraint opportunities_active_location check (
    commercial_status <> 'active'
    or (current_pipeline_id is not null and current_stage_id is not null and post_sale_status is null)
  ),
  constraint opportunities_post_sale_requires_won check (
    post_sale_status is null or commercial_status = 'won'
  )
);

create index opportunities_pipeline_stage_idx
  on public.opportunities (current_pipeline_id, current_stage_id)
  where commercial_status = 'active';
create index opportunities_status_responsible_idx
  on public.opportunities (commercial_status, responsible_id);
create index opportunities_company_idx on public.opportunities (company_id, created_at desc);
create index opportunities_contact_idx on public.opportunities (contact_id, created_at desc);
create index opportunities_source_idx on public.opportunities (source_id, created_at desc);
create index opportunities_expected_close_idx
  on public.opportunities (expected_close_date)
  where commercial_status = 'active';
create index opportunities_last_contact_idx
  on public.opportunities (last_contact_at)
  where commercial_status = 'active';

create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function private.set_updated_at();

create table public.opportunity_products (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  product_name text not null check (btrim(product_name) <> ''),
  product_description text,
  category_id uuid not null references public.product_categories (id) on delete restrict,
  category_name text not null check (btrim(category_name) <> ''),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  created_by uuid not null references public.profiles (id) on delete restrict,
  updated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, product_id)
);

create index opportunity_products_product_idx on public.opportunity_products (product_id);
create index opportunity_products_category_idx on public.opportunity_products (category_id);

create trigger opportunity_products_set_updated_at
before update on public.opportunity_products
for each row execute function private.set_updated_at();

create table public.opportunity_qualification_answers (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  parameter_id uuid not null references public.qualification_parameters (id) on delete restrict,
  parameter_name text not null check (btrim(parameter_name) <> ''),
  answer boolean not null,
  answered_by uuid not null references public.profiles (id) on delete restrict,
  answered_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles (id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (opportunity_id, parameter_id)
);

create trigger opportunity_qualification_answers_set_updated_at
before update on public.opportunity_qualification_answers
for each row execute function private.set_updated_at();

create table public.opportunity_qualification_validations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  operation_id uuid not null references public.business_operations (id) on delete restrict,
  answered_active_parameters smallint not null check (answered_active_parameters between 2 and 5),
  validated_by uuid not null references public.profiles (id) on delete restrict,
  validated_at timestamptz not null default now(),
  unique (operation_id)
);

create index opportunity_qualification_validations_opportunity_idx
  on public.opportunity_qualification_validations (opportunity_id, validated_at desc);

create table public.opportunity_stage_entries (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  pipeline_id uuid not null references public.pipelines (id) on delete restrict,
  stage_id uuid not null,
  source public.stage_entry_source not null,
  operation_id uuid not null references public.business_operations (id) on delete restrict,
  entered_by uuid not null references public.profiles (id) on delete restrict,
  entered_at timestamptz not null default now(),
  constraint opportunity_stage_entries_stage_pipeline_fk
    foreign key (stage_id, pipeline_id)
    references public.pipeline_stages (id, pipeline_id)
    on delete restrict,
  unique (operation_id, stage_id)
);

create index opportunity_stage_entries_opportunity_idx
  on public.opportunity_stage_entries (opportunity_id, entered_at desc);
create index opportunity_stage_entries_metrics_idx
  on public.opportunity_stage_entries (pipeline_id, stage_id, entered_at);

create table public.opportunity_outcomes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  result public.outcome_result not null,
  loss_reason_id uuid references public.loss_reasons (id) on delete restrict,
  archive_reason text,
  notes text,
  final_value numeric(14,2) check (final_value is null or final_value >= 0),
  responsible_id uuid not null references public.profiles (id) on delete restrict,
  previous_pipeline_id uuid references public.pipelines (id) on delete restrict,
  previous_stage_id uuid,
  operation_id uuid not null references public.business_operations (id) on delete restrict,
  closed_by uuid not null references public.profiles (id) on delete restrict,
  closed_at timestamptz not null default now(),
  is_current boolean not null default true,
  invalidated_by uuid references public.profiles (id) on delete restrict,
  invalidated_at timestamptz,
  constraint opportunity_outcomes_previous_stage_pipeline_fk
    foreign key (previous_stage_id, previous_pipeline_id)
    references public.pipeline_stages (id, pipeline_id)
    on delete restrict,
  constraint opportunity_outcomes_previous_pair check (
    (previous_stage_id is null) = (previous_pipeline_id is null)
  ),
  constraint opportunity_outcomes_loss_reason check (
    (result = 'lost' and loss_reason_id is not null)
    or (result <> 'lost' and loss_reason_id is null)
  ),
  constraint opportunity_outcomes_invalidation_pair check (
    (invalidated_by is null) = (invalidated_at is null)
  ),
  constraint opportunity_outcomes_current_invalidation check (
    (is_current and invalidated_at is null)
    or (not is_current and invalidated_at is not null)
  ),
  unique (operation_id)
);

create unique index opportunity_outcomes_one_current_idx
  on public.opportunity_outcomes (opportunity_id)
  where is_current;
create index opportunity_outcomes_result_date_idx
  on public.opportunity_outcomes (result, closed_at desc)
  where is_current;

create table public.post_sale_cycles (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  outcome_id uuid not null references public.opportunity_outcomes (id) on delete restrict,
  current_pipeline_id uuid not null default '00000000-0000-4000-8000-000000000003'
    references public.pipelines (id) on delete restrict,
  current_stage_id uuid,
  status public.post_sale_cycle_status not null default 'active',
  started_by uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_by uuid references public.profiles (id) on delete restrict,
  ended_at timestamptz,
  end_reason text,
  constraint post_sale_cycles_pipeline_check check (
    current_pipeline_id = '00000000-0000-4000-8000-000000000003'
  ),
  constraint post_sale_cycles_stage_pipeline_fk
    foreign key (current_stage_id, current_pipeline_id)
    references public.pipeline_stages (id, pipeline_id)
    on delete restrict,
  constraint post_sale_cycles_end_pair check ((ended_by is null) = (ended_at is null)),
  constraint post_sale_cycles_status_end check (
    (status = 'active' and ended_at is null)
    or (status in ('finished', 'interrupted') and ended_at is not null)
  )
);

create unique index post_sale_cycles_one_active_idx
  on public.post_sale_cycles (opportunity_id)
  where status = 'active';
create index post_sale_cycles_stage_idx
  on public.post_sale_cycles (current_stage_id)
  where status = 'active';

comment on table public.opportunity_stage_entries is 'Immutable stage passage history used by funnel metrics.';
comment on table public.opportunity_outcomes is 'Commercial closure history; at most one current result per opportunity.';
comment on table public.post_sale_cycles is 'Preserved post-sale cycle created by each current or former win.';
