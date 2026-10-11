begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '', now(), '{}'::jsonb, '{"name":"Admin"}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pre@test.local', '', now(), '{}'::jsonb, '{"name":"Pré-venda"}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commercial@test.local', '', now(), '{}'::jsonb, '{"name":"Comercial"}'::jsonb, now(), now()),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pending@test.local', '', now(), '{}'::jsonb, '{"name":"Pendente"}'::jsonb, now(), now());

update public.profiles
set role = case id
  when '10000000-0000-4000-8000-000000000001' then 'admin'::public.app_role
  when '10000000-0000-4000-8000-000000000002' then 'pre_sales'::public.app_role
  when '10000000-0000-4000-8000-000000000003' then 'commercial'::public.app_role
end,
access_status = 'active',
approved_by = '10000000-0000-4000-8000-000000000001',
approved_at = now()
where id <> '10000000-0000-4000-8000-000000000004';

insert into public.business_operations (id, actor_id, operation_type, idempotency_key)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'rls_test_setup',
  '20000000-0000-4000-8000-000000000002'
);

insert into public.opportunities (
  id, name, responsible_id, current_pipeline_id, current_stage_id,
  commercial_status, post_sale_status, created_by, updated_by
)
values
  (
    '30000000-0000-4000-8000-000000000001', 'Lead de teste',
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8100-000000000001',
    'active', null,
    '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002', 'Venda de teste',
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8200-000000000001',
    'active', null,
    '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000003', 'Pós-venda de teste',
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8300-000000000001',
    'won', 'active',
    '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'
  );

insert into public.opportunity_outcomes (
  id, opportunity_id, result, final_value, responsible_id,
  previous_pipeline_id, previous_stage_id, operation_id, closed_by
)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  'won', 1000,
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8200-000000000005',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.post_sale_cycles (
  id, opportunity_id, outcome_id, current_stage_id, started_by
)
values (
  '50000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8300-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.tasks (
  id, title, type, responsible_id, due_date, status, creation_source, created_by, operation_id
)
values
  (
    '60000000-0000-4000-8000-000000000001', 'Tarefa da Pré-venda', 'management',
    '10000000-0000-4000-8000-000000000002', current_date, 'pending', 'manual',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000002', 'Tarefa Comercial', 'management',
    '10000000-0000-4000-8000-000000000003', current_date, 'pending', 'manual',
    '10000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001'
  );

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname in (
        'list_assignable_profiles', 'list_user_access_requests',
        'admin_approve_user', 'admin_reject_user', 'admin_deactivate_user',
        'create_opportunity', 'move_opportunity', 'transfer_to_sales',
        'close_opportunity', 'restore_opportunity',
        'change_opportunity_responsible', 'update_opportunity_details',
        'set_opportunity_products', 'set_qualification_answers', 'register_contact',
        'create_task', 'update_task', 'complete_task', 'reopen_task',
        'reschedule_task', 'delete_task', 'move_post_sale', 'finish_post_sale'
      )
  ),
  0,
  'The exposed public schema has no SECURITY DEFINER functions'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

select is((select count(*)::integer from public.pipelines), 0, 'Pending user cannot read pipelines');
select is((select count(*)::integer from public.companies), 0, 'Pending user cannot read commercial registries');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select ok(private.can_access_pipeline('00000000-0000-4000-8000-000000000001'), 'Pre-sales can access pre-sales');
select ok(private.can_access_pipeline('00000000-0000-4000-8000-000000000002'), 'Pre-sales can access sales');
select ok(not private.can_access_pipeline('00000000-0000-4000-8000-000000000003'), 'Pre-sales cannot operate post-sales');
select is((select count(*)::integer from public.opportunities), 3, 'Pre-sales sees pre-sales, sales and closed commercial records');
select is((select count(*)::integer from public.post_sale_cycles), 0, 'Pre-sales cannot read active post-sales cycles');
select is((select count(*)::integer from public.tasks), 1, 'Pre-sales sees only own or assigned tasks');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

select ok(private.can_access_pipeline('00000000-0000-4000-8000-000000000001'), 'Commercial can access pre-sales');
select ok(private.can_access_pipeline('00000000-0000-4000-8000-000000000002'), 'Commercial can access sales');
select ok(private.can_access_pipeline('00000000-0000-4000-8000-000000000003'), 'Commercial can access post-sales');
select is((select count(*)::integer from public.post_sale_cycles), 1, 'Commercial can read post-sales cycles');
select is((select count(*)::integer from public.tasks), 1, 'Commercial sees only own or assigned tasks');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*)::integer from public.tasks), 2, 'Admin sees every task');
select is((select count(*)::integer from public.opportunities), 3, 'Admin sees every opportunity');
select is((select count(*)::integer from public.list_assignable_profiles()), 3, 'Active users can list only active assignable profiles');

select lives_ok(
  $$
    select public.create_opportunity(
      request_key => '70000000-0000-4000-8000-000000000001',
      opportunity_name => 'Oportunidade transacional',
      target_pipeline_id => '00000000-0000-4000-8000-000000000001',
      target_stage_id => '00000000-0000-4000-8100-000000000002',
      target_responsible_id => '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'Creating an opportunity through the public RPC succeeds'
);
select is(
  (select count(*)::integer from public.opportunities where name = 'Oportunidade transacional'),
  1,
  'The RPC creates exactly one opportunity'
);
select is(
  (
    select count(*)::integer from public.tasks t
    join public.opportunities o on o.id = t.opportunity_id
    where o.name = 'Oportunidade transacional'
      and t.automation_key = 'first_contact_qualification'
      and t.status = 'pending'
  ),
  1,
  'Entering First contact creates the qualification task'
);
select lives_ok(
  $$
    select public.create_opportunity(
      request_key => '70000000-0000-4000-8000-000000000001',
      opportunity_name => 'Oportunidade transacional',
      target_pipeline_id => '00000000-0000-4000-8000-000000000001',
      target_stage_id => '00000000-0000-4000-8100-000000000002',
      target_responsible_id => '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'Repeating the same request key succeeds idempotently'
);
select is(
  (select count(*)::integer from public.opportunities where name = 'Oportunidade transacional'),
  1,
  'Repeating the request does not duplicate the opportunity'
);
select lives_ok(
  $$
    select public.close_opportunity(
      request_key => '70000000-0000-4000-8000-000000000002',
      target_opportunity_id => (
        select id from public.opportunities where name = 'Oportunidade transacional'
      ),
      closure_result => 'archived',
      closure_note => 'Teste de arquivamento'
    )
  $$,
  'Closing the opportunity cancels its pending flow atomically'
);
select is(
  (
    select count(*)::integer from public.tasks t
    join public.opportunities o on o.id = t.opportunity_id
    where o.name = 'Oportunidade transacional' and t.status = 'cancelled'
  ),
  1,
  'Archiving cancels the pending qualification task'
);

select * from finish();
rollback;
