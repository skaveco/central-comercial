-- Confirma uma oportunidade como ganha e inicia o Onboarding em uma única
-- transação. Produtos existentes preservam o preço histórico do vínculo;
-- somente produtos novos capturam o preço vigente no catálogo.

create or replace function private.win_opportunity(
  request_key uuid,
  target_opportunity_id uuid,
  target_company_id uuid,
  target_contact_id uuid,
  target_responsible_id uuid,
  product_items jsonb,
  requested_value_mode public.opportunity_value_mode,
  requested_final_value numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  operation_row public.business_operations;
  opportunity_row public.opportunities;
  item jsonb;
  product_row public.products;
  linked_product_row public.opportunity_products;
  product_id_value uuid;
  product_ids uuid[] := array[]::uuid[];
  quantity_value integer;
  calculated_value numeric(14,2);
  effective_value numeric(14,2);
  outcome_id uuid;
  cycle_id uuid;
  entry_id uuid;
  onboarding_stage_id constant uuid := '00000000-0000-4000-8300-000000000001'::uuid;
begin
  operation_row := private.start_operation('win_opportunity', request_key);
  if operation_row.status = 'completed' then
    return operation_row.result;
  end if;

  select * into opportunity_row
  from public.opportunities
  where id = target_opportunity_id
  for update;

  if opportunity_row.id is null
     or opportunity_row.commercial_status <> 'active'
     or opportunity_row.current_pipeline_id <> '00000000-0000-4000-8000-000000000002'::uuid
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using
      errcode = '42501',
      message = 'Oportunidade ativa de Venda indisponível para fechamento.';
  end if;

  if target_company_id is null or not private.can_edit_company(target_company_id) then
    raise exception using errcode = '23514', message = 'Ganho exige uma empresa ativa.';
  end if;
  if target_contact_id is null or not private.can_edit_contact(target_contact_id) then
    raise exception using errcode = '23514', message = 'Ganho exige um contato ativo.';
  end if;
  perform private.require_assignable_user(target_responsible_id);

  if product_items is null
     or jsonb_typeof(product_items) <> 'array'
     or jsonb_array_length(product_items) = 0 then
    raise exception using
      errcode = '23514',
      message = 'Ganho exige ao menos um produto com quantidade válida.';
  end if;
  if requested_value_mode is null then
    raise exception using errcode = '22023', message = 'Tipo de valor inválido.';
  end if;

  for item in select value from jsonb_array_elements(product_items)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception using errcode = '22023', message = 'Produto inválido.';
    end if;

    product_id_value := (item ->> 'product_id')::uuid;
    quantity_value := (item ->> 'quantity')::integer;

    if product_id_value = any(product_ids) then
      raise exception using
        errcode = '23505',
        message = 'Cada produto deve aparecer somente uma vez na oportunidade.';
    end if;
    if quantity_value <= 0 then
      raise exception using
        errcode = '23514',
        message = 'A quantidade do produto deve ser inteira e maior que zero.';
    end if;

    product_ids := array_append(product_ids, product_id_value);

    select * into linked_product_row
    from public.opportunity_products
    where opportunity_id = target_opportunity_id
      and product_id = product_id_value;

    if linked_product_row.id is not null then
      update public.opportunity_products
      set quantity = quantity_value,
          updated_by = actor_id
      where id = linked_product_row.id;
    else
      select * into product_row
      from public.products
      where id = product_id_value
        and is_active;

      if product_row.id is null then
        raise exception using errcode = '22023', message = 'Produto ativo não encontrado.';
      end if;

      insert into public.opportunity_products (
        opportunity_id,
        product_id,
        quantity,
        product_name,
        product_description,
        category_id,
        category_name,
        unit_price,
        created_by,
        updated_by
      )
      select
        target_opportunity_id,
        product_row.id,
        quantity_value,
        product_row.name,
        product_row.description,
        product_row.category_id,
        category.name,
        coalesce(product_row.base_price, 0),
        actor_id,
        actor_id
      from public.product_categories category
      where category.id = product_row.category_id;
    end if;
  end loop;

  delete from public.opportunity_products
  where opportunity_id = target_opportunity_id
    and not (product_id = any(product_ids));

  select coalesce(sum(unit_price * quantity), 0)
  into calculated_value
  from public.opportunity_products
  where opportunity_id = target_opportunity_id;

  effective_value := case
    when requested_value_mode = 'manual' then requested_final_value
    else calculated_value
  end;

  if effective_value is null or effective_value <= 0 then
    raise exception using
      errcode = '23514',
      message = 'Ganho exige valor final maior que zero.';
  end if;

  if not exists (
    select 1
    from public.pipeline_stages stage
    where stage.id = onboarding_stage_id
      and stage.pipeline_id = '00000000-0000-4000-8000-000000000003'::uuid
      and stage.code = 'onboarding'
  ) then
    raise exception using errcode = '22023', message = 'Etapa de Onboarding indisponível.';
  end if;

  perform private.cancel_pending_opportunity_tasks(
    target_opportunity_id,
    actor_id,
    'oportunidade ganha'
  );

  insert into public.opportunity_outcomes (
    opportunity_id,
    result,
    final_value,
    responsible_id,
    previous_pipeline_id,
    previous_stage_id,
    operation_id,
    closed_by
  ) values (
    target_opportunity_id,
    'won',
    effective_value,
    target_responsible_id,
    opportunity_row.current_pipeline_id,
    opportunity_row.current_stage_id,
    operation_row.id,
    actor_id
  ) returning id into outcome_id;

  update public.opportunities
  set company_id = target_company_id,
      contact_id = target_contact_id,
      responsible_id = target_responsible_id,
      commercial_status = 'won',
      post_sale_status = 'active',
      current_pipeline_id = '00000000-0000-4000-8000-000000000003'::uuid,
      current_stage_id = onboarding_stage_id,
      value_mode = requested_value_mode,
      final_value = effective_value,
      updated_by = actor_id
  where id = target_opportunity_id;

  insert into public.post_sale_cycles (
    opportunity_id,
    outcome_id,
    current_stage_id,
    started_by
  ) values (
    target_opportunity_id,
    outcome_id,
    onboarding_stage_id,
    actor_id
  ) returning id into cycle_id;

  entry_id := private.record_stage_entry(
    target_opportunity_id,
    '00000000-0000-4000-8000-000000000003'::uuid,
    onboarding_stage_id,
    'transfer',
    operation_row.id,
    actor_id
  );

  insert into public.activity_events (
    event_type,
    summary,
    actor_id,
    opportunity_id,
    stage_entry_id,
    operation_id,
    metadata
  ) values (
    'opportunity_closed',
    'Oportunidade ganha',
    actor_id,
    target_opportunity_id,
    entry_id,
    operation_row.id,
    jsonb_build_object(
      'result', 'won',
      'outcome_id', outcome_id,
      'post_sale_cycle_id', cycle_id,
      'final_value', effective_value
    )
  );

  return private.finish_operation(
    operation_row.id,
    jsonb_build_object(
      'opportunity_id', target_opportunity_id,
      'outcome_id', outcome_id,
      'post_sale_cycle_id', cycle_id,
      'final_value', effective_value
    )
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Produto ou quantidade inválidos.';
end;
$$;

create or replace function public.win_opportunity(
  request_key uuid,
  target_opportunity_id uuid,
  target_company_id uuid,
  target_contact_id uuid,
  target_responsible_id uuid,
  product_items jsonb,
  requested_value_mode public.opportunity_value_mode,
  requested_final_value numeric default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.win_opportunity(
    request_key,
    target_opportunity_id,
    target_company_id,
    target_contact_id,
    target_responsible_id,
    product_items,
    requested_value_mode,
    requested_final_value
  );
$$;

revoke all on function private.win_opportunity(
  uuid, uuid, uuid, uuid, uuid, jsonb, public.opportunity_value_mode, numeric
) from public, anon, authenticated;
grant execute on function private.win_opportunity(
  uuid, uuid, uuid, uuid, uuid, jsonb, public.opportunity_value_mode, numeric
) to authenticated;

revoke all on function public.win_opportunity(
  uuid, uuid, uuid, uuid, uuid, jsonb, public.opportunity_value_mode, numeric
) from public, anon, authenticated;
grant execute on function public.win_opportunity(
  uuid, uuid, uuid, uuid, uuid, jsonb, public.opportunity_value_mode, numeric
) to authenticated;

comment on function public.win_opportunity(
  uuid, uuid, uuid, uuid, uuid, jsonb, public.opportunity_value_mode, numeric
) is 'Confirms a Sales opportunity as won, updates its closing data and starts Onboarding atomically.';
