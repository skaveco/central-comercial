-- Dashboard metrics and immutable attribution snapshots for stage history.

alter table public.opportunity_stage_entries
  add column responsible_id uuid references public.profiles (id) on delete restrict,
  add column source_id uuid references public.opportunity_sources (id) on delete restrict;

update public.opportunity_stage_entries as entry
set responsible_id = opportunity.responsible_id,
    source_id = opportunity.source_id
from public.opportunities as opportunity
where opportunity.id = entry.opportunity_id;

create index opportunity_stage_entries_responsible_idx
  on public.opportunity_stage_entries (responsible_id, entered_at);
create index opportunity_stage_entries_source_idx
  on public.opportunity_stage_entries (source_id, entered_at);

create or replace function private.capture_stage_entry_dimensions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select opportunity.responsible_id, opportunity.source_id
  into new.responsible_id, new.source_id
  from public.opportunities as opportunity
  where opportunity.id = new.opportunity_id;

  return new;
end;
$$;

create trigger opportunity_stage_entries_capture_dimensions
before insert on public.opportunity_stage_entries
for each row execute function private.capture_stage_entry_dimensions();

create or replace function private.business_deadline_sp(
  reference_at timestamptz,
  business_days integer
)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  local_deadline timestamp := reference_at at time zone 'America/Sao_Paulo';
  counted_days integer := 0;
begin
  if reference_at is null or business_days < 1 then
    return reference_at;
  end if;

  while counted_days < business_days loop
    local_deadline := local_deadline + interval '1 day';
    if extract(isodow from local_deadline) between 1 and 5 then
      counted_days := counted_days + 1;
    end if;
  end loop;

  return local_deadline at time zone 'America/Sao_Paulo';
end;
$$;

create or replace function public.get_dashboard_metrics(
  period_from date,
  period_to date,
  responsible_ids uuid[] default '{}'::uuid[],
  source_ids uuid[] default '{}'::uuid[],
  product_ids uuid[] default '{}'::uuid[],
  segment_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
  result_payload jsonb;
begin
  select profile.role
  into actor_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.access_status = 'active';

  if actor_role is null then
    raise exception using errcode = '42501', message = 'Perfil ativo obrigatório.';
  end if;
  if period_from is null or period_to is null or period_from > period_to then
    raise exception using errcode = '22023', message = 'Período inválido.';
  end if;
  if period_to - period_from > 1095 then
    raise exception using errcode = '22023', message = 'O período máximo é de três anos.';
  end if;
  if cardinality(responsible_ids) > 100 or cardinality(source_ids) > 100
     or cardinality(product_ids) > 100 or cardinality(segment_ids) > 100 then
    raise exception using errcode = '22023', message = 'Quantidade de filtros inválida.';
  end if;

  with
  parameters as (
    select
      (period_from::timestamp at time zone 'America/Sao_Paulo') as from_at,
      ((period_to + 1)::timestamp at time zone 'America/Sao_Paulo') as to_at,
      (current_timestamp at time zone 'America/Sao_Paulo')::date as today,
      date_trunc('month', current_timestamp at time zone 'America/Sao_Paulo')::date as month_start
  ),
  creation_dimensions as (
    select distinct on (entry.opportunity_id)
      entry.opportunity_id,
      entry.responsible_id,
      entry.source_id,
      entry.pipeline_id,
      entry.entered_at
    from public.opportunity_stage_entries as entry
    where entry.source = 'creation'
    order by entry.opportunity_id, entry.entered_at, entry.id
  ),
  opportunity_base as materialized (
    select
      opportunity.*,
      company.segment_id,
      coalesce(created.responsible_id, opportunity.responsible_id) as initial_responsible_id,
      coalesce(created.source_id, opportunity.source_id) as initial_source_id
    from public.opportunities as opportunity
    left join public.companies as company on company.id = opportunity.company_id
    left join creation_dimensions as created on created.opportunity_id = opportunity.id
    where
      (cardinality(segment_ids) = 0 or company.segment_id = any(segment_ids))
      and (
        cardinality(product_ids) = 0
        or exists (
          select 1 from public.opportunity_products as linked_product
          where linked_product.opportunity_id = opportunity.id
            and linked_product.product_id = any(product_ids)
        )
      )
  ),
  pre_sales_cohort as materialized (
    select distinct base.id
    from opportunity_base as base
    join creation_dimensions as created on created.opportunity_id = base.id
    cross join parameters
    where created.pipeline_id = '00000000-0000-4000-8000-000000000001'::uuid
      and created.entered_at >= parameters.from_at
      and created.entered_at < parameters.to_at
      and (cardinality(responsible_ids) = 0 or created.responsible_id = any(responsible_ids))
      and (cardinality(source_ids) = 0 or created.source_id = any(source_ids))
  ),
  sales_first_entry as (
    select distinct on (entry.opportunity_id)
      entry.opportunity_id,
      entry.responsible_id,
      entry.source_id,
      entry.entered_at
    from public.opportunity_stage_entries as entry
    where entry.pipeline_id = '00000000-0000-4000-8000-000000000002'::uuid
    order by entry.opportunity_id, entry.entered_at, entry.id
  ),
  sales_cohort as materialized (
    select base.id
    from opportunity_base as base
    join sales_first_entry as first_entry on first_entry.opportunity_id = base.id
    cross join parameters
    where first_entry.entered_at >= parameters.from_at
      and first_entry.entered_at < parameters.to_at
      and (cardinality(responsible_ids) = 0 or first_entry.responsible_id = any(responsible_ids))
      and (cardinality(source_ids) = 0 or coalesce(base.initial_source_id, first_entry.source_id) = any(source_ids))
  ),
  filtered_wins as materialized (
    select outcome.*, base.created_at, base.created_directly_as_won
    from public.opportunity_outcomes as outcome
    join opportunity_base as base on base.id = outcome.opportunity_id
    cross join parameters
    where outcome.is_current
      and outcome.result = 'won'
      and outcome.closed_at >= parameters.from_at
      and outcome.closed_at < parameters.to_at
      and (cardinality(responsible_ids) = 0 or outcome.responsible_id = any(responsible_ids))
      and (cardinality(source_ids) = 0 or base.initial_source_id = any(source_ids))
  ),
  filtered_losses as materialized (
    select outcome.*
    from public.opportunity_outcomes as outcome
    join opportunity_base as base on base.id = outcome.opportunity_id
    cross join parameters
    where outcome.is_current
      and outcome.result = 'lost'
      and outcome.closed_at >= parameters.from_at
      and outcome.closed_at < parameters.to_at
      and (cardinality(responsible_ids) = 0 or outcome.responsible_id = any(responsible_ids))
      and (cardinality(source_ids) = 0 or base.initial_source_id = any(source_ids))
  ),
  active_opportunities as materialized (
    select base.*
    from opportunity_base as base
    where base.commercial_status = 'active'
      and base.current_pipeline_id in (
        '00000000-0000-4000-8000-000000000001'::uuid,
        '00000000-0000-4000-8000-000000000002'::uuid
      )
      and (cardinality(responsible_ids) = 0 or base.responsible_id = any(responsible_ids))
      and (cardinality(source_ids) = 0 or base.initial_source_id = any(source_ids))
  ),
  pre_rows as (
    select 1 as sort_order, 'leads' as key, 'Leads gerados' as label,
      (select count(*) from pre_sales_cohort) as amount
    union all
    select 2, 'first_contact', 'Passaram por Primeiro contato', count(distinct cohort.id)
    from pre_sales_cohort as cohort
    join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
    join public.pipeline_stages as stage on stage.id = entry.stage_id
    where stage.code = 'first_contact'
    union all
    select 3, 'qualification', 'Qualificação preenchida', count(distinct cohort.id)
    from pre_sales_cohort as cohort
    join public.opportunity_qualification_validations as validation on validation.opportunity_id = cohort.id
    union all
    select 4, 'scheduled', 'Diagnósticos agendados', count(distinct cohort.id)
    from pre_sales_cohort as cohort
    join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
    join public.pipeline_stages as stage on stage.id = entry.stage_id
    where stage.code = 'scheduled'
  ),
  sales_rows as (
    select row_data.sort_order, row_data.key, row_data.label, row_data.amount
    from (
      select 1 as sort_order, 'diagnosis' as key, 'Passaram por Diagnóstico' as label,
        count(distinct cohort.id) as amount
      from sales_cohort as cohort
      join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
      join public.pipeline_stages as stage on stage.id = entry.stage_id
      where stage.code = 'diagnosis'
      union all
      select 2, 'proposal_in_progress', 'Passaram por Proposta em andamento', count(distinct cohort.id)
      from sales_cohort as cohort join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
      join public.pipeline_stages as stage on stage.id = entry.stage_id where stage.code = 'proposal_in_progress'
      union all
      select 3, 'proposal_sent', 'Passaram por Proposta enviada', count(distinct cohort.id)
      from sales_cohort as cohort join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
      join public.pipeline_stages as stage on stage.id = entry.stage_id where stage.code = 'proposal_sent'
      union all
      select 4, 'negotiation', 'Passaram por Negociação', count(distinct cohort.id)
      from sales_cohort as cohort join public.opportunity_stage_entries as entry on entry.opportunity_id = cohort.id
      join public.pipeline_stages as stage on stage.id = entry.stage_id where stage.code = 'negotiation'
      union all
      select 5, 'lost', 'Perdidas', count(distinct cohort.id)
      from sales_cohort as cohort join public.opportunity_outcomes as outcome on outcome.opportunity_id = cohort.id
      where outcome.is_current and outcome.result = 'lost'
      union all
      select 6, 'won', 'Ganhas', count(distinct cohort.id)
      from sales_cohort as cohort join public.opportunity_outcomes as outcome on outcome.opportunity_id = cohort.id
      where outcome.is_current and outcome.result = 'won'
    ) as row_data
  ),
  lead_origins as (
    select
      coalesce(source.id::text, 'none') as id,
      coalesce(source.name, 'Sem origem') as name,
      count(*)::integer as amount
    from pre_sales_cohort as cohort
    join opportunity_base as base on base.id = cohort.id
    left join public.opportunity_sources as source on source.id = base.initial_source_id
    group by source.id, source.name
  ),
  lead_responsibles as (
    select
      profile.id::text as id,
      coalesce(profile.name, 'Responsável indisponível') as name,
      count(*)::integer as amount
    from pre_sales_cohort as cohort
    join creation_dimensions as created on created.opportunity_id = cohort.id
    left join public.profiles as profile on profile.id = created.responsible_id
    group by profile.id, profile.name
  ),
  win_categories as (
    select linked_product.category_id::text as id, linked_product.category_name as name,
      count(distinct win.opportunity_id)::integer as amount
    from filtered_wins as win
    join public.opportunity_products as linked_product on linked_product.opportunity_id = win.opportunity_id
    group by linked_product.category_id, linked_product.category_name
  ),
  win_products as (
    select linked_product.product_id::text as id, linked_product.product_name as name,
      count(distinct win.opportunity_id)::integer as amount
    from filtered_wins as win
    join public.opportunity_products as linked_product on linked_product.opportunity_id = win.opportunity_id
    group by linked_product.product_id, linked_product.product_name
  ),
  losses_by_reason as (
    select reason.id::text as id, coalesce(reason.name, 'Motivo indisponível') as name,
      count(*)::integer as amount
    from filtered_losses as loss
    left join public.loss_reasons as reason on reason.id = loss.loss_reason_id
    group by reason.id, reason.name
  ),
  current_month_wins as (
    select outcome.final_value
    from public.opportunity_outcomes as outcome
    cross join parameters
    where outcome.is_current and outcome.result = 'won'
      and outcome.closed_at >= (parameters.month_start::timestamp at time zone 'America/Sao_Paulo')
      and outcome.closed_at < ((parameters.month_start + interval '1 month')::timestamp at time zone 'America/Sao_Paulo')
  ),
  current_goal as (
    select goal.amount
    from public.sales_goal_changes as goal
    cross join parameters
    where goal.effective_month <= parameters.month_start
    order by goal.effective_month desc
    limit 1
  ),
  active_summary as (
    select coalesce(sum(final_value) filter (where final_value is not null), 0) as total_value,
      count(*)::integer as opportunity_count,
      count(*) filter (where final_value is null)::integer as without_value_count,
      count(*) filter (
        where private.business_deadline_sp(coalesce(last_contact_at, created_at), 3) <= current_timestamp
      )::integer as cooling_count
    from active_opportunities
  ),
  forecast_summary as (
    select
      coalesce(sum(active.final_value) filter (
        where active.expected_close_date >= parameters.today
          and active.expected_close_date >= parameters.month_start
          and active.expected_close_date < parameters.month_start + interval '1 month'
      ), 0) as current_value,
      count(*) filter (
        where active.expected_close_date >= parameters.today
          and active.expected_close_date >= parameters.month_start
          and active.expected_close_date < parameters.month_start + interval '1 month'
      )::integer as current_count,
      count(*) filter (
        where active.final_value is null and active.expected_close_date >= parameters.today
          and active.expected_close_date >= parameters.month_start
          and active.expected_close_date < parameters.month_start + interval '1 month'
      )::integer as current_without_value,
      coalesce(sum(active.final_value) filter (
        where active.expected_close_date >= parameters.month_start + interval '1 month'
          and active.expected_close_date < parameters.month_start + interval '2 months'
      ), 0) as next_value,
      count(*) filter (
        where active.expected_close_date >= parameters.month_start + interval '1 month'
          and active.expected_close_date < parameters.month_start + interval '2 months'
      )::integer as next_count,
      count(*) filter (
        where active.final_value is null
          and active.expected_close_date >= parameters.month_start + interval '1 month'
          and active.expected_close_date < parameters.month_start + interval '2 months'
      )::integer as next_without_value,
      count(*) filter (where active.expected_close_date is null)::integer as no_date_count,
      count(*) filter (where active.expected_close_date < parameters.today)::integer as overdue_count
    from active_opportunities as active cross join parameters
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', period_from, 'to', period_to),
    'global', case when actor_role = 'admin' then (
      select jsonb_build_object(
        'month', parameters.month_start,
        'goal', (select amount from current_goal),
        'sold', coalesce((select sum(final_value) from current_month_wins), 0),
        'salesCount', (select count(*) from current_month_wins)
      ) from parameters
    ) else null end,
    'activePipeline', (
      select jsonb_build_object('value', total_value, 'count', opportunity_count,
        'withoutValue', without_value_count, 'cooling', cooling_count)
      from active_summary
    ),
    'forecast', (
      select jsonb_build_object(
        'current', jsonb_build_object('month', parameters.month_start, 'value', summary.current_value,
          'count', summary.current_count, 'withoutValue', summary.current_without_value),
        'next', jsonb_build_object('month', (parameters.month_start + interval '1 month')::date,
          'value', summary.next_value, 'count', summary.next_count, 'withoutValue', summary.next_without_value),
        'withoutDate', summary.no_date_count, 'overdue', summary.overdue_count
      ) from forecast_summary as summary cross join parameters
    ),
    'preSales', jsonb_build_object(
      'baseCount', (select count(*) from pre_sales_cohort),
      'scheduledCount', (select amount from pre_rows where key = 'scheduled'),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label, 'count', amount) order by sort_order) from pre_rows), '[]'::jsonb)
    ),
    'sales', jsonb_build_object(
      'baseCount', (select count(*) from sales_cohort),
      'diagnosisCount', (select amount from sales_rows where key = 'diagnosis'),
      'diagnosisWonCount', (
        select count(distinct cohort.id)
        from sales_cohort as cohort
        join public.opportunity_outcomes as outcome on outcome.opportunity_id = cohort.id and outcome.is_current and outcome.result = 'won'
        where exists (
          select 1 from public.opportunity_stage_entries as entry
          join public.pipeline_stages as stage on stage.id = entry.stage_id
          where entry.opportunity_id = cohort.id and stage.code = 'diagnosis'
        )
      ),
      'wonValue', (
        select coalesce(sum(outcome.final_value), 0)
        from sales_cohort as cohort
        join public.opportunity_outcomes as outcome on outcome.opportunity_id = cohort.id and outcome.is_current and outcome.result = 'won'
      ),
      'rows', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'label', label, 'count', amount) order by sort_order) from sales_rows), '[]'::jsonb)
    ),
    'leadOrigins', coalesce((select jsonb_agg(to_jsonb(origin) order by origin.amount desc, origin.name) from lead_origins as origin), '[]'::jsonb),
    'leadResponsibles', coalesce((select jsonb_agg(to_jsonb(responsible) order by responsible.amount desc, responsible.name) from lead_responsibles as responsible), '[]'::jsonb),
    'salesCategories', coalesce((select jsonb_agg(to_jsonb(category) order by category.amount desc, category.name) from win_categories as category), '[]'::jsonb),
    'salesProducts', coalesce((select jsonb_agg(to_jsonb(product) order by product.amount desc, product.name) from win_products as product), '[]'::jsonb),
    'ticket', jsonb_build_object(
      'value', case when (select count(*) from filtered_wins) = 0 then null
        else (select round(avg(final_value), 2) from filtered_wins) end,
      'soldValue', coalesce((select sum(final_value) from filtered_wins), 0),
      'salesCount', (select count(*) from filtered_wins)
    ),
    'cycle', jsonb_build_object(
      'days', (select round(avg(extract(epoch from (closed_at - created_at)) / 86400)::numeric, 1)
        from filtered_wins where not created_directly_as_won),
      'salesCount', (select count(*) from filtered_wins where not created_directly_as_won)
    ),
    'lossReasons', coalesce((select jsonb_agg(to_jsonb(reason) order by reason.amount desc, reason.name) from losses_by_reason as reason), '[]'::jsonb),
    'options', jsonb_build_object(
      'responsibles', coalesce((select jsonb_agg(jsonb_build_object('id', profile.id, 'name', profile.name) order by lower(profile.name)) from public.profiles as profile where profile.access_status = 'active'), '[]'::jsonb),
      'sources', coalesce((select jsonb_agg(jsonb_build_object('id', source.id, 'name', source.name) order by source.sort_order, lower(source.name)) from public.opportunity_sources as source where source.is_active), '[]'::jsonb),
      'products', coalesce((select jsonb_agg(jsonb_build_object('id', product.id, 'name', product.name) order by lower(product.name)) from public.products as product where product.is_active), '[]'::jsonb),
      'segments', coalesce((select jsonb_agg(jsonb_build_object('id', segment.id, 'name', segment.name) order by segment.sort_order, lower(segment.name)) from public.segments as segment where segment.is_active), '[]'::jsonb)
    )
  ) into result_payload;

  return result_payload;
end;
$$;

comment on column public.opportunity_stage_entries.responsible_id is
  'Responsible snapshot at stage entry time. Legacy rows were backfilled from the current opportunity.';
comment on column public.opportunity_stage_entries.source_id is
  'Source snapshot at stage entry time. Legacy rows were backfilled from the current opportunity.';
comment on function public.get_dashboard_metrics(date, date, uuid[], uuid[], uuid[], uuid[]) is
  'Returns role-safe Dashboard metrics using the temporal bases documented for the MVP.';

revoke all on function private.capture_stage_entry_dimensions() from public, anon, authenticated;
revoke all on function private.business_deadline_sp(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.get_dashboard_metrics(date, date, uuid[], uuid[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.get_dashboard_metrics(date, date, uuid[], uuid[], uuid[], uuid[]) to authenticated;
