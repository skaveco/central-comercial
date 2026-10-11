-- Fixes identified by Supabase db lint and performance advisors.

create or replace function private.start_operation(operation_name text, request_key uuid)
returns public.business_operations
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor_id uuid := private.require_active_user();
  operation_row public.business_operations;
begin
  if request_key is null then
    raise exception using errcode = '22023', message = 'A chave de idempotência é obrigatória.';
  end if;

  insert into public.business_operations (actor_id, operation_type, idempotency_key)
  values (current_actor_id, operation_name, request_key)
  on conflict (actor_id, operation_type, idempotency_key) do nothing
  returning * into operation_row;

  if operation_row.id is null then
    select * into operation_row
    from public.business_operations bo
    where bo.actor_id = current_actor_id
      and bo.operation_type = operation_name
      and bo.idempotency_key = request_key
    for update;
  end if;

  return operation_row;
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
  status_value public.commercial_status := 'active'::public.commercial_status;
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
    result_value := 'won'::public.outcome_result; status_value := 'won'::public.commercial_status;
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
    (case when opportunity_row.current_pipeline_id <> target_pipeline_id then 'transfer' else 'movement' end)::public.stage_entry_source,
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
  sales_pipeline_id constant uuid := '00000000-0000-4000-8000-000000000002'::uuid;
  diagnosis_stage_id constant uuid := '00000000-0000-4000-8200-000000000001'::uuid;
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
    (case when outcome_row.result = 'won' then 'reopening' else 'restoration' end)::public.stage_entry_source,
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

create or replace function private.complete_task(
  request_key uuid,
  target_task_id uuid,
  had_contact boolean default null,
  contact_channel_value public.contact_channel default null,
  contact_occurred_at timestamptz default null,
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
  task_row public.tasks;
  opportunity_row public.opportunities;
  interaction_id uuid;
  entry_id uuid;
  proposal_stage_id constant uuid := '00000000-0000-4000-8200-000000000002'::uuid;
begin
  op := private.start_operation('complete_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into task_row from public.tasks where id = target_task_id for update;
  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível para conclusão.';
  end if;
  if task_row.status <> 'pending' then
    raise exception using errcode = '23514', message = 'Somente tarefas pendentes podem ser concluídas.';
  end if;
  if task_row.type <> 'management' and had_contact is null then
    raise exception using errcode = '23514', message = 'Informe se houve contato.';
  end if;
  if had_contact then
    if task_row.opportunity_id is null or contact_channel_value is null or contact_occurred_at is null then
      raise exception using errcode = '23514', message = 'Contato exige oportunidade, canal e data/hora.';
    end if;
    if contact_occurred_at > now() then
      raise exception using errcode = '22007', message = 'A data do contato não pode estar no futuro.';
    end if;
    insert into public.contact_interactions (
      opportunity_id, task_id, channel, occurred_at, notes, recorded_by
    ) values (
      task_row.opportunity_id, target_task_id, contact_channel_value,
      contact_occurred_at, nullif(btrim(contact_notes), ''), actor_id
    ) returning id into interaction_id;
    update public.opportunities set last_contact_at = greatest(
      coalesce(last_contact_at, '-infinity'::timestamptz), contact_occurred_at
    ), updated_by = actor_id where id = task_row.opportunity_id;
  end if;

  update public.tasks set status = 'completed', completed_by = actor_id,
    completed_at = now() where id = target_task_id;

  if had_contact and task_row.automation_key = 'sales_diagnosis' then
    select * into opportunity_row from public.opportunities
    where id = task_row.opportunity_id for update;
    if opportunity_row.commercial_status = 'active'
       and opportunity_row.current_stage_id = '00000000-0000-4000-8200-000000000001' then
      update public.opportunities set current_stage_id = proposal_stage_id,
        updated_by = actor_id where id = opportunity_row.id;
      entry_id := private.record_stage_entry(
        opportunity_row.id, opportunity_row.current_pipeline_id, proposal_stage_id,
        'automation', op.id, actor_id
      );
      perform private.create_stage_task(
        opportunity_row.id, proposal_stage_id, op.id, entry_id,
        opportunity_row.responsible_id, null, null, null, null
      );
    end if;
  end if;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id,
    task_id, stage_entry_id, operation_id, metadata
  ) values (
    'task_completed', 'Tarefa concluída', actor_id, task_row.opportunity_id,
    task_row.company_id, task_row.contact_id, target_task_id, entry_id, op.id,
    jsonb_build_object('had_contact', coalesce(had_contact, false), 'interaction_id', interaction_id)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'task_id', target_task_id, 'interaction_id', interaction_id
  ));
end;
$$;

-- Evaluate auth.uid() once per statement in RLS policies instead of once per row.
do $$
declare
  policy_row record;
  using_expression text;
  check_expression text;
  command text;
begin
  for policy_row in
    select
      p.polname,
      n.nspname as schema_name,
      c.relname as table_name,
      pg_get_expr(p.polqual, p.polrelid) as using_expression,
      pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%auth.uid()%'
      )
  loop
    using_expression := replace(policy_row.using_expression, 'auth.uid()', '(select auth.uid())');
    check_expression := replace(policy_row.check_expression, 'auth.uid()', '(select auth.uid())');
    command := format('alter policy %I on %I.%I', policy_row.polname, policy_row.schema_name, policy_row.table_name);

    if using_expression is not null then
      command := command || format(' using (%s)', using_expression);
    end if;
    if check_expression is not null then
      command := command || format(' with check (%s)', check_expression);
    end if;

    execute command;
  end loop;
end;
$$;
