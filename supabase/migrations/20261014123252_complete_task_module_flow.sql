-- Complete the task module contract before exposing the main Tasks screen.
-- Existing RPC signatures remain available; the UI uses update_task_with_links
-- when the task relationships may change.

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
    select * into opportunity_row
    from public.opportunities
    where id = target_opportunity_id;

    if opportunity_row.id is null or not private.can_edit_opportunity(target_opportunity_id) then
      raise exception using errcode = '42501', message = 'Oportunidade indisponível para a tarefa.';
    end if;

    if company_id is null then company_id := opportunity_row.company_id; end if;
    if contact_id is null then contact_id := opportunity_row.contact_id; end if;

    if company_id is distinct from opportunity_row.company_id
       or contact_id is distinct from opportunity_row.contact_id then
      raise exception using errcode = '22023', message = 'Empresa e contato devem corresponder aos vínculos da oportunidade.';
    end if;
  else
    if company_id is not null and not private.can_edit_company(company_id) then
      raise exception using errcode = '42501', message = 'Empresa inativa ou indisponível para a tarefa.';
    end if;

    if contact_id is not null and not private.can_edit_contact(contact_id) then
      raise exception using errcode = '42501', message = 'Contato inativo ou indisponível para a tarefa.';
    end if;

    if company_id is not null and contact_id is not null and not exists (
      select 1
      from public.company_contacts cc
      where cc.company_id = company_id
        and cc.contact_id = contact_id
        and cc.is_active
    ) then
      raise exception using errcode = '23514', message = 'O contato selecionado não está vinculado à empresa.';
    end if;
  end if;

  if target_post_sale_cycle_id is not null and not exists (
    select 1
    from public.post_sale_cycles psc
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

create or replace function private.require_task_responsible_access(
  target_responsible_id uuid,
  target_opportunity_id uuid,
  target_post_sale_cycle_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  responsible_role public.app_role;
  pipeline_code text;
begin
  perform private.require_assignable_user(target_responsible_id);

  select p.role into responsible_role
  from public.profiles p
  where p.id = target_responsible_id
    and p.access_status = 'active';

  if target_opportunity_id is null then
    return;
  end if;

  select pl.code into pipeline_code
  from public.opportunities o
  join public.pipelines pl on pl.id = o.current_pipeline_id
  where o.id = target_opportunity_id;

  if pipeline_code is null
     or not (
       responsible_role = 'admin'
       or pipeline_code in ('pre_sales', 'sales')
       or (responsible_role = 'commercial' and pipeline_code = 'post_sales')
     )
     or (target_post_sale_cycle_id is not null and responsible_role not in ('admin', 'commercial')) then
    raise exception using errcode = '42501', message = 'Responsável sem acesso aos vínculos da tarefa.';
  end if;
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

  select * into links from private.validate_task_links(
    target_opportunity_id, target_company_id, target_contact_id, target_post_sale_cycle_id
  );
  perform private.require_task_responsible_access(
    target_responsible_id, target_opportunity_id, target_post_sale_cycle_id
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

create or replace function private.update_task_with_links(
  request_key uuid,
  target_task_id uuid,
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
  task_row public.tasks;
  links record;
begin
  op := private.start_operation('update_task', request_key);
  if op.status = 'completed' then return op.result; end if;

  select * into task_row
  from public.tasks
  where id = target_task_id
  for update;

  if task_row.id is null or not private.can_manage_task(target_task_id) then
    raise exception using errcode = '42501', message = 'Tarefa indisponível para edição.';
  end if;

  if task_row.status <> 'pending' then
    raise exception using errcode = '23514', message = 'Somente tarefas pendentes podem ser editadas.';
  end if;

  if nullif(btrim(task_title), '') is null or target_due_date is null then
    raise exception using errcode = '23514', message = 'Nome, tipo, responsável e vencimento são obrigatórios.';
  end if;

  select * into links from private.validate_task_links(
    target_opportunity_id, target_company_id, target_contact_id, target_post_sale_cycle_id
  );
  perform private.require_task_responsible_access(
    target_responsible_id, target_opportunity_id, target_post_sale_cycle_id
  );

  update public.tasks
  set title = btrim(task_title),
      type = task_type_value,
      responsible_id = target_responsible_id,
      due_date = target_due_date,
      due_time = target_due_time,
      description = nullif(btrim(task_description), ''),
      opportunity_id = target_opportunity_id,
      company_id = links.company_id,
      contact_id = links.contact_id,
      post_sale_cycle_id = target_post_sale_cycle_id
  where id = target_task_id;

  insert into public.activity_events (
    event_type, summary, actor_id, opportunity_id, company_id, contact_id,
    task_id, operation_id, metadata
  ) values (
    'task_updated', 'Tarefa atualizada', actor_id, target_opportunity_id,
    links.company_id, links.contact_id, target_task_id, op.id,
    jsonb_build_object(
      'previous_opportunity_id', task_row.opportunity_id,
      'previous_company_id', task_row.company_id,
      'previous_contact_id', task_row.contact_id
    )
  );

  return private.finish_operation(op.id, jsonb_build_object('task_id', target_task_id));
end;
$$;

create or replace function public.update_task_with_links(
  request_key uuid,
  target_task_id uuid,
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
language sql
security invoker
set search_path = ''
as $$
  select private.update_task_with_links(
    request_key, target_task_id, task_title, task_type_value,
    target_responsible_id, target_due_date, target_due_time, task_description,
    target_opportunity_id, target_company_id, target_contact_id,
    target_post_sale_cycle_id
  );
$$;

revoke all on function private.require_task_responsible_access(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.update_task_with_links(uuid, uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.update_task_with_links(uuid, uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid)
  to authenticated;

revoke all on function public.update_task_with_links(uuid, uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.update_task_with_links(uuid, uuid, text, public.task_type, uuid, date, time, text, uuid, uuid, uuid, uuid)
  to authenticated;
