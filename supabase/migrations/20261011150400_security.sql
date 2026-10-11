-- Central Comercial: access helpers, RLS policies, controlled profile administration and private Storage.

create or replace function private.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.access_status = 'active'
  );
$$;

create or replace function private.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.access_status = 'active';
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_profile_role() = 'admin', false);
$$;

create or replace function private.can_access_pipeline(target_pipeline_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_profile_is_active()
    and exists (
      select 1
      from public.pipelines p
      where p.id = target_pipeline_id
        and (
          private.current_profile_role() = 'admin'
          or p.code in ('pre_sales', 'sales')
          or (private.current_profile_role() = 'commercial' and p.code = 'post_sales')
        )
    ),
    false
  );
$$;

create or replace function private.can_view_opportunity(target_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_profile_is_active()
    and exists (
      select 1
      from public.opportunities o
      where o.id = target_opportunity_id
        and (
          o.commercial_status <> 'active'
          or private.can_access_pipeline(o.current_pipeline_id)
        )
    ),
    false
  );
$$;

create or replace function private.can_edit_opportunity(target_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_profile_is_active()
    and exists (
      select 1
      from public.opportunities o
      join public.pipelines p on p.id = o.current_pipeline_id
      where o.id = target_opportunity_id
        and (
          (o.commercial_status = 'active' and private.can_access_pipeline(o.current_pipeline_id))
          or (
            o.commercial_status = 'won'
            and o.post_sale_status = 'active'
            and p.code = 'post_sales'
            and private.current_profile_role() in ('admin', 'commercial')
          )
        )
    ),
    false
  );
$$;

create or replace function private.can_view_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_profile_is_active()
    and exists (select 1 from public.companies c where c.id = target_company_id);
$$;

create or replace function private.can_edit_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_profile_is_active()
    and exists (select 1 from public.companies c where c.id = target_company_id and c.is_active);
$$;

create or replace function private.can_view_contact(target_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_profile_is_active()
    and exists (select 1 from public.contacts c where c.id = target_contact_id);
$$;

create or replace function private.can_edit_contact(target_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_profile_is_active()
    and exists (select 1 from public.contacts c where c.id = target_contact_id and c.is_active);
$$;

create or replace function private.can_manage_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.current_profile_is_active()
    and exists (
      select 1
      from public.tasks t
      where t.id = target_task_id
        and t.deleted_at is null
        and (
          private.is_admin()
          or t.created_by = auth.uid()
          or t.responsible_id = auth.uid()
        )
    ),
    false
  );
$$;

create or replace function private.list_assignable_profiles()
returns table (id uuid, name text, role public.app_role)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.role
  from public.profiles p
  where private.current_profile_is_active()
    and p.access_status = 'active'
  order by lower(p.name), p.id;
$$;

create or replace function private.bootstrap_first_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.profiles
    where role = 'admin' and access_status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'Já existe um Administrador ativo.';
  end if;

  update public.profiles
  set role = 'admin',
      access_status = 'active',
      approved_by = target_user_id,
      approved_at = now(),
      disabled_by = null,
      disabled_at = null
  where id = target_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Usuário não encontrado.';
  end if;
end;
$$;

create or replace function private.admin_approve_user(target_user_id uuid, selected_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas Administradores podem aprovar usuários.';
  end if;

  update public.profiles
  set role = selected_role,
      access_status = 'active',
      approved_by = auth.uid(),
      approved_at = now(),
      disabled_by = null,
      disabled_at = null
  where id = target_user_id
    and access_status in ('pending', 'rejected', 'disabled');

  if not found then
    raise exception using errcode = 'P0002', message = 'Solicitação de acesso não encontrada ou já ativa.';
  end if;
end;
$$;

create or replace function private.admin_reject_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas Administradores podem recusar usuários.';
  end if;

  update public.profiles
  set role = null,
      access_status = 'rejected',
      approved_by = null,
      approved_at = null,
      disabled_by = null,
      disabled_at = null
  where id = target_user_id
    and access_status = 'pending';

  if not found then
    raise exception using errcode = 'P0002', message = 'Solicitação pendente não encontrada.';
  end if;
end;
$$;

create or replace function private.admin_deactivate_user(target_user_id uuid, transfer_to_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  recipient_role public.app_role;
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas Administradores podem desativar usuários.';
  end if;

  if target_user_id = transfer_to_user_id then
    raise exception using errcode = '22023', message = 'O destinatário deve ser outro usuário.';
  end if;

  select role into target_role
  from public.profiles
  where id = target_user_id and access_status = 'active'
  for update;

  if target_role is null then
    raise exception using errcode = 'P0002', message = 'Usuário ativo não encontrado.';
  end if;

  select role into recipient_role
  from public.profiles
  where id = transfer_to_user_id and access_status = 'active'
  for update;

  if recipient_role is null then
    raise exception using errcode = '22023', message = 'Destinatário inativo ou não habilitado para receber as responsabilidades.';
  end if;

  if target_role = 'admin' and (
    select count(*) from public.profiles where role = 'admin' and access_status = 'active'
  ) <= 1 then
    raise exception using errcode = '23514', message = 'Não é permitido desativar o último Administrador ativo.';
  end if;

  update public.opportunities
  set responsible_id = transfer_to_user_id,
      updated_by = auth.uid()
  where responsible_id = target_user_id
    and (commercial_status = 'active' or post_sale_status = 'active');

  update public.tasks
  set responsible_id = transfer_to_user_id
  where responsible_id = target_user_id
    and status = 'pending'
    and deleted_at is null;

  update public.profiles
  set access_status = 'disabled',
      disabled_by = auth.uid(),
      disabled_at = now()
  where id = target_user_id;
end;
$$;

-- API-facing wrappers stay in the exposed schema without elevated privileges.
-- The validated implementation remains in the private schema.
create or replace function public.list_assignable_profiles()
returns table (id uuid, name text, role public.app_role)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_assignable_profiles();
$$;

create or replace function private.list_user_access_requests()
returns table (
  id uuid,
  name text,
  email text,
  role public.app_role,
  access_status public.access_status,
  last_seen_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Apenas Administradores podem consultar usuários.';
  end if;
  return query
  select p.id, p.name, u.email::text, p.role, p.access_status, p.last_seen_at, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc, p.id;
end;
$$;

create or replace function public.list_user_access_requests()
returns table (
  id uuid,
  name text,
  email text,
  role public.app_role,
  access_status public.access_status,
  last_seen_at timestamptz,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.list_user_access_requests();
$$;

create or replace function public.admin_approve_user(target_user_id uuid, selected_role public.app_role)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_approve_user(target_user_id, selected_role);
$$;

create or replace function public.admin_reject_user(target_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_reject_user(target_user_id);
$$;

create or replace function public.admin_deactivate_user(target_user_id uuid, transfer_to_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.admin_deactivate_user(target_user_id, transfer_to_user_id);
$$;

create or replace function private.guard_company_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not old.is_active and not new.is_active then
    raise exception using errcode = '42501', message = 'Reative a empresa antes de editá-la.';
  end if;

  if old.is_active is distinct from new.is_active then
    if (to_jsonb(new) - array['is_active','updated_by','updated_at','status_changed_by','status_changed_at'])
       <> (to_jsonb(old) - array['is_active','updated_by','updated_at','status_changed_by','status_changed_at']) then
      raise exception using errcode = '42501', message = 'A alteração de status não pode editar outros dados da empresa.';
    end if;
    new.status_changed_by = auth.uid();
    new.status_changed_at = now();
  end if;

  return new;
end;
$$;

create or replace function private.guard_contact_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not old.is_active and not new.is_active then
    raise exception using errcode = '42501', message = 'Reative o contato antes de editá-lo.';
  end if;

  if old.is_active is distinct from new.is_active then
    if (to_jsonb(new) - array['is_active','updated_by','updated_at','status_changed_by','status_changed_at'])
       <> (to_jsonb(old) - array['is_active','updated_by','updated_at','status_changed_by','status_changed_at']) then
      raise exception using errcode = '42501', message = 'A alteração de status não pode editar outros dados do contato.';
    end if;
    new.status_changed_by = auth.uid();
    new.status_changed_at = now();
  end if;

  return new;
end;
$$;

create trigger companies_guard_update
before update on public.companies
for each row execute function private.guard_company_update();

create trigger contacts_guard_update
before update on public.contacts
for each row execute function private.guard_contact_update();

alter table public.profiles enable row level security;
alter table public.business_operations enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.user_stage_preferences enable row level security;
alter table public.segments enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.loss_reasons enable row level security;
alter table public.product_categories enable row level security;
alter table public.qualification_parameters enable row level security;
alter table public.sales_goal_changes enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.company_contacts enable row level security;
alter table public.products enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_products enable row level security;
alter table public.opportunity_qualification_answers enable row level security;
alter table public.opportunity_qualification_validations enable row level security;
alter table public.opportunity_stage_entries enable row level security;
alter table public.opportunity_outcomes enable row level security;
alter table public.post_sale_cycles enable row level security;
alter table public.tasks enable row level security;
alter table public.contact_interactions enable row level security;
alter table public.company_notes enable row level security;
alter table public.contact_notes enable row level security;
alter table public.opportunity_notes enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = auth.uid() or private.is_admin());

create policy business_operations_select_own_or_admin on public.business_operations
for select to authenticated
using (actor_id = auth.uid() or private.is_admin());

create policy pipelines_select_active on public.pipelines
for select to authenticated using (private.current_profile_is_active());
create policy pipeline_stages_select_active on public.pipeline_stages
for select to authenticated using (private.current_profile_is_active());

create policy user_stage_preferences_select_own on public.user_stage_preferences
for select to authenticated using (user_id = auth.uid() and private.current_profile_is_active());
create policy user_stage_preferences_insert_own on public.user_stage_preferences
for insert to authenticated with check (user_id = auth.uid() and private.current_profile_is_active());
create policy user_stage_preferences_update_own on public.user_stage_preferences
for update to authenticated using (user_id = auth.uid() and private.current_profile_is_active())
with check (user_id = auth.uid() and private.current_profile_is_active());
create policy user_stage_preferences_delete_own on public.user_stage_preferences
for delete to authenticated using (user_id = auth.uid() and private.current_profile_is_active());

create policy segments_select_active_user on public.segments
for select to authenticated using (private.current_profile_is_active());
create policy sources_select_active_user on public.opportunity_sources
for select to authenticated using (private.current_profile_is_active());
create policy loss_reasons_select_active_user on public.loss_reasons
for select to authenticated using (private.current_profile_is_active());
create policy product_categories_select_active_user on public.product_categories
for select to authenticated using (private.current_profile_is_active());
create policy qualification_parameters_select_active_user on public.qualification_parameters
for select to authenticated using (private.current_profile_is_active());
create policy goals_select_active_user on public.sales_goal_changes
for select to authenticated using (private.current_profile_is_active());

create policy segments_admin_insert on public.segments for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy segments_admin_update on public.segments for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());
create policy sources_admin_insert on public.opportunity_sources for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy sources_admin_update on public.opportunity_sources for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());
create policy loss_reasons_admin_insert on public.loss_reasons for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy loss_reasons_admin_update on public.loss_reasons for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());
create policy product_categories_admin_insert on public.product_categories for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy product_categories_admin_update on public.product_categories for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());
create policy qualification_parameters_admin_insert on public.qualification_parameters for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy qualification_parameters_admin_update on public.qualification_parameters for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());
create policy goals_admin_insert on public.sales_goal_changes for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy goals_admin_update on public.sales_goal_changes for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());

create policy companies_select_active_user on public.companies
for select to authenticated using (private.current_profile_is_active());
create policy companies_insert_active_user on public.companies
for insert to authenticated with check (
  private.current_profile_is_active() and created_by = auth.uid() and updated_by = auth.uid() and is_active
);
create policy companies_update_active_user on public.companies
for update to authenticated using (private.current_profile_is_active())
with check (private.current_profile_is_active() and updated_by = auth.uid());

create policy contacts_select_active_user on public.contacts
for select to authenticated using (private.current_profile_is_active());
create policy contacts_insert_active_user on public.contacts
for insert to authenticated with check (
  private.current_profile_is_active() and created_by = auth.uid() and updated_by = auth.uid() and is_active
);
create policy contacts_update_active_user on public.contacts
for update to authenticated using (private.current_profile_is_active())
with check (private.current_profile_is_active() and updated_by = auth.uid());

create policy company_contacts_select_active_user on public.company_contacts
for select to authenticated using (private.current_profile_is_active());
create policy company_contacts_insert_active_user on public.company_contacts
for insert to authenticated with check (
  private.current_profile_is_active()
  and linked_by = auth.uid()
  and is_active
  and private.can_edit_company(company_id)
  and private.can_edit_contact(contact_id)
);
create policy company_contacts_update_active_user on public.company_contacts
for update to authenticated using (private.current_profile_is_active())
with check (
  private.current_profile_is_active()
  and (
    (
      is_active
      and unlinked_by is null
      and unlinked_at is null
      and private.can_edit_company(company_id)
      and private.can_edit_contact(contact_id)
    )
    or (
      not is_active
      and unlinked_by = auth.uid()
      and unlinked_at is not null
    )
  )
);

create policy products_select_active_user on public.products
for select to authenticated using (private.current_profile_is_active());
create policy products_admin_insert on public.products for insert to authenticated
with check (private.is_admin() and created_by = auth.uid() and updated_by = auth.uid());
create policy products_admin_update on public.products for update to authenticated
using (private.is_admin()) with check (private.is_admin() and updated_by = auth.uid());

create policy opportunities_select_allowed on public.opportunities
for select to authenticated using (private.can_view_opportunity(id));
create policy opportunity_products_select_allowed on public.opportunity_products
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy qualification_answers_select_allowed on public.opportunity_qualification_answers
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy qualification_validations_select_allowed on public.opportunity_qualification_validations
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy stage_entries_select_allowed on public.opportunity_stage_entries
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy outcomes_select_allowed on public.opportunity_outcomes
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy post_sale_cycles_select_allowed on public.post_sale_cycles
for select to authenticated using (
  private.current_profile_is_active()
  and private.current_profile_role() in ('admin', 'commercial')
);

create policy tasks_select_owner_responsible_or_admin on public.tasks
for select to authenticated using (private.can_manage_task(id));
create policy interactions_select_by_opportunity on public.contact_interactions
for select to authenticated using (private.can_view_opportunity(opportunity_id));

create policy company_notes_select_active_user on public.company_notes
for select to authenticated using (private.can_view_company(company_id));
create policy company_notes_insert_active_company on public.company_notes
for insert to authenticated with check (
  private.can_edit_company(company_id) and created_by = auth.uid() and updated_by = auth.uid()
);
create policy company_notes_update_active_company on public.company_notes
for update to authenticated using (private.can_edit_company(company_id))
with check (private.can_edit_company(company_id) and updated_by = auth.uid());

create policy contact_notes_select_active_user on public.contact_notes
for select to authenticated using (private.can_view_contact(contact_id));
create policy contact_notes_insert_active_contact on public.contact_notes
for insert to authenticated with check (
  private.can_edit_contact(contact_id) and created_by = auth.uid() and updated_by = auth.uid()
);
create policy contact_notes_update_active_contact on public.contact_notes
for update to authenticated using (private.can_edit_contact(contact_id))
with check (private.can_edit_contact(contact_id) and updated_by = auth.uid());

create policy opportunity_notes_select_allowed on public.opportunity_notes
for select to authenticated using (private.can_view_opportunity(opportunity_id));
create policy opportunity_notes_insert_editable on public.opportunity_notes
for insert to authenticated with check (
  private.can_edit_opportunity(opportunity_id) and created_by = auth.uid() and updated_by = auth.uid()
);
create policy opportunity_notes_update_editable on public.opportunity_notes
for update to authenticated using (private.can_edit_opportunity(opportunity_id))
with check (private.can_edit_opportunity(opportunity_id) and updated_by = auth.uid());

create policy attachments_select_allowed on public.attachments
for select to authenticated using (
  (company_id is not null and private.can_view_company(company_id))
  or (opportunity_id is not null and private.can_view_opportunity(opportunity_id))
);

create policy activity_events_select_allowed on public.activity_events
for select to authenticated using (
  (opportunity_id is not null and private.can_view_opportunity(opportunity_id))
  or (company_id is not null and private.can_view_company(company_id))
  or (contact_id is not null and private.can_view_contact(contact_id))
  or (task_id is not null and private.can_manage_task(task_id))
);

do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'profiles', 'business_operations', 'pipelines', 'pipeline_stages',
    'user_stage_preferences', 'segments', 'opportunity_sources', 'loss_reasons',
    'product_categories', 'qualification_parameters', 'sales_goal_changes',
    'companies', 'contacts', 'company_contacts', 'products', 'opportunities',
    'opportunity_products', 'opportunity_qualification_answers',
    'opportunity_qualification_validations', 'opportunity_stage_entries',
    'opportunity_outcomes', 'post_sale_cycles', 'tasks', 'contact_interactions',
    'company_notes', 'contact_notes', 'opportunity_notes', 'attachments',
    'activity_events'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', protected_table);
  end loop;
end;
$$;
grant select on public.profiles to authenticated;
grant select on public.business_operations to authenticated;
grant select on public.pipelines, public.pipeline_stages to authenticated;
grant select, insert, update, delete on public.user_stage_preferences to authenticated;
grant select on public.segments, public.opportunity_sources, public.loss_reasons,
  public.product_categories, public.qualification_parameters, public.sales_goal_changes to authenticated;
grant insert, update on public.segments, public.opportunity_sources, public.loss_reasons,
  public.product_categories, public.qualification_parameters, public.sales_goal_changes to authenticated;
grant select, insert on public.companies, public.contacts, public.company_contacts to authenticated;
grant update (name, cnpj, cnpj_normalized, email, phone, address, segment_id, is_active, updated_by,
  status_changed_by, status_changed_at) on public.companies to authenticated;
grant update (name, phone, phone_normalized, email, email_normalized, source_id, is_active, updated_by,
  status_changed_by, status_changed_at) on public.contacts to authenticated;
grant update (job_title, is_active, unlinked_by, unlinked_at) on public.company_contacts to authenticated;
grant select, insert, update on public.products to authenticated;
grant select on public.opportunities, public.opportunity_products,
  public.opportunity_qualification_answers, public.opportunity_qualification_validations,
  public.opportunity_stage_entries, public.opportunity_outcomes, public.post_sale_cycles to authenticated;
grant select on public.tasks, public.contact_interactions to authenticated;
grant select, insert on public.company_notes, public.contact_notes, public.opportunity_notes to authenticated;
grant update (body, updated_by, deleted_by, deleted_at) on public.company_notes to authenticated;
grant update (body, updated_by, deleted_by, deleted_at) on public.contact_notes to authenticated;
grant update (body, updated_by, deleted_by, deleted_at) on public.opportunity_notes to authenticated;
grant select on public.attachments, public.activity_events to authenticated;

grant usage on schema private to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.validate_contact_interaction_time() from public, anon, authenticated;
revoke all on function private.guard_company_update() from public, anon, authenticated;
revoke all on function private.guard_contact_update() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.current_profile_is_active() from public, anon, authenticated;
revoke all on function private.current_profile_role() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.can_access_pipeline(uuid) from public, anon, authenticated;
revoke all on function private.can_view_opportunity(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_opportunity(uuid) from public, anon, authenticated;
revoke all on function private.can_view_company(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_company(uuid) from public, anon, authenticated;
revoke all on function private.can_view_contact(uuid) from public, anon, authenticated;
revoke all on function private.can_edit_contact(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_task(uuid) from public, anon, authenticated;
revoke all on function private.list_assignable_profiles() from public, anon, authenticated;
revoke all on function private.list_user_access_requests() from public, anon, authenticated;
revoke all on function private.bootstrap_first_admin(uuid) from public, anon, authenticated;
revoke all on function private.admin_approve_user(uuid, public.app_role) from public, anon, authenticated;
revoke all on function private.admin_reject_user(uuid) from public, anon, authenticated;
revoke all on function private.admin_deactivate_user(uuid, uuid) from public, anon, authenticated;
grant execute on function private.current_profile_is_active() to authenticated;
grant execute on function private.current_profile_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_access_pipeline(uuid) to authenticated;
grant execute on function private.can_view_opportunity(uuid) to authenticated;
grant execute on function private.can_edit_opportunity(uuid) to authenticated;
grant execute on function private.can_view_company(uuid) to authenticated;
grant execute on function private.can_edit_company(uuid) to authenticated;
grant execute on function private.can_view_contact(uuid) to authenticated;
grant execute on function private.can_edit_contact(uuid) to authenticated;
grant execute on function private.can_manage_task(uuid) to authenticated;
grant execute on function private.list_assignable_profiles() to authenticated;
grant execute on function private.list_user_access_requests() to authenticated;
grant execute on function private.admin_approve_user(uuid, public.app_role) to authenticated;
grant execute on function private.admin_reject_user(uuid) to authenticated;
grant execute on function private.admin_deactivate_user(uuid, uuid) to authenticated;
revoke all on function public.list_assignable_profiles() from public, anon, authenticated;
revoke all on function public.list_user_access_requests() from public, anon, authenticated;
revoke all on function public.admin_approve_user(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.admin_reject_user(uuid) from public, anon, authenticated;
revoke all on function public.admin_deactivate_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_assignable_profiles() to authenticated;
grant execute on function public.list_user_access_requests() to authenticated;
grant execute on function public.admin_approve_user(uuid, public.app_role) to authenticated;
grant execute on function public.admin_reject_user(uuid) to authenticated;
grant execute on function public.admin_deactivate_user(uuid, uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'company-attachments',
    'company-attachments',
    false,
    20971520,
    array[
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ]
  ),
  (
    'opportunity-attachments',
    'opportunity-attachments',
    false,
    20971520,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_path_parent_uuid(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.storage_path_parent_uuid(text) from public, anon, authenticated;
grant execute on function private.storage_path_parent_uuid(text) to authenticated;

create policy company_attachments_select on storage.objects
for select to authenticated
using (
  bucket_id = 'company-attachments'
  and private.can_view_company(private.storage_path_parent_uuid(name))
);
create policy company_attachments_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company-attachments'
  and private.can_edit_company(private.storage_path_parent_uuid(name))
);
create policy company_attachments_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'company-attachments'
  and private.can_edit_company(private.storage_path_parent_uuid(name))
);

create policy opportunity_attachments_select on storage.objects
for select to authenticated
using (
  bucket_id = 'opportunity-attachments'
  and private.can_view_opportunity(private.storage_path_parent_uuid(name))
);
create policy opportunity_attachments_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'opportunity-attachments'
  and private.can_edit_opportunity(private.storage_path_parent_uuid(name))
);
create policy opportunity_attachments_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'opportunity-attachments'
  and private.can_edit_opportunity(private.storage_path_parent_uuid(name))
);

comment on function private.bootstrap_first_admin(uuid) is
  'Owner-only bootstrap for the first administrator. Never granted to application roles.';
