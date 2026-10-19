alter table public.tasks
  add constraint tasks_management_without_opportunity
  check (type <> 'management' or opportunity_id is null)
  not valid;

alter table public.tasks validate constraint tasks_management_without_opportunity;

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
  links_are_unchanged boolean;
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

  links_are_unchanged := target_opportunity_id is not distinct from task_row.opportunity_id
    and target_post_sale_cycle_id is not distinct from task_row.post_sale_cycle_id
    and (
      target_opportunity_id is not null
      or (
        target_company_id is not distinct from task_row.company_id
        and target_contact_id is not distinct from task_row.contact_id
      )
    );

  if links_are_unchanged then
    select task_row.company_id as company_id, task_row.contact_id as contact_id
      into links;
  else
    select * into links from private.validate_task_links(
      target_opportunity_id, target_company_id, target_contact_id, target_post_sale_cycle_id
    );
  end if;

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
  task_row public.tasks;
begin
  perform private.require_active_user();

  select * into task_row
  from public.tasks
  where id = target_task_id;

  if task_row.id is null then
    raise exception using errcode = '42501', message = 'Tarefa indisponível para edição.';
  end if;

  return private.update_task_with_links(
    request_key, target_task_id, task_title, task_type_value,
    target_responsible_id, target_due_date, target_due_time, task_description,
    task_row.opportunity_id, task_row.company_id, task_row.contact_id,
    task_row.post_sale_cycle_id
  );
end;
$$;
