-- Central Comercial: validated, idempotent commercial transactions.
-- Public functions are thin SECURITY INVOKER wrappers. Elevated implementations
-- live in the non-exposed private schema and always validate auth.uid().

create or replace function private.guard_active_qualification_parameter_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not old.is_active) and (
    select count(*) from public.qualification_parameters qp where qp.is_active
  ) >= 5 then
    raise exception using errcode = '23514', message = 'É permitido manter no máximo cinco parâmetros ativos.';
  end if;
  return new;
end;
$$;

create trigger qualification_parameters_active_limit
before insert or update of is_active on public.qualification_parameters
for each row execute function private.guard_active_qualification_parameter_limit();

create or replace function private.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not private.current_profile_is_active() then
    raise exception using errcode = '42501', message = 'Usuário sem acesso ativo.';
  end if;
  return actor_id;
end;
$$;

create or replace function private.require_assignable_user(target_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = target_user_id and p.access_status = 'active' and p.role is not null
  ) then
    raise exception using errcode = '22023', message = 'Responsável inativo ou indisponível.';
  end if;
end;
$$;

create or replace function private.start_operation(operation_name text, request_key uuid)
returns public.business_operations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  operation_row public.business_operations;
begin
  if request_key is null then
    raise exception using errcode = '22023', message = 'A chave de idempotência é obrigatória.';
  end if;

  insert into public.business_operations (actor_id, operation_type, idempotency_key)
  values (actor_id, operation_name, request_key)
  on conflict (actor_id, operation_type, idempotency_key) do nothing
  returning * into operation_row;

  if operation_row.id is null then
    select * into operation_row
    from public.business_operations bo
    where bo.actor_id = actor_id
      and bo.operation_type = operation_name
      and bo.idempotency_key = request_key
    for update;
  end if;

  return operation_row;
end;
$$;

create or replace function private.finish_operation(operation_id uuid, operation_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.business_operations
  set status = 'completed', result = operation_result, error_code = null, completed_at = now()
  where id = operation_id and actor_id = auth.uid();
  return operation_result;
end;
$$;

create or replace function private.assert_stage_access(target_pipeline_id uuid, target_stage_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  stage_code text;
begin
  if not private.can_access_pipeline(target_pipeline_id) then
    raise exception using errcode = '42501', message = 'Você não pode operar o funil selecionado.';
  end if;

  select ps.code into stage_code
  from public.pipeline_stages ps
  where ps.id = target_stage_id and ps.pipeline_id = target_pipeline_id;

  if stage_code is null then
    raise exception using errcode = '22023', message = 'A etapa não pertence ao funil selecionado.';
  end if;

  return stage_code;
end;
$$;

create or replace function private.validate_sales_qualification(target_opportunity_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  answer_count integer;
begin
  select count(*) into answer_count
  from public.opportunity_qualification_answers oqa
  join public.qualification_parameters qp on qp.id = oqa.parameter_id
  where oqa.opportunity_id = target_opportunity_id and qp.is_active;

  if answer_count < 2 then
    raise exception using errcode = '23514', message = 'A entrada em Venda exige ao menos duas respostas de qualificação ativas.';
  end if;
end;
$$;

create or replace function private.record_qualification_validation(
  target_opportunity_id uuid,
  target_operation_id uuid,
  actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_count integer;
begin
  perform private.validate_sales_qualification(target_opportunity_id);
  select count(*) into answer_count
  from public.opportunity_qualification_answers oqa
  join public.qualification_parameters qp on qp.id = oqa.parameter_id
  where oqa.opportunity_id = target_opportunity_id and qp.is_active;

  insert into public.opportunity_qualification_validations (
    opportunity_id, operation_id, answered_active_parameters, validated_by
  ) values (
    target_opportunity_id, target_operation_id, least(answer_count, 5)::smallint, actor_id
  );
end;
$$;

create or replace function private.cancel_pending_opportunity_tasks(
  target_opportunity_id uuid,
  actor_id uuid,
  reason text,
  target_post_sale_cycle_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.tasks t
  set status = 'cancelled', cancelled_by = actor_id, cancelled_at = now(), cancellation_reason = reason
  where t.opportunity_id = target_opportunity_id
    and t.status = 'pending'
    and t.deleted_at is null
    and (target_post_sale_cycle_id is null or t.post_sale_cycle_id = target_post_sale_cycle_id);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function private.record_stage_entry(
  target_opportunity_id uuid,
  target_pipeline_id uuid,
  target_stage_id uuid,
  entry_source public.stage_entry_source,
  target_operation_id uuid,
  actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_id uuid;
begin
  insert into public.opportunity_stage_entries (
    opportunity_id, pipeline_id, stage_id, source, operation_id, entered_by
  ) values (
    target_opportunity_id, target_pipeline_id, target_stage_id, entry_source, target_operation_id, actor_id
  ) returning id into entry_id;
  return entry_id;
end;
$$;

create or replace function private.create_stage_task(
  target_opportunity_id uuid,
  target_stage_id uuid,
  target_operation_id uuid,
  target_stage_entry_id uuid,
  target_responsible_id uuid,
  requested_due_date date default null,
  requested_due_time time default null,
  requested_note text default null,
  target_post_sale_cycle_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opportunity_name text;
  stage_code text;
  task_id uuid;
  task_title text;
  task_type_value public.task_type;
  task_due_date date;
  task_due_time time;
  task_key text;
  local_now timestamp := now() at time zone 'America/Sao_Paulo';
begin
  select o.name, ps.code into opportunity_name, stage_code
  from public.opportunities o
  join public.pipeline_stages ps on ps.id = target_stage_id
  where o.id = target_opportunity_id;

  case stage_code
    when 'first_contact' then
      task_title := 'Qualificar lead — ' || opportunity_name;
      task_type_value := 'qualification';
      task_due_date := local_now::date;
      task_key := 'first_contact_qualification';
    when 'diagnosis' then
      if requested_due_date is null or requested_due_time is null then
        raise exception using errcode = '23514', message = 'Diagnóstico exige data e horário da call.';
      end if;
      task_title := 'Realizar diagnóstico — ' || opportunity_name;
      task_type_value := 'scheduling';
      task_due_date := requested_due_date;
      task_due_time := requested_due_time;
      task_key := 'sales_diagnosis';
    when 'proposal_in_progress' then
      task_title := 'Preparar proposta — ' || opportunity_name;
      task_type_value := 'proposal';
      task_due_date := local_now::date + 5;
      task_due_time := local_now::time(0);
      task_key := 'proposal_in_progress';
    when 'proposal_sent' then
      task_title := 'Follow-up da proposta — ' || opportunity_name;
      task_type_value := 'follow_up';
      task_due_date := local_now::date + 5;
      task_due_time := local_now::time(0);
      task_key := 'proposal_sent_follow_up';
    when 'negotiation' then
      if requested_due_date is null or requested_due_time is null then
        raise exception using errcode = '23514', message = 'Negociação exige data e horário do Follow-up.';
      end if;
      task_title := 'Follow-up da negociação — ' || opportunity_name;
      task_type_value := 'follow_up';
      task_due_date := requested_due_date;
      task_due_time := requested_due_time;
      task_key := 'negotiation_follow_up';
    when 'follow_up' then
      if requested_due_date is null or requested_due_time is null then
        raise exception using errcode = '23514', message = 'Acompanhamento exige data e horário do próximo contato.';
      end if;
      task_title := 'Acompanhar cliente — ' || opportunity_name;
      task_type_value := 'follow_up';
      task_due_date := requested_due_date;
      task_due_time := requested_due_time;
      task_key := 'post_sales_follow_up';
    else
      return null;
  end case;

  select t.id into task_id
  from public.tasks t
  where t.opportunity_id = target_opportunity_id
    and t.status = 'pending'
    and t.deleted_at is null
    and t.creation_source = 'system'
    and t.automation_key = task_key
    and t.post_sale_cycle_id is not distinct from target_post_sale_cycle_id
  order by t.created_at desc
  limit 1;

  if task_id is not null then
    return task_id;
  end if;

  insert into public.tasks (
    title, type, responsible_id, due_date, due_time, description,
    opportunity_id, post_sale_cycle_id, creation_source, created_by,
    operation_id, automation_key, stage_entry_id
  ) values (
    task_title, task_type_value, target_responsible_id, task_due_date, task_due_time,
    nullif(btrim(requested_note), ''), target_opportunity_id, target_post_sale_cycle_id,
    'system', null, target_operation_id, task_key, target_stage_entry_id
  ) returning id into task_id;

  return task_id;
end;
$$;

create or replace function private.sync_opportunity_products(
  target_opportunity_id uuid,
  actor_id uuid,
  product_items jsonb
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  product_row public.products;
  quantity_value integer;
  total_value numeric(14,2) := 0;
begin
  if product_items is null then
    return 0;
  end if;
  if jsonb_typeof(product_items) <> 'array' then
    raise exception using errcode = '22023', message = 'Produtos devem ser enviados como uma lista.';
  end if;

  for item in select value from jsonb_array_elements(product_items)
  loop
    quantity_value := (item ->> 'quantity')::integer;
    if quantity_value <= 0 then
      raise exception using errcode = '23514', message = 'A quantidade do produto deve ser inteira e maior que zero.';
    end if;

    select * into product_row
    from public.products p
    where p.id = (item ->> 'product_id')::uuid and p.is_active;
    if product_row.id is null then
      raise exception using errcode = '22023', message = 'Produto ativo não encontrado.';
    end if;

    insert into public.opportunity_products (
      opportunity_id, product_id, quantity, product_name, product_description,
      category_id, category_name, unit_price, created_by, updated_by
    )
    select target_opportunity_id, product_row.id, quantity_value, product_row.name,
      product_row.description, product_row.category_id, pc.name,
      coalesce(product_row.base_price, 0), actor_id, actor_id
    from public.product_categories pc where pc.id = product_row.category_id;

    total_value := total_value + coalesce(product_row.base_price, 0) * quantity_value;
  end loop;
  return total_value;
exception when invalid_text_representation then
  raise exception using errcode = '22023', message = 'Produto ou quantidade inválidos.';
end;
$$;

create or replace function private.sync_qualification_answers(
  target_opportunity_id uuid,
  actor_id uuid,
  qualification_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_item jsonb;
  parameter_row public.qualification_parameters;
begin
  if qualification_answers is null then return; end if;
  if jsonb_typeof(qualification_answers) <> 'array' then
    raise exception using errcode = '22023', message = 'Qualificação deve ser enviada como uma lista.';
  end if;

  for answer_item in select value from jsonb_array_elements(qualification_answers)
  loop
    select * into parameter_row from public.qualification_parameters qp
    where qp.id = (answer_item ->> 'parameter_id')::uuid and qp.is_active;
    if parameter_row.id is null then
      raise exception using errcode = '22023', message = 'Parâmetro de qualificação ativo não encontrado.';
    end if;
    if jsonb_typeof(answer_item -> 'answer') <> 'boolean' then
      raise exception using errcode = '22023', message = 'A resposta de qualificação deve ser verdadeira ou falsa.';
    end if;

    insert into public.opportunity_qualification_answers (
      opportunity_id, parameter_id, parameter_name, answer, answered_by, updated_by
    ) values (
      target_opportunity_id, parameter_row.id, parameter_row.name,
      (answer_item ->> 'answer')::boolean, actor_id, actor_id
    )
    on conflict (opportunity_id, parameter_id) do update
    set answer = excluded.answer, answered_by = excluded.answered_by,
        answered_at = now(), updated_by = excluded.updated_by, updated_at = now();
  end loop;
end;
$$;

create or replace function private.create_opportunity(
  request_key uuid,
  opportunity_name text,
  target_pipeline_id uuid,
  target_stage_id uuid,
  target_responsible_id uuid,
  target_company_id uuid default null,
  target_contact_id uuid default null,
  target_source_id uuid default null,
  opportunity_description text default null,
  target_expected_close_date date default null,
  target_value_mode public.opportunity_value_mode default 'calculated',
  requested_final_value numeric default null,
  product_items jsonb default '[]'::jsonb,
  qualification_answers jsonb default '[]'::jsonb,
  target_loss_reason_id uuid default null,
  closure_note text default null,
  task_due_date date default null,
  task_due_time time default null,
  task_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  pipeline_code text;
  stage_code text;
  opportunity_id uuid;
  entry_id uuid;
  outcome_id uuid;
  cycle_id uuid;
  calculated_value numeric(14,2);
  effective_value numeric(14,2);
  result_value public.outcome_result;
  status_value public.commercial_status := 'active';
  effective_pipeline_id uuid := target_pipeline_id;
  effective_stage_id uuid := target_stage_id;
  previous_pipeline_id uuid;
  previous_stage_id uuid;
begin
  op := private.start_operation('create_opportunity', request_key);
  if op.status = 'completed' then return op.result; end if;

  if nullif(btrim(opportunity_name), '') is null then
    raise exception using errcode = '23514', message = 'Nome da oportunidade é obrigatório.';
  end if;
  perform private.require_assignable_user(target_responsible_id);
  stage_code := private.assert_stage_access(target_pipeline_id, target_stage_id);
  select code into pipeline_code from public.pipelines where id = target_pipeline_id;

  if target_company_id is not null and not private.can_edit_company(target_company_id) then
    raise exception using errcode = '22023', message = 'Empresa ativa não encontrada.';
  end if;
  if target_contact_id is not null and not private.can_edit_contact(target_contact_id) then
    raise exception using errcode = '22023', message = 'Contato ativo não encontrado.';
  end if;

  if stage_code in ('lost', 'disqualified', 'no_response') then
    result_value := case stage_code when 'lost' then 'lost'::public.outcome_result
      when 'disqualified' then 'disqualified'::public.outcome_result else 'archived'::public.outcome_result end;
    status_value := case stage_code when 'lost' then 'lost'::public.commercial_status
      when 'disqualified' then 'disqualified'::public.commercial_status else 'archived'::public.commercial_status end;
    effective_pipeline_id := null; effective_stage_id := null;
    previous_pipeline_id := target_pipeline_id; previous_stage_id := target_stage_id;
  elsif stage_code = 'scheduled' then
    effective_pipeline_id := '00000000-0000-4000-8000-000000000002';
    effective_stage_id := '00000000-0000-4000-8200-000000000001';
  elsif stage_code = 'won' or pipeline_code = 'post_sales' then
    result_value := 'won'; status_value := 'won';
    previous_pipeline_id := '00000000-0000-4000-8000-000000000002';
    previous_stage_id := '00000000-0000-4000-8200-000000000005';
    effective_pipeline_id := '00000000-0000-4000-8000-000000000003';
    effective_stage_id := case when pipeline_code = 'post_sales' then target_stage_id
      else '00000000-0000-4000-8300-000000000001'::uuid end;
  elsif pipeline_code = 'sales' then
    null;
  elsif pipeline_code <> 'pre_sales' then
    raise exception using errcode = '22023', message = 'Destino de criação inválido.';
  end if;

  if result_value = 'lost' and not exists (
    select 1 from public.loss_reasons where id = target_loss_reason_id and is_active
  ) then
    raise exception using errcode = '23514', message = 'Perdido exige um motivo ativo.';
  end if;

  insert into public.opportunities (
    name, company_id, contact_id, source_id, responsible_id,
    current_pipeline_id, current_stage_id, commercial_status, post_sale_status,
    description, expected_close_date, value_mode, created_directly_as_won,
    created_by, updated_by
  ) values (
    btrim(opportunity_name), target_company_id, target_contact_id, target_source_id,
    target_responsible_id, effective_pipeline_id, effective_stage_id, status_value,
    case when status_value = 'won' then 'active'::public.post_sale_status else null end,
    nullif(btrim(opportunity_description), ''), target_expected_close_date, target_value_mode,
    status_value = 'won', actor_id, actor_id
  ) returning id into opportunity_id;

  calculated_value := private.sync_opportunity_products(opportunity_id, actor_id, product_items);
  perform private.sync_qualification_answers(opportunity_id, actor_id, qualification_answers);
  effective_value := case when target_value_mode = 'manual' then requested_final_value else calculated_value end;
  update public.opportunities set final_value = effective_value where id = opportunity_id;

  if pipeline_code = 'sales' or stage_code = 'scheduled' or pipeline_code = 'post_sales' then
    perform private.record_qualification_validation(opportunity_id, op.id, actor_id);
  end if;

  if status_value = 'won' then
    if target_company_id is null or target_contact_id is null
       or jsonb_array_length(coalesce(product_items, '[]'::jsonb)) = 0
       or effective_value is null or effective_value <= 0 then
      raise exception using errcode = '23514', message = 'Ganho exige empresa, contato, produto e valor final maior que zero.';
    end if;
  end if;

  if status_value = 'won' and pipeline_code <> 'post_sales' then
    perform private.record_stage_entry(
      opportunity_id, target_pipeline_id, target_stage_id, 'creation', op.id, actor_id
    );
    entry_id := private.record_stage_entry(
      opportunity_id, effective_pipeline_id, effective_stage_id, 'transfer', op.id, actor_id
    );
  elsif status_value = 'won' then
    entry_id := private.record_stage_entry(
      opportunity_id, target_pipeline_id, target_stage_id, 'creation', op.id, actor_id
    );
  else
    entry_id := private.record_stage_entry(
      opportunity_id, coalesce(previous_pipeline_id, effective_pipeline_id),
      coalesce(previous_stage_id, effective_stage_id), 'creation', op.id, actor_id
    );
  end if;

  if result_value is not null then
    insert into public.opportunity_outcomes (
      opportunity_id, result, loss_reason_id, archive_reason, final_value,
      responsible_id, previous_pipeline_id, previous_stage_id,
      operation_id, closed_by
    ) values (
      opportunity_id, result_value,
      case when result_value = 'lost' then target_loss_reason_id else null end,
      case when result_value = 'archived' then nullif(btrim(closure_note), '') else null end,
      case when result_value = 'won' then effective_value else null end,
      target_responsible_id, previous_pipeline_id, previous_stage_id, op.id, actor_id
    ) returning id into outcome_id;
  end if;

  if status_value = 'won' then
    insert into public.post_sale_cycles (
      opportunity_id, outcome_id, current_stage_id, started_by
    ) values (opportunity_id, outcome_id, effective_stage_id, actor_id)
    returning id into cycle_id;
  end if;

  perform private.create_stage_task(
    opportunity_id, effective_stage_id, op.id, entry_id, target_responsible_id,
    task_due_date, task_due_time, task_note, cycle_id
  );

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, stage_entry_id, operation_id, metadata
  ) values (
    'opportunity_created', 'Oportunidade criada', actor_id, opportunity_id, entry_id, op.id,
    jsonb_build_object('pipeline_id', effective_pipeline_id, 'stage_id', effective_stage_id)
  );

  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', opportunity_id));
end;
$$;

create or replace function private.move_opportunity(
  request_key uuid,
  target_opportunity_id uuid,
  target_pipeline_id uuid,
  target_stage_id uuid,
  task_due_date date default null,
  task_due_time time default null,
  task_note text default null
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
  stage_code text;
  pipeline_code text;
  entry_id uuid;
begin
  op := private.start_operation('move_opportunity', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into opportunity_row from public.opportunities
  where id = target_opportunity_id for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade ativa indisponível para edição.';
  end if;

  stage_code := private.assert_stage_access(target_pipeline_id, target_stage_id);
  select code into pipeline_code from public.pipelines where id = target_pipeline_id;
  if stage_code in ('no_response','disqualified','scheduled','won','lost') or pipeline_code = 'post_sales' then
    raise exception using errcode = '22023', message = 'Use a operação específica para a etapa de saída selecionada.';
  end if;
  if pipeline_code = 'sales' and opportunity_row.current_pipeline_id <> target_pipeline_id then
    perform private.record_qualification_validation(target_opportunity_id, op.id, actor_id);
  end if;

  if opportunity_row.current_pipeline_id <> target_pipeline_id then
    perform private.cancel_pending_opportunity_tasks(target_opportunity_id, actor_id, 'transferência de funil');
  end if;

  update public.opportunities set current_pipeline_id = target_pipeline_id,
    current_stage_id = target_stage_id, updated_by = actor_id
  where id = target_opportunity_id;

  entry_id := private.record_stage_entry(
    target_opportunity_id, target_pipeline_id, target_stage_id,
    case when opportunity_row.current_pipeline_id <> target_pipeline_id then 'transfer' else 'movement' end,
    op.id, actor_id
  );
  perform private.create_stage_task(
    target_opportunity_id, target_stage_id, op.id, entry_id, opportunity_row.responsible_id,
    task_due_date, task_due_time, task_note, null
  );

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, stage_entry_id, operation_id, metadata
  ) values (
    'opportunity_moved', 'Oportunidade movimentada', actor_id, target_opportunity_id, entry_id, op.id,
    jsonb_build_object('from_pipeline_id', opportunity_row.current_pipeline_id,
      'from_stage_id', opportunity_row.current_stage_id, 'to_pipeline_id', target_pipeline_id,
      'to_stage_id', target_stage_id)
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.transfer_to_sales(
  request_key uuid,
  target_opportunity_id uuid,
  target_responsible_id uuid,
  qualification_answers jsonb,
  diagnosis_due_date date,
  diagnosis_due_time time,
  diagnosis_note text default null
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
  entry_id uuid;
  sales_pipeline_id constant uuid := '00000000-0000-4000-8000-000000000002';
  diagnosis_stage_id constant uuid := '00000000-0000-4000-8200-000000000001';
begin
  op := private.start_operation('transfer_to_sales', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into opportunity_row from public.opportunities
  where id = target_opportunity_id for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'active'
     or opportunity_row.current_pipeline_id <> '00000000-0000-4000-8000-000000000001'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade de Pré-venda indisponível para transferência.';
  end if;
  perform private.assert_stage_access(sales_pipeline_id, diagnosis_stage_id);
  perform private.require_assignable_user(target_responsible_id);
  if diagnosis_due_date is null or diagnosis_due_time is null then
    raise exception using errcode = '23514', message = 'A transferência exige data e horário da call.';
  end if;

  perform private.sync_qualification_answers(
    target_opportunity_id, actor_id, qualification_answers
  );
  perform private.record_qualification_validation(target_opportunity_id, op.id, actor_id);
  perform private.cancel_pending_opportunity_tasks(
    target_opportunity_id, actor_id, 'transferência para Venda'
  );

  update public.opportunities set current_pipeline_id = sales_pipeline_id,
    current_stage_id = diagnosis_stage_id, responsible_id = target_responsible_id,
    updated_by = actor_id where id = target_opportunity_id;
  entry_id := private.record_stage_entry(
    target_opportunity_id, sales_pipeline_id, diagnosis_stage_id,
    'transfer', op.id, actor_id
  );
  perform private.create_stage_task(
    target_opportunity_id, diagnosis_stage_id, op.id, entry_id,
    target_responsible_id, diagnosis_due_date, diagnosis_due_time,
    diagnosis_note, null
  );
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, stage_entry_id, operation_id,
    metadata
  ) values (
    'opportunity_transferred_to_sales', 'Oportunidade transferida para Venda',
    actor_id, target_opportunity_id, entry_id, op.id,
    jsonb_build_object('from_responsible_id', opportunity_row.responsible_id,
      'to_responsible_id', target_responsible_id)
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.close_opportunity(
  request_key uuid,
  target_opportunity_id uuid,
  closure_result public.outcome_result,
  target_loss_reason_id uuid default null,
  closure_note text default null,
  requested_final_value numeric default null,
  post_sale_stage_id uuid default '00000000-0000-4000-8300-000000000001',
  follow_up_due_date date default null,
  follow_up_due_time time default null
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
  outcome_id uuid;
  cycle_id uuid;
  entry_id uuid;
  effective_value numeric(14,2);
  target_status public.commercial_status;
begin
  op := private.start_operation('close_opportunity', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into opportunity_row from public.opportunities where id = target_opportunity_id for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade ativa indisponível para encerramento.';
  end if;
  if closure_result not in ('won','lost','disqualified','archived') then
    raise exception using errcode = '22023', message = 'Resultado de encerramento inválido.';
  end if;
  if closure_result = 'lost' and not exists (
    select 1 from public.loss_reasons where id = target_loss_reason_id and is_active
  ) then
    raise exception using errcode = '23514', message = 'Perdido exige um motivo ativo.';
  end if;

  effective_value := coalesce(requested_final_value, opportunity_row.final_value);
  if closure_result = 'won' then
    if opportunity_row.company_id is null or opportunity_row.contact_id is null
       or effective_value is null or effective_value <= 0
       or not exists (select 1 from public.opportunity_products where opportunity_id = target_opportunity_id) then
      raise exception using errcode = '23514', message = 'Ganho exige empresa, contato, produto e valor final maior que zero.';
    end if;
    if not exists (
      select 1 from public.pipeline_stages ps
      where ps.id = post_sale_stage_id
        and ps.pipeline_id = '00000000-0000-4000-8000-000000000003'
    ) then
      raise exception using errcode = '22023', message = 'Etapa de Pós-venda inválida.';
    end if;
  end if;

  perform private.cancel_pending_opportunity_tasks(target_opportunity_id, actor_id, closure_result::text);
  target_status := closure_result::text::public.commercial_status;

  insert into public.opportunity_outcomes (
    opportunity_id, result, loss_reason_id, archive_reason, notes, final_value,
    responsible_id, previous_pipeline_id, previous_stage_id, operation_id, closed_by
  ) values (
    target_opportunity_id, closure_result,
    case when closure_result = 'lost' then target_loss_reason_id else null end,
    case when closure_result = 'archived' then nullif(btrim(closure_note), '') else null end,
    case when closure_result <> 'archived' then nullif(btrim(closure_note), '') else null end,
    case when closure_result = 'won' then effective_value else null end,
    opportunity_row.responsible_id, opportunity_row.current_pipeline_id,
    opportunity_row.current_stage_id, op.id, actor_id
  ) returning id into outcome_id;

  if closure_result = 'won' then
    update public.opportunities set commercial_status = 'won', post_sale_status = 'active',
      current_pipeline_id = '00000000-0000-4000-8000-000000000003',
      current_stage_id = post_sale_stage_id, final_value = effective_value, updated_by = actor_id
    where id = target_opportunity_id;
    insert into public.post_sale_cycles (opportunity_id, outcome_id, current_stage_id, started_by)
    values (target_opportunity_id, outcome_id, post_sale_stage_id, actor_id)
    returning id into cycle_id;
    entry_id := private.record_stage_entry(
      target_opportunity_id, '00000000-0000-4000-8000-000000000003', post_sale_stage_id,
      'transfer', op.id, actor_id
    );
    perform private.create_stage_task(
      target_opportunity_id, post_sale_stage_id, op.id, entry_id,
      opportunity_row.responsible_id, follow_up_due_date, follow_up_due_time,
      closure_note, cycle_id
    );
  else
    update public.opportunities set commercial_status = target_status, post_sale_status = null,
      current_pipeline_id = null, current_stage_id = null, updated_by = actor_id
    where id = target_opportunity_id;
  end if;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id, metadata
  ) values (
    'opportunity_closed', 'Oportunidade encerrada', actor_id, target_opportunity_id, op.id,
    jsonb_build_object('result', closure_result, 'outcome_id', outcome_id)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'opportunity_id', target_opportunity_id, 'outcome_id', outcome_id, 'post_sale_cycle_id', cycle_id
  ));
end;
$$;

create or replace function private.restore_opportunity(
  request_key uuid,
  target_opportunity_id uuid,
  target_pipeline_id uuid,
  target_stage_id uuid,
  target_responsible_id uuid,
  task_due_date date default null,
  task_due_time time default null,
  task_note text default null
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
  outcome_row public.opportunity_outcomes;
  pipeline_code text;
  stage_code text;
  cycle_id uuid;
  entry_id uuid;
begin
  op := private.start_operation('restore_opportunity', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into opportunity_row from public.opportunities where id = target_opportunity_id for update;
  select * into outcome_row from public.opportunity_outcomes
  where opportunity_id = target_opportunity_id and is_current for update;
  if opportunity_row.id is null or outcome_row.id is null or opportunity_row.commercial_status = 'active' then
    raise exception using errcode = '22023', message = 'Negociação encerrada não encontrada.';
  end if;
  if not private.can_view_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Negociação indisponível.';
  end if;
  if outcome_row.result = 'won' and not private.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas Administradores podem reabrir negociações ganhas.';
  end if;
  perform private.require_assignable_user(target_responsible_id);
  stage_code := private.assert_stage_access(target_pipeline_id, target_stage_id);
  select code into pipeline_code from public.pipelines where id = target_pipeline_id;
  if pipeline_code not in ('pre_sales','sales')
     or stage_code in ('scheduled','no_response','disqualified','won','lost') then
    raise exception using errcode = '22023', message = 'Destino de restauração inválido.';
  end if;
  if pipeline_code = 'sales' then
    perform private.record_qualification_validation(target_opportunity_id, op.id, actor_id);
  end if;

  select id into cycle_id from public.post_sale_cycles
  where opportunity_id = target_opportunity_id and status = 'active' for update;
  if cycle_id is not null then
    perform private.cancel_pending_opportunity_tasks(target_opportunity_id, actor_id, 'reabertura', cycle_id);
    update public.post_sale_cycles set status = 'interrupted', ended_by = actor_id,
      ended_at = now(), end_reason = 'reabertura da negociação' where id = cycle_id;
  end if;

  update public.opportunity_outcomes set is_current = false,
    invalidated_by = actor_id, invalidated_at = now() where id = outcome_row.id;
  update public.opportunities set commercial_status = 'active', post_sale_status = null,
    current_pipeline_id = target_pipeline_id, current_stage_id = target_stage_id,
    responsible_id = target_responsible_id, updated_by = actor_id
  where id = target_opportunity_id;

  entry_id := private.record_stage_entry(
    target_opportunity_id, target_pipeline_id, target_stage_id,
    case when outcome_row.result = 'won' then 'reopening' else 'restoration' end,
    op.id, actor_id
  );
  perform private.create_stage_task(
    target_opportunity_id, target_stage_id, op.id, entry_id, target_responsible_id,
    task_due_date, task_due_time, task_note, null
  );

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, stage_entry_id, operation_id, metadata
  ) values (
    'opportunity_restored', 'Oportunidade restaurada', actor_id, target_opportunity_id,
    entry_id, op.id, jsonb_build_object('previous_result', outcome_row.result)
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.change_opportunity_responsible(
  request_key uuid,
  target_opportunity_id uuid,
  target_responsible_id uuid
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
  transferred_tasks integer;
begin
  op := private.start_operation('change_opportunity_responsible', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into opportunity_row from public.opportunities where id = target_opportunity_id for update;
  if opportunity_row.id is null or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para edição.';
  end if;
  perform private.require_assignable_user(target_responsible_id);

  update public.opportunities set responsible_id = target_responsible_id, updated_by = actor_id
  where id = target_opportunity_id;
  update public.tasks set responsible_id = target_responsible_id
  where opportunity_id = target_opportunity_id and creation_source = 'system'
    and status = 'pending' and deleted_at is null;
  get diagnostics transferred_tasks = row_count;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id, metadata
  ) values (
    'opportunity_responsible_changed', 'Responsável da oportunidade alterado', actor_id,
    target_opportunity_id, op.id, jsonb_build_object(
      'from_user_id', opportunity_row.responsible_id, 'to_user_id', target_responsible_id,
      'automatic_tasks_transferred', transferred_tasks
    )
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.update_opportunity_details(
  request_key uuid,
  target_opportunity_id uuid,
  opportunity_name text,
  target_company_id uuid default null,
  target_contact_id uuid default null,
  target_source_id uuid default null,
  opportunity_description text default null,
  target_expected_close_date date default null,
  target_temperature public.lead_temperature default null
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
begin
  op := private.start_operation('update_opportunity_details', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into opportunity_row from public.opportunities
  where id = target_opportunity_id for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para edição.';
  end if;
  if nullif(btrim(opportunity_name), '') is null then
    raise exception using errcode = '23514', message = 'Nome da oportunidade é obrigatório.';
  end if;
  if target_company_id is not null and not private.can_edit_company(target_company_id) then
    raise exception using errcode = '22023', message = 'Empresa ativa não encontrada.';
  end if;
  if target_contact_id is not null and not private.can_edit_contact(target_contact_id) then
    raise exception using errcode = '22023', message = 'Contato ativo não encontrado.';
  end if;
  if target_source_id is not null and not exists (
    select 1 from public.opportunity_sources os where os.id = target_source_id and os.is_active
  ) then
    raise exception using errcode = '22023', message = 'Origem ativa não encontrada.';
  end if;

  update public.opportunities set name = btrim(opportunity_name), company_id = target_company_id,
    contact_id = target_contact_id, source_id = target_source_id,
    description = nullif(btrim(opportunity_description), ''),
    expected_close_date = target_expected_close_date, temperature = target_temperature,
    updated_by = actor_id where id = target_opportunity_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id
  ) values (
    'opportunity_updated', 'Dados da oportunidade atualizados', actor_id,
    target_opportunity_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.register_contact(
  request_key uuid,
  target_opportunity_id uuid,
  contact_channel_value public.contact_channel,
  contact_occurred_at timestamptz,
  contact_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  interaction_id uuid;
begin
  op := private.start_operation('register_contact', request_key);
  if op.status = 'completed' then return op.result; end if;
  if not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para registrar contato.';
  end if;
  if contact_channel_value is null or contact_occurred_at is null then
    raise exception using errcode = '23514', message = 'Canal e data/hora do contato são obrigatórios.';
  end if;
  if contact_occurred_at > now() then
    raise exception using errcode = '22007', message = 'A data do contato não pode estar no futuro.';
  end if;
  insert into public.contact_interactions (
    opportunity_id, channel, occurred_at, notes, recorded_by
  ) values (
    target_opportunity_id, contact_channel_value, contact_occurred_at,
    nullif(btrim(contact_notes), ''), actor_id
  ) returning id into interaction_id;
  update public.opportunities set last_contact_at = greatest(
    coalesce(last_contact_at, '-infinity'::timestamptz), contact_occurred_at
  ), updated_by = actor_id where id = target_opportunity_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id, metadata
  ) values (
    'contact_registered', 'Contato registrado', actor_id, target_opportunity_id,
    op.id, jsonb_build_object('interaction_id', interaction_id, 'channel', contact_channel_value)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'opportunity_id', target_opportunity_id, 'interaction_id', interaction_id
  ));
end;
$$;

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
  calculated_value numeric(14,2);
  effective_value numeric(14,2);
begin
  op := private.start_operation('set_opportunity_products', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into opportunity_row from public.opportunities
  where id = target_opportunity_id for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'active'
     or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para edição de produtos.';
  end if;
  if requested_value_mode = 'manual' and (requested_final_value is null or requested_final_value < 0) then
    raise exception using errcode = '23514', message = 'Informe um valor manual válido.';
  end if;

  delete from public.opportunity_products where opportunity_id = target_opportunity_id;
  calculated_value := private.sync_opportunity_products(target_opportunity_id, actor_id, product_items);
  effective_value := case when requested_value_mode = 'manual'
    then requested_final_value else calculated_value end;
  update public.opportunities set value_mode = requested_value_mode,
    final_value = effective_value, updated_by = actor_id where id = target_opportunity_id;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id, metadata
  ) values (
    'opportunity_products_updated', 'Produtos e valor atualizados', actor_id,
    target_opportunity_id, op.id, jsonb_build_object('final_value', effective_value,
      'value_mode', requested_value_mode)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'opportunity_id', target_opportunity_id, 'final_value', effective_value
  ));
end;
$$;

create or replace function private.set_qualification_answers(
  request_key uuid,
  target_opportunity_id uuid,
  qualification_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
begin
  op := private.start_operation('set_qualification_answers', request_key);
  if op.status = 'completed' then return op.result; end if;
  if not exists (
    select 1 from public.opportunities o
    where o.id = target_opportunity_id and o.commercial_status = 'active'
  ) or not private.can_edit_opportunity(target_opportunity_id) then
    raise exception using errcode = '42501', message = 'Oportunidade indisponível para qualificação.';
  end if;
  perform private.sync_qualification_answers(target_opportunity_id, actor_id, qualification_answers);
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id
  ) values (
    'opportunity_qualification_updated', 'Qualificação atualizada', actor_id,
    target_opportunity_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

-- Public RPC wrappers used by Server Actions/PostgREST.
create or replace function public.create_opportunity(
  request_key uuid, opportunity_name text, target_pipeline_id uuid, target_stage_id uuid,
  target_responsible_id uuid, target_company_id uuid default null, target_contact_id uuid default null,
  target_source_id uuid default null, opportunity_description text default null,
  target_expected_close_date date default null,
  target_value_mode public.opportunity_value_mode default 'calculated',
  requested_final_value numeric default null, product_items jsonb default '[]'::jsonb,
  qualification_answers jsonb default '[]'::jsonb, target_loss_reason_id uuid default null,
  closure_note text default null, task_due_date date default null,
  task_due_time time default null, task_note text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.create_opportunity(request_key, opportunity_name, target_pipeline_id,
    target_stage_id, target_responsible_id, target_company_id, target_contact_id,
    target_source_id, opportunity_description, target_expected_close_date,
    target_value_mode, requested_final_value, product_items, qualification_answers,
    target_loss_reason_id, closure_note, task_due_date, task_due_time, task_note);
$$;

create or replace function public.move_opportunity(
  request_key uuid, target_opportunity_id uuid, target_pipeline_id uuid,
  target_stage_id uuid, task_due_date date default null,
  task_due_time time default null, task_note text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.move_opportunity(request_key, target_opportunity_id, target_pipeline_id,
    target_stage_id, task_due_date, task_due_time, task_note);
$$;

create or replace function public.transfer_to_sales(
  request_key uuid, target_opportunity_id uuid, target_responsible_id uuid,
  qualification_answers jsonb, diagnosis_due_date date,
  diagnosis_due_time time, diagnosis_note text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.transfer_to_sales(request_key, target_opportunity_id,
    target_responsible_id, qualification_answers, diagnosis_due_date,
    diagnosis_due_time, diagnosis_note);
$$;

create or replace function public.close_opportunity(
  request_key uuid, target_opportunity_id uuid, closure_result public.outcome_result,
  target_loss_reason_id uuid default null, closure_note text default null,
  requested_final_value numeric default null,
  post_sale_stage_id uuid default '00000000-0000-4000-8300-000000000001',
  follow_up_due_date date default null, follow_up_due_time time default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.close_opportunity(request_key, target_opportunity_id, closure_result,
    target_loss_reason_id, closure_note, requested_final_value, post_sale_stage_id,
    follow_up_due_date, follow_up_due_time);
$$;

create or replace function public.restore_opportunity(
  request_key uuid, target_opportunity_id uuid, target_pipeline_id uuid,
  target_stage_id uuid, target_responsible_id uuid, task_due_date date default null,
  task_due_time time default null, task_note text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.restore_opportunity(request_key, target_opportunity_id, target_pipeline_id,
    target_stage_id, target_responsible_id, task_due_date, task_due_time, task_note);
$$;

create or replace function public.change_opportunity_responsible(
  request_key uuid, target_opportunity_id uuid, target_responsible_id uuid
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.change_opportunity_responsible(request_key, target_opportunity_id, target_responsible_id);
$$;

create or replace function public.update_opportunity_details(
  request_key uuid, target_opportunity_id uuid, opportunity_name text,
  target_company_id uuid default null, target_contact_id uuid default null,
  target_source_id uuid default null, opportunity_description text default null,
  target_expected_close_date date default null,
  target_temperature public.lead_temperature default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.update_opportunity_details(request_key, target_opportunity_id,
    opportunity_name, target_company_id, target_contact_id, target_source_id,
    opportunity_description, target_expected_close_date, target_temperature);
$$;

create or replace function public.register_contact(
  request_key uuid, target_opportunity_id uuid,
  contact_channel_value public.contact_channel, contact_occurred_at timestamptz,
  contact_notes text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.register_contact(request_key, target_opportunity_id,
    contact_channel_value, contact_occurred_at, contact_notes);
$$;

create or replace function public.set_opportunity_products(
  request_key uuid, target_opportunity_id uuid, product_items jsonb,
  requested_value_mode public.opportunity_value_mode,
  requested_final_value numeric default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.set_opportunity_products(request_key, target_opportunity_id,
    product_items, requested_value_mode, requested_final_value);
$$;

create or replace function public.set_qualification_answers(
  request_key uuid, target_opportunity_id uuid, qualification_answers jsonb
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.set_qualification_answers(request_key, target_opportunity_id, qualification_answers);
$$;

revoke all on function private.guard_active_qualification_parameter_limit() from public, anon, authenticated;
revoke all on function private.require_active_user() from public, anon, authenticated;
revoke all on function private.require_assignable_user(uuid) from public, anon, authenticated;
revoke all on function private.start_operation(text, uuid) from public, anon, authenticated;
revoke all on function private.finish_operation(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.assert_stage_access(uuid, uuid) from public, anon, authenticated;
revoke all on function private.validate_sales_qualification(uuid) from public, anon, authenticated;
revoke all on function private.record_qualification_validation(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.cancel_pending_opportunity_tasks(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.record_stage_entry(uuid, uuid, uuid, public.stage_entry_source, uuid, uuid) from public, anon, authenticated;
revoke all on function private.create_stage_task(uuid, uuid, uuid, uuid, uuid, date, time, text, uuid) from public, anon, authenticated;
revoke all on function private.sync_opportunity_products(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.sync_qualification_answers(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.create_opportunity(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, date, public.opportunity_value_mode, numeric, jsonb, jsonb, uuid, text, date, time, text) from public, anon, authenticated;
revoke all on function private.move_opportunity(uuid, uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function private.transfer_to_sales(uuid, uuid, uuid, jsonb, date, time, text) from public, anon, authenticated;
revoke all on function private.close_opportunity(uuid, uuid, public.outcome_result, uuid, text, numeric, uuid, date, time) from public, anon, authenticated;
revoke all on function private.restore_opportunity(uuid, uuid, uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function private.change_opportunity_responsible(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.update_opportunity_details(uuid, uuid, text, uuid, uuid, uuid, text, date, public.lead_temperature) from public, anon, authenticated;
revoke all on function private.register_contact(uuid, uuid, public.contact_channel, timestamptz, text) from public, anon, authenticated;
revoke all on function private.set_opportunity_products(uuid, uuid, jsonb, public.opportunity_value_mode, numeric) from public, anon, authenticated;
revoke all on function private.set_qualification_answers(uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function private.create_opportunity(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, date, public.opportunity_value_mode, numeric, jsonb, jsonb, uuid, text, date, time, text) to authenticated;
grant execute on function private.move_opportunity(uuid, uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function private.transfer_to_sales(uuid, uuid, uuid, jsonb, date, time, text) to authenticated;
grant execute on function private.close_opportunity(uuid, uuid, public.outcome_result, uuid, text, numeric, uuid, date, time) to authenticated;
grant execute on function private.restore_opportunity(uuid, uuid, uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function private.change_opportunity_responsible(uuid, uuid, uuid) to authenticated;
grant execute on function private.update_opportunity_details(uuid, uuid, text, uuid, uuid, uuid, text, date, public.lead_temperature) to authenticated;
grant execute on function private.register_contact(uuid, uuid, public.contact_channel, timestamptz, text) to authenticated;
grant execute on function private.set_opportunity_products(uuid, uuid, jsonb, public.opportunity_value_mode, numeric) to authenticated;
grant execute on function private.set_qualification_answers(uuid, uuid, jsonb) to authenticated;

revoke all on function public.create_opportunity(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, date, public.opportunity_value_mode, numeric, jsonb, jsonb, uuid, text, date, time, text) from public, anon, authenticated;
revoke all on function public.move_opportunity(uuid, uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function public.transfer_to_sales(uuid, uuid, uuid, jsonb, date, time, text) from public, anon, authenticated;
revoke all on function public.close_opportunity(uuid, uuid, public.outcome_result, uuid, text, numeric, uuid, date, time) from public, anon, authenticated;
revoke all on function public.restore_opportunity(uuid, uuid, uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function public.change_opportunity_responsible(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_opportunity_details(uuid, uuid, text, uuid, uuid, uuid, text, date, public.lead_temperature) from public, anon, authenticated;
revoke all on function public.register_contact(uuid, uuid, public.contact_channel, timestamptz, text) from public, anon, authenticated;
revoke all on function public.set_opportunity_products(uuid, uuid, jsonb, public.opportunity_value_mode, numeric) from public, anon, authenticated;
revoke all on function public.set_qualification_answers(uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.create_opportunity(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, date, public.opportunity_value_mode, numeric, jsonb, jsonb, uuid, text, date, time, text) to authenticated;
grant execute on function public.move_opportunity(uuid, uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function public.transfer_to_sales(uuid, uuid, uuid, jsonb, date, time, text) to authenticated;
grant execute on function public.close_opportunity(uuid, uuid, public.outcome_result, uuid, text, numeric, uuid, date, time) to authenticated;
grant execute on function public.restore_opportunity(uuid, uuid, uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function public.change_opportunity_responsible(uuid, uuid, uuid) to authenticated;
grant execute on function public.update_opportunity_details(uuid, uuid, text, uuid, uuid, uuid, text, date, public.lead_temperature) to authenticated;
grant execute on function public.register_contact(uuid, uuid, public.contact_channel, timestamptz, text) to authenticated;
grant execute on function public.set_opportunity_products(uuid, uuid, jsonb, public.opportunity_value_mode, numeric) to authenticated;
grant execute on function public.set_qualification_answers(uuid, uuid, jsonb) to authenticated;

comment on function public.create_opportunity(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, text, date, public.opportunity_value_mode, numeric, jsonb, jsonb, uuid, text, date, time, text)
  is 'Creates one opportunity in any allowed stage and applies the destination rules atomically.';
