-- Central Comercial: controlled task lifecycle and post-sale transactions.

create or replace function private.task_flow_is_active(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when t.post_sale_cycle_id is not null then exists (
        select 1 from public.post_sale_cycles psc
        where psc.id = t.post_sale_cycle_id and psc.status = 'active'
      )
      when t.opportunity_id is not null then exists (
        select 1 from public.opportunities o
        where o.id = t.opportunity_id and o.commercial_status = 'active'
      )
      else true
    end
    from public.tasks t where t.id = target_task_id and t.deleted_at is null
  ), false);
$$;

create or replace function private.validate_task_links(
  target_opportunity_id uuid,
  target_company_id uuid,
  target_contact_id uuid,
  target_post_sale_cycle_id uuid
)
returns table (company_id uuid, contact_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  opportunity_row public.opportunities;
begin
  company_id := target_company_id;
  contact_id := target_contact_id;

  if target_opportunity_id is not null then
    select * into opportunity_row from public.opportunities where id = target_opportunity_id;
    if opportunity_row.id is null or not private.can_edit_opportunity(target_opportunity_id) then
      raise exception using errcode = '42501', message = 'Oportunidade indisponível para a tarefa.';
    end if;
    if company_id is null then company_id := opportunity_row.company_id; end if;
    if contact_id is null then contact_id := opportunity_row.contact_id; end if;
    if company_id is distinct from opportunity_row.company_id
       or contact_id is distinct from opportunity_row.contact_id then
      raise exception using errcode = '22023', message = 'Empresa e contato devem corresponder aos vínculos da oportunidade.';
    end if;
  end if;

  if company_id is not null and not private.can_view_company(company_id) then
    raise exception using errcode = '42501', message = 'Empresa indisponível para a tarefa.';
  end if;
  if contact_id is not null and not private.can_view_contact(contact_id) then
    raise exception using errcode = '42501', message = 'Contato indisponível para a tarefa.';
  end if;

  if target_post_sale_cycle_id is not null and not exists (
    select 1 from public.post_sale_cycles psc
    where psc.id = target_post_sale_cycle_id
      and psc.opportunity_id = target_opportunity_id
      and psc.status = 'active'
      and private.current_profile_role() in ('admin', 'commercial')
  ) then
    raise exception using errcode = '42501', message = 'Ciclo de Pós-venda indisponível para a tarefa.';
  end if;

  return next;
end;
$$;

create or replace function private.create_task(
  request_key uuid,
  task_title text,
  task_type_value public.task_type,
  target_responsible_id uuid,
  target_due_date date,
  target_due_time time default null,
  task_description text default null,
  target_opportunity_id uuid default null,
  target_company_id uuid default null,
  target_contact_id uuid default null,
  target_post_sale_cycle_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  links record;
  task_id uuid;
begin
  op := private.start_operation('create_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  if nullif(btrim(task_title), '') is null or target_due_date is null then
    raise exception using errcode = '23514', message = 'Nome, tipo, responsável e vencimento são obrigatórios.';
  end if;
  perform private.require_assignable_user(target_responsible_id);
  select * into links from private.validate_task_links(
    target_opportunity_id, target_company_id, target_contact_id, target_post_sale_cycle_id
  );

  insert into public.tasks (
    title, type, responsible_id, due_date, due_time, description,
    opportunity_id, company_id, contact_id, post_sale_cycle_id,
    status, creation_source, created_by, operation_id
  ) values (
    btrim(task_title), task_type_value, target_responsible_id, target_due_date,
    target_due_time, nullif(btrim(task_description), ''), target_opportunity_id,
    links.company_id, links.contact_id, target_post_sale_cycle_id,
    'pending', 'manual', actor_id, op.id
  ) returning id into task_id;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id,
    task_id, operation_id
  ) values (
    'task_created', 'Tarefa criada', actor_id, target_opportunity_id,
    links.company_id, links.contact_id, task_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('task_id', task_id));
end;
$$;

create or replace function private.update_task(
  request_key uuid,
  target_task_id uuid,
  task_title text,
  task_type_value public.task_type,
  target_responsible_id uuid,
  target_due_date date,
  target_due_time time default null,
  task_description text default null
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
begin
  op := private.start_operation('update_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into task_row from public.tasks where id = target_task_id for update;
  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível para edição.';
  end if;
  if task_row.status <> 'pending' then
    raise exception using errcode = '23514', message = 'Somente tarefas pendentes podem ser editadas.';
  end if;
  if nullif(btrim(task_title), '') is null or target_due_date is null then
    raise exception using errcode = '23514', message = 'Nome, tipo, responsável e vencimento são obrigatórios.';
  end if;
  perform private.require_assignable_user(target_responsible_id);

  update public.tasks set title = btrim(task_title), type = task_type_value,
    responsible_id = target_responsible_id, due_date = target_due_date,
    due_time = target_due_time, description = nullif(btrim(task_description), '')
  where id = target_task_id;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id,
    task_id, operation_id
  ) values (
    'task_updated', 'Tarefa atualizada', actor_id, task_row.opportunity_id,
    task_row.company_id, task_row.contact_id, target_task_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('task_id', target_task_id));
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
  proposal_stage_id constant uuid := '00000000-0000-4000-8200-000000000002';
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

create or replace function private.reopen_task(request_key uuid, target_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  task_row public.tasks;
begin
  op := private.start_operation('reopen_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into task_row from public.tasks where id = target_task_id for update;
  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível.';
  end if;
  if task_row.status <> 'completed' or not private.task_flow_is_active(target_task_id) then
    raise exception using errcode = '23514', message = 'Esta tarefa não pode voltar para Pendente.';
  end if;
  update public.tasks set status = 'pending', completed_by = null,
    completed_at = null where id = target_task_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id, task_id, operation_id
  ) values (
    'task_reopened', 'Tarefa marcada como pendente', actor_id, task_row.opportunity_id,
    task_row.company_id, task_row.contact_id, target_task_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('task_id', target_task_id));
end;
$$;

create or replace function private.reschedule_task(
  request_key uuid, target_task_id uuid, target_due_date date, target_due_time time default null
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
begin
  op := private.start_operation('reschedule_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into task_row from public.tasks where id = target_task_id for update;
  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível.';
  end if;
  if task_row.status <> 'pending' or target_due_date is null then
    raise exception using errcode = '23514', message = 'Somente tarefas pendentes podem ser reagendadas.';
  end if;
  update public.tasks set due_date = target_due_date, due_time = target_due_time
  where id = target_task_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id,
    task_id, operation_id, metadata
  ) values (
    'task_rescheduled', 'Tarefa reagendada', actor_id, task_row.opportunity_id,
    task_row.company_id, task_row.contact_id, target_task_id, op.id,
    jsonb_build_object('previous_due_date', task_row.due_date,
      'previous_due_time', task_row.due_time, 'new_due_date', target_due_date,
      'new_due_time', target_due_time)
  );
  return private.finish_operation(op.id, jsonb_build_object('task_id', target_task_id));
end;
$$;

create or replace function private.delete_task(request_key uuid, target_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  task_row public.tasks;
begin
  op := private.start_operation('delete_task', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into task_row from public.tasks where id = target_task_id for update;
  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível para exclusão.';
  end if;
  update public.tasks set deleted_by = actor_id, deleted_at = now()
  where id = target_task_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id, task_id, operation_id
  ) values (
    'task_deleted', 'Tarefa excluída', actor_id, task_row.opportunity_id,
    task_row.company_id, task_row.contact_id, target_task_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('task_id', target_task_id));
end;
$$;

create or replace function private.register_attachment(
  request_key uuid,
  target_bucket_id text,
  target_object_path text,
  target_original_name text,
  target_mime_type text,
  target_size_bytes bigint,
  target_company_id uuid default null,
  target_opportunity_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  attachment_id uuid;
  parent_id uuid := coalesce(target_company_id, target_opportunity_id);
begin
  op := private.start_operation('register_attachment', request_key);
  if op.status = 'completed' then return op.result; end if;
  if num_nonnulls(target_company_id, target_opportunity_id) <> 1 then
    raise exception using errcode = '23514', message = 'O anexo deve pertencer a uma empresa ou oportunidade.';
  end if;
  if nullif(btrim(target_original_name), '') is null
     or nullif(btrim(target_object_path), '') is null then
    raise exception using errcode = '23514', message = 'Nome e caminho do arquivo são obrigatórios.';
  end if;
  if target_size_bytes <= 0 or target_size_bytes > 20971520 then
    raise exception using errcode = '23514', message = 'O arquivo deve ter até 20 MB.';
  end if;
  if target_object_path not like parent_id::text || '/%' then
    raise exception using errcode = '22023', message = 'O caminho do arquivo não corresponde ao registro.';
  end if;

  if target_company_id is not null then
    if target_bucket_id <> 'company-attachments'
       or not private.can_edit_company(target_company_id)
       or target_mime_type not in (
         'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain'
       ) then
      raise exception using errcode = '42501', message = 'Arquivo ou empresa indisponível para anexo.';
    end if;
  else
    if target_bucket_id <> 'opportunity-attachments'
       or not private.can_edit_opportunity(target_opportunity_id)
       or target_mime_type not in ('application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml') then
      raise exception using errcode = '42501', message = 'Arquivo ou oportunidade indisponível para anexo.';
    end if;
  end if;

  if not exists (
    select 1 from storage.objects so
    where so.bucket_id = target_bucket_id and so.name = target_object_path
  ) then
    raise exception using errcode = 'P0002', message = 'Upload concluído não encontrado no Storage.';
  end if;

  insert into public.attachments (
    company_id, opportunity_id, bucket_id, object_path, original_name,
    mime_type, size_bytes, uploaded_by
  ) values (
    target_company_id, target_opportunity_id, target_bucket_id, target_object_path,
    btrim(target_original_name), target_mime_type, target_size_bytes, actor_id
  ) returning id into attachment_id;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, operation_id, metadata
  ) values (
    'attachment_added', 'Anexo adicionado', actor_id, target_opportunity_id,
    target_company_id, op.id, jsonb_build_object('attachment_id', attachment_id)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'attachment_id', attachment_id, 'bucket_id', target_bucket_id,
    'object_path', target_object_path
  ));
end;
$$;

create or replace function private.remove_attachment(request_key uuid, target_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  attachment_row public.attachments;
begin
  op := private.start_operation('remove_attachment', request_key);
  if op.status = 'completed' then return op.result; end if;
  select * into attachment_row from public.attachments
  where id = target_attachment_id and removed_at is null for update;
  if attachment_row.id is null or not (
    (attachment_row.company_id is not null and private.can_edit_company(attachment_row.company_id))
    or (attachment_row.opportunity_id is not null and private.can_edit_opportunity(attachment_row.opportunity_id))
  ) then
    raise exception using errcode = '42501', message = 'Anexo indisponível para remoção.';
  end if;

  update public.attachments set removed_by = actor_id, removed_at = now()
  where id = target_attachment_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, operation_id, metadata
  ) values (
    'attachment_removed', 'Anexo removido', actor_id, attachment_row.opportunity_id,
    attachment_row.company_id, op.id, jsonb_build_object('attachment_id', target_attachment_id)
  );
  return private.finish_operation(op.id, jsonb_build_object(
    'attachment_id', target_attachment_id, 'bucket_id', attachment_row.bucket_id,
    'object_path', attachment_row.object_path
  ));
end;
$$;

create or replace function private.move_post_sale(
  request_key uuid,
  target_opportunity_id uuid,
  target_stage_id uuid,
  follow_up_due_date date default null,
  follow_up_due_time time default null,
  follow_up_note text default null
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
  cycle_row public.post_sale_cycles;
  entry_id uuid;
begin
  op := private.start_operation('move_post_sale', request_key);
  if op.status = 'completed' then return op.result; end if;
  if private.current_profile_role() not in ('admin','commercial') then
    raise exception using errcode = '42501', message = 'Seu cargo não pode operar o Pós-venda.';
  end if;
  select * into opportunity_row from public.opportunities
  where id = target_opportunity_id for update;
  select * into cycle_row from public.post_sale_cycles
  where opportunity_id = target_opportunity_id and status = 'active' for update;
  if opportunity_row.id is null or opportunity_row.commercial_status <> 'won'
     or opportunity_row.post_sale_status <> 'active' or cycle_row.id is null then
    raise exception using errcode = '22023', message = 'Acompanhamento ativo não encontrado.';
  end if;
  perform private.assert_stage_access('00000000-0000-4000-8000-000000000003', target_stage_id);

  update public.opportunities set current_stage_id = target_stage_id,
    updated_by = actor_id where id = target_opportunity_id;
  update public.post_sale_cycles set current_stage_id = target_stage_id where id = cycle_row.id;
  entry_id := private.record_stage_entry(
    target_opportunity_id, '00000000-0000-4000-8000-000000000003',
    target_stage_id, 'movement', op.id, actor_id
  );
  perform private.create_stage_task(
    target_opportunity_id, target_stage_id, op.id, entry_id,
    opportunity_row.responsible_id, follow_up_due_date, follow_up_due_time,
    follow_up_note, cycle_row.id
  );
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, stage_entry_id, operation_id,
    metadata
  ) values (
    'post_sale_moved', 'Acompanhamento movimentado', actor_id, target_opportunity_id,
    entry_id, op.id, jsonb_build_object('to_stage_id', target_stage_id)
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

create or replace function private.finish_post_sale(request_key uuid, target_opportunity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_active_user();
  op public.business_operations;
  cycle_row public.post_sale_cycles;
begin
  op := private.start_operation('finish_post_sale', request_key);
  if op.status = 'completed' then return op.result; end if;
  if private.current_profile_role() not in ('admin','commercial') then
    raise exception using errcode = '42501', message = 'Seu cargo não pode finalizar o Pós-venda.';
  end if;
  select * into cycle_row from public.post_sale_cycles
  where opportunity_id = target_opportunity_id and status = 'active' for update;
  if cycle_row.id is null then
    raise exception using errcode = '22023', message = 'Acompanhamento ativo não encontrado.';
  end if;
  perform private.cancel_pending_opportunity_tasks(
    target_opportunity_id, actor_id, 'finalização do acompanhamento', cycle_row.id
  );
  update public.post_sale_cycles set status = 'finished', ended_by = actor_id,
    ended_at = now(), end_reason = 'acompanhamento finalizado' where id = cycle_row.id;
  update public.opportunities set post_sale_status = 'finished', updated_by = actor_id
  where id = target_opportunity_id;
  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, operation_id
  ) values (
    'post_sale_finished', 'Acompanhamento finalizado', actor_id, target_opportunity_id, op.id
  );
  return private.finish_operation(op.id, jsonb_build_object('opportunity_id', target_opportunity_id));
end;
$$;

-- Public RPC wrappers.
create or replace function public.create_task(
  request_key uuid, task_title text, task_type_value public.task_type,
  target_responsible_id uuid, target_due_date date, target_due_time time default null,
  task_description text default null, target_opportunity_id uuid default null,
  target_company_id uuid default null, target_contact_id uuid default null,
  target_post_sale_cycle_id uuid default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.create_task(request_key, task_title, task_type_value,
    target_responsible_id, target_due_date, target_due_time, task_description,
    target_opportunity_id, target_company_id, target_contact_id, target_post_sale_cycle_id);
$$;

create or replace function public.update_task(
  request_key uuid, target_task_id uuid, task_title text,
  task_type_value public.task_type, target_responsible_id uuid,
  target_due_date date, target_due_time time default null,
  task_description text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.update_task(request_key, target_task_id, task_title, task_type_value,
    target_responsible_id, target_due_date, target_due_time, task_description);
$$;

create or replace function public.complete_task(
  request_key uuid, target_task_id uuid, had_contact boolean default null,
  contact_channel_value public.contact_channel default null,
  contact_occurred_at timestamptz default null, contact_notes text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.complete_task(request_key, target_task_id, had_contact,
    contact_channel_value, contact_occurred_at, contact_notes);
$$;

create or replace function public.reopen_task(request_key uuid, target_task_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.reopen_task(request_key, target_task_id);
$$;

create or replace function public.reschedule_task(
  request_key uuid, target_task_id uuid, target_due_date date,
  target_due_time time default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.reschedule_task(request_key, target_task_id, target_due_date, target_due_time);
$$;

create or replace function public.delete_task(request_key uuid, target_task_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.delete_task(request_key, target_task_id);
$$;

create or replace function public.register_attachment(
  request_key uuid, target_bucket_id text, target_object_path text,
  target_original_name text, target_mime_type text, target_size_bytes bigint,
  target_company_id uuid default null, target_opportunity_id uuid default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.register_attachment(request_key, target_bucket_id, target_object_path,
    target_original_name, target_mime_type, target_size_bytes,
    target_company_id, target_opportunity_id);
$$;

create or replace function public.remove_attachment(request_key uuid, target_attachment_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.remove_attachment(request_key, target_attachment_id);
$$;

create or replace function public.move_post_sale(
  request_key uuid, target_opportunity_id uuid, target_stage_id uuid,
  follow_up_due_date date default null, follow_up_due_time time default null,
  follow_up_note text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.move_post_sale(request_key, target_opportunity_id, target_stage_id,
    follow_up_due_date, follow_up_due_time, follow_up_note);
$$;

create or replace function public.finish_post_sale(request_key uuid, target_opportunity_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.finish_post_sale(request_key, target_opportunity_id);
$$;

revoke all on function private.task_flow_is_active(uuid) from public, anon, authenticated;
revoke all on function private.validate_task_links(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.create_task(uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.update_task(uuid, uuid, text, public.task_type, uuid, date, time, text) from public, anon, authenticated;
revoke all on function private.complete_task(uuid, uuid, boolean, public.contact_channel, timestamptz, text) from public, anon, authenticated;
revoke all on function private.reopen_task(uuid, uuid) from public, anon, authenticated;
revoke all on function private.reschedule_task(uuid, uuid, date, time) from public, anon, authenticated;
revoke all on function private.delete_task(uuid, uuid) from public, anon, authenticated;
revoke all on function private.register_attachment(uuid, text, text, text, text, bigint, uuid, uuid) from public, anon, authenticated;
revoke all on function private.remove_attachment(uuid, uuid) from public, anon, authenticated;
revoke all on function private.move_post_sale(uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function private.finish_post_sale(uuid, uuid) from public, anon, authenticated;

grant execute on function private.create_task(uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.update_task(uuid, uuid, text, public.task_type, uuid, date, time, text) to authenticated;
grant execute on function private.complete_task(uuid, uuid, boolean, public.contact_channel, timestamptz, text) to authenticated;
grant execute on function private.reopen_task(uuid, uuid) to authenticated;
grant execute on function private.reschedule_task(uuid, uuid, date, time) to authenticated;
grant execute on function private.delete_task(uuid, uuid) to authenticated;
grant execute on function private.register_attachment(uuid, text, text, text, text, bigint, uuid, uuid) to authenticated;
grant execute on function private.remove_attachment(uuid, uuid) to authenticated;
grant execute on function private.move_post_sale(uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function private.finish_post_sale(uuid, uuid) to authenticated;

revoke all on function public.create_task(uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_task(uuid, uuid, text, public.task_type, uuid, date, time, text) from public, anon, authenticated;
revoke all on function public.complete_task(uuid, uuid, boolean, public.contact_channel, timestamptz, text) from public, anon, authenticated;
revoke all on function public.reopen_task(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reschedule_task(uuid, uuid, date, time) from public, anon, authenticated;
revoke all on function public.delete_task(uuid, uuid) from public, anon, authenticated;
revoke all on function public.register_attachment(uuid, text, text, text, text, bigint, uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_attachment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.move_post_sale(uuid, uuid, uuid, date, time, text) from public, anon, authenticated;
revoke all on function public.finish_post_sale(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_task(uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.update_task(uuid, uuid, text, public.task_type, uuid, date, time, text) to authenticated;
grant execute on function public.complete_task(uuid, uuid, boolean, public.contact_channel, timestamptz, text) to authenticated;
grant execute on function public.reopen_task(uuid, uuid) to authenticated;
grant execute on function public.reschedule_task(uuid, uuid, date, time) to authenticated;
grant execute on function public.delete_task(uuid, uuid) to authenticated;
grant execute on function public.register_attachment(uuid, text, text, text, text, bigint, uuid, uuid) to authenticated;
grant execute on function public.remove_attachment(uuid, uuid) to authenticated;
grant execute on function public.move_post_sale(uuid, uuid, uuid, date, time, text) to authenticated;
grant execute on function public.finish_post_sale(uuid, uuid) to authenticated;
