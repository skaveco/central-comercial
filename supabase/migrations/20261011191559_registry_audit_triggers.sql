-- Central Comercial: immutable audit events for registry mutations allowed by RLS.

create or replace function private.audit_company_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  event_summary text;
begin
  if tg_op = 'INSERT' then
    event_name := 'company_created'; event_summary := 'Empresa criada';
  elsif old.is_active and not new.is_active then
    event_name := 'company_deactivated'; event_summary := 'Empresa desativada';
  elsif not old.is_active and new.is_active then
    event_name := 'company_reactivated'; event_summary := 'Empresa reativada';
  else
    event_name := 'company_updated'; event_summary := 'Empresa atualizada';
  end if;
  insert into public.activity_events (event_type, summary, actor_id, company_id)
  values (event_name, event_summary, auth.uid(), new.id);
  return new;
end;
$$;

create or replace function private.audit_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  event_summary text;
begin
  if tg_op = 'INSERT' then
    event_name := 'contact_created'; event_summary := 'Contato criado';
  elsif old.is_active and not new.is_active then
    event_name := 'contact_deactivated'; event_summary := 'Contato desativado';
  elsif not old.is_active and new.is_active then
    event_name := 'contact_reactivated'; event_summary := 'Contato reativado';
  else
    event_name := 'contact_updated'; event_summary := 'Contato atualizado';
  end if;
  insert into public.activity_events (event_type, summary, actor_id, contact_id)
  values (event_name, event_summary, auth.uid(), new.id);
  return new;
end;
$$;

create or replace function private.audit_company_contact_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  event_summary text;
begin
  if tg_op = 'INSERT' or (not old.is_active and new.is_active) then
    event_name := 'company_contact_linked'; event_summary := 'Contato vinculado à empresa';
  elsif old.is_active and not new.is_active then
    event_name := 'company_contact_unlinked'; event_summary := 'Contato desvinculado da empresa';
  else
    event_name := 'company_contact_updated'; event_summary := 'Vínculo de contato atualizado';
  end if;
  insert into public.activity_events (
    event_type, summary, actor_id, company_id, contact_id
  ) values (
    event_name, event_summary, auth.uid(), new.company_id, new.contact_id
  );
  return new;
end;
$$;

create or replace function private.audit_note_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  event_summary text;
  parent_company_id uuid;
  parent_contact_id uuid;
  parent_opportunity_id uuid;
begin
  if tg_table_name = 'company_notes' then parent_company_id := new.company_id;
  elsif tg_table_name = 'contact_notes' then parent_contact_id := new.contact_id;
  else parent_opportunity_id := new.opportunity_id;
  end if;

  if tg_op = 'INSERT' then
    event_name := 'note_created'; event_summary := 'Nota adicionada';
  elsif old.deleted_at is null and new.deleted_at is not null then
    event_name := 'note_deleted'; event_summary := 'Nota removida';
  else
    event_name := 'note_updated'; event_summary := 'Nota atualizada';
  end if;

  insert into public.activity_events (
    event_type, summary, actor_id, company_id, contact_id, opportunity_id,
    metadata
  ) values (
    event_name, event_summary, auth.uid(), parent_company_id, parent_contact_id,
    parent_opportunity_id, jsonb_build_object('note_id', new.id)
  );
  return new;
end;
$$;

create trigger companies_audit_change
after insert or update on public.companies
for each row execute function private.audit_company_change();

create trigger contacts_audit_change
after insert or update on public.contacts
for each row execute function private.audit_contact_change();

create trigger company_contacts_audit_change
after insert or update on public.company_contacts
for each row execute function private.audit_company_contact_change();

create trigger company_notes_audit_change
after insert or update on public.company_notes
for each row execute function private.audit_note_change();
create trigger contact_notes_audit_change
after insert or update on public.contact_notes
for each row execute function private.audit_note_change();
create trigger opportunity_notes_audit_change
after insert or update on public.opportunity_notes
for each row execute function private.audit_note_change();

revoke all on function private.audit_company_change() from public, anon, authenticated;
revoke all on function private.audit_contact_change() from public, anon, authenticated;
revoke all on function private.audit_company_contact_change() from public, anon, authenticated;
revoke all on function private.audit_note_change() from public, anon, authenticated;
