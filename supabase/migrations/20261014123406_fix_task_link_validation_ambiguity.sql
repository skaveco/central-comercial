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
  resolved_company_id uuid := target_company_id;
  resolved_contact_id uuid := target_contact_id;
begin
  if target_opportunity_id is not null then
    select * into opportunity_row
    from public.opportunities
    where id = target_opportunity_id;

    if opportunity_row.id is null or not private.can_edit_opportunity(target_opportunity_id) then
      raise exception using errcode = '42501', message = 'Oportunidade indisponível para a tarefa.';
    end if;

    if resolved_company_id is null then resolved_company_id := opportunity_row.company_id; end if;
    if resolved_contact_id is null then resolved_contact_id := opportunity_row.contact_id; end if;

    if resolved_company_id is distinct from opportunity_row.company_id
       or resolved_contact_id is distinct from opportunity_row.contact_id then
      raise exception using errcode = '22023', message = 'Empresa e contato devem corresponder aos vínculos da oportunidade.';
    end if;
  else
    if resolved_company_id is not null and not private.can_edit_company(resolved_company_id) then
      raise exception using errcode = '42501', message = 'Empresa inativa ou indisponível para a tarefa.';
    end if;

    if resolved_contact_id is not null and not private.can_edit_contact(resolved_contact_id) then
      raise exception using errcode = '42501', message = 'Contato inativo ou indisponível para a tarefa.';
    end if;

    if resolved_company_id is not null and resolved_contact_id is not null and not exists (
      select 1
      from public.company_contacts cc
      where cc.company_id = resolved_company_id
        and cc.contact_id = resolved_contact_id
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

  company_id := resolved_company_id;
  contact_id := resolved_contact_id;
  return next;
end;
$$;
