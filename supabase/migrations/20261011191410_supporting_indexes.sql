-- Central Comercial: supporting indexes for foreign keys, RLS checks and lifecycle queries.

create index profiles_approved_by_idx on public.profiles (approved_by) where approved_by is not null;
create index profiles_disabled_by_idx on public.profiles (disabled_by) where disabled_by is not null;
create index user_stage_preferences_stage_idx on public.user_stage_preferences (stage_id);

create index qualification_answers_parameter_idx
  on public.opportunity_qualification_answers (parameter_id);
create index opportunity_outcomes_opportunity_idx
  on public.opportunity_outcomes (opportunity_id, closed_at desc);
create index opportunity_outcomes_loss_reason_idx
  on public.opportunity_outcomes (loss_reason_id) where loss_reason_id is not null;
create index post_sale_cycles_opportunity_idx
  on public.post_sale_cycles (opportunity_id, started_at desc);
create index post_sale_cycles_outcome_idx on public.post_sale_cycles (outcome_id);

create index tasks_company_idx on public.tasks (company_id, status, due_date)
  where company_id is not null and deleted_at is null;
create index tasks_contact_idx on public.tasks (contact_id, status, due_date)
  where contact_id is not null and deleted_at is null;
create index tasks_post_sale_cycle_idx on public.tasks (post_sale_cycle_id, status, due_date)
  where post_sale_cycle_id is not null and deleted_at is null;
create index tasks_operation_idx on public.tasks (operation_id);
create index tasks_stage_entry_idx on public.tasks (stage_entry_id)
  where stage_entry_id is not null;
create index contact_interactions_task_idx on public.contact_interactions (task_id)
  where task_id is not null;

create index attachments_uploaded_by_idx on public.attachments (uploaded_by, uploaded_at desc);
create index activity_events_actor_idx on public.activity_events (actor_id, occurred_at desc)
  where actor_id is not null;
create index activity_events_stage_entry_idx on public.activity_events (stage_entry_id)
  where stage_entry_id is not null;
create index activity_events_operation_idx on public.activity_events (operation_id)
  where operation_id is not null;
