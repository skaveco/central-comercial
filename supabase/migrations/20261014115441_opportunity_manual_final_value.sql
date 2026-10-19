create or replace function private.set_opportunity_products(
  request_key uuid,
  target_opportunity_id uuid,
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
  op public.business_operations;
  opportunity_row public.opportunities;
  item jsonb;
  product_row public.products;
  linked_product_row public.opportunity_products;
  product_id_value uuid;
  quantity_value integer;
  calculated_value numeric(14,2);
  effective_value numeric(14,2);
begin
  op := private.start_operation('set_opportunity_products', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into opportunity_row
  from public.opportunities
  where id = target_opportunity_id
  for update;

  if opportunity_row.id is null
     or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para edição de produtos.';
  end if;
  if product_items is null or jsonb_typeof(product_items) <> 'array' then
    raise exception using errcode = '22023', message = 'Produtos devem ser enviados como uma lista.';
  end if;
  if requested_value_mode is null then
    raise exception using errcode = '22023', message = 'Informe o tipo de valor da oportunidade.';
  end if;
  if requested_value_mode = 'manual'
     and (requested_final_value is null or requested_final_value < 0) then
    raise exception using errcode = '23514', message = 'Informe um valor manual válido.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(product_items) as requested_item
    group by requested_item ->> 'product_id'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Cada produto deve aparecer uma única vez.';
  end if;

  for item in select value from jsonb_array_elements(product_items)
  loop
    product_id_value := (item ->> 'product_id')::uuid;
    quantity_value := (item ->> 'quantity')::integer;
    if product_id_value is null or quantity_value is null or quantity_value <= 0 then
      raise exception using errcode = '23514', message = 'A quantidade do produto deve ser inteira e maior que zero.';
    end if;

    select * into linked_product_row
    from public.opportunity_products
    where opportunity_id = target_opportunity_id
      and product_id = product_id_value;

    if linked_product_row.opportunity_id is not null then
      update public.opportunity_products
      set quantity = quantity_value,
          updated_by = actor_id
      where opportunity_id = target_opportunity_id
        and product_id = product_id_value;
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
        product_category.name,
        coalesce(product_row.base_price, 0),
        actor_id,
        actor_id
      from public.product_categories as product_category
      where product_category.id = product_row.category_id;
    end if;
  end loop;

  delete from public.opportunity_products as linked_product
  where linked_product.opportunity_id = target_opportunity_id
    and not exists (
      select 1
      from jsonb_array_elements(product_items) as requested_item
      where (requested_item ->> 'product_id')::uuid = linked_product.product_id
    );

  select coalesce(sum(quantity * unit_price), 0)
  into calculated_value
  from public.opportunity_products
  where opportunity_id = target_opportunity_id;

  effective_value := case
    when requested_value_mode = 'manual' then requested_final_value
    else calculated_value
  end;

  update public.opportunities
  set value_mode = requested_value_mode,
      final_value = effective_value,
      updated_by = actor_id
  where id = target_opportunity_id;

  insert into public.activity_events (
    event_type,
    summary,
    actor_id,
    opportunity_id,
    operation_id,
    metadata
  ) values (
    'opportunity_products_updated',
    'Produtos da oportunidade atualizados',
    actor_id,
    target_opportunity_id,
    op.id,
    jsonb_build_object(
      'calculated_value', calculated_value,
      'final_value', effective_value,
      'value_mode', requested_value_mode
    )
  );

  return private.finish_operation(op.id, jsonb_build_object(
    'opportunity_id', target_opportunity_id,
    'calculated_value', calculated_value,
    'final_value', effective_value,
    'value_mode', requested_value_mode
  ));
exception when invalid_text_representation then
  raise exception using errcode = '22023', message = 'Produto ou quantidade inválidos.';
end;
$$;

create or replace function private.set_opportunity_value(
  request_key uuid,
  target_opportunity_id uuid,
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
  op public.business_operations;
  opportunity_row public.opportunities;
  calculated_value numeric(14,2);
  effective_value numeric(14,2);
begin
  op := private.start_operation('set_opportunity_value', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into opportunity_row
  from public.opportunities
  where id = target_opportunity_id
  for update;

  if opportunity_row.id is null
     or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para edição do valor.';
  end if;
  if requested_value_mode is null then
    raise exception using errcode = '22023', message = 'Informe o tipo de valor da oportunidade.';
  end if;
  if requested_value_mode = 'manual'
     and (requested_final_value is null or requested_final_value < 0) then
    raise exception using errcode = '23514', message = 'Informe um valor manual válido.';
  end if;

  select coalesce(sum(quantity * unit_price), 0)
  into calculated_value
  from public.opportunity_products
  where opportunity_id = target_opportunity_id;

  effective_value := case
    when requested_value_mode = 'manual' then requested_final_value
    else calculated_value
  end;

  update public.opportunities
  set value_mode = requested_value_mode,
      final_value = effective_value,
      updated_by = actor_id
  where id = target_opportunity_id;

  insert into public.activity_events (
    event_type,
    summary,
    actor_id,
    opportunity_id,
    operation_id,
    metadata
  ) values (
    'opportunity_value_updated',
    'Valor da oportunidade atualizado',
    actor_id,
    target_opportunity_id,
    op.id,
    jsonb_build_object(
      'calculated_value', calculated_value,
      'final_value', effective_value,
      'value_mode', requested_value_mode
    )
  );

  return private.finish_operation(op.id, jsonb_build_object(
    'opportunity_id', target_opportunity_id,
    'calculated_value', calculated_value,
    'final_value', effective_value,
    'value_mode', requested_value_mode
  ));
end;
$$;

create or replace function public.set_opportunity_value(
  request_key uuid,
  target_opportunity_id uuid,
  requested_value_mode public.opportunity_value_mode,
  requested_final_value numeric default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.set_opportunity_value(
    request_key,
    target_opportunity_id,
    requested_value_mode,
    requested_final_value
  );
$$;

revoke all on function private.set_opportunity_value(uuid, uuid, public.opportunity_value_mode, numeric)
  from public, anon, authenticated;
grant execute on function private.set_opportunity_value(uuid, uuid, public.opportunity_value_mode, numeric)
  to authenticated;

revoke all on function public.set_opportunity_value(uuid, uuid, public.opportunity_value_mode, numeric)
  from public, anon, authenticated;
grant execute on function public.set_opportunity_value(uuid, uuid, public.opportunity_value_mode, numeric)
  to authenticated;

comment on function public.set_opportunity_value(uuid, uuid, public.opportunity_value_mode, numeric)
  is 'Updates the negotiated final value independently from the preserved product price snapshots.';
