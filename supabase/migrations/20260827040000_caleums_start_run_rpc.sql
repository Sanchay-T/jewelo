create or replace function public.start_studio_run(
  p_design_id uuid,
  p_run_key text
) returns table(run_id uuid, task_id uuid, outbox_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_revision_id uuid;
  v_run_id uuid;
  v_task_id uuid;
  v_outbox_id uuid;
  v_policy public.runtime_policy;
  v_usage public.principal_daily_usage;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select gr.id into v_run_id from public.generation_runs gr
    where gr.owner_principal_id = v_owner and gr.run_idempotency_key = p_run_key;
  if found then
    select gt.id into v_task_id from public.generation_tasks gt
      where gt.run_id = v_run_id and gt.presentation_view = 'studio';
    select oe.id into v_outbox_id from public.outbox_events oe
      where oe.dispatch_idempotency_key = 'outbox:' || v_run_id || ':studio:v1';
    return query select v_run_id, v_task_id, v_outbox_id;
    return;
  end if;
  select d.active_revision_id into v_revision_id from public.designs d
    where d.id = p_design_id and d.owner_principal_id = v_owner and d.customer_id = v_owner
    for update;
  if v_revision_id is null then raise exception 'approved revision required' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.generation_runs gr
    where gr.design_id = p_design_id and gr.owner_principal_id = v_owner
      and gr.status in ('queued','running','partial','operator_review')
  ) then raise exception 'one active generation run allowed' using errcode = 'P0001'; end if;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_owner)
    on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage
    where principal_id = v_owner and usage_date = current_date for update;
  if v_usage.runs_started >= v_policy.daily_generation_limit then
    raise exception 'daily generation quota exceeded' using errcode = 'P0001';
  end if;
  if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;
  insert into public.generation_runs(
    design_id, revision_id, owner_principal_id, run_idempotency_key, reserved_spend_cents
  ) values (
    p_design_id, v_revision_id, v_owner, p_run_key, v_policy.studio_reservation_cents
  ) returning id into v_run_id;
  insert into public.generation_tasks(
    run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, provider_profile
  ) values (
    v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:v1', 'studio-placeholder-v1', 'still.fal'
  ) returning id into v_task_id;
  insert into public.outbox_events(
    aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key
  ) values (
    'run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id),
    'outbox:' || v_run_id || ':studio:v1'
  ) returning id into v_outbox_id;
  update public.principal_daily_usage set
    runs_started = runs_started + 1,
    reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents
    where principal_id = v_owner and usage_date = current_date;
  update public.designs set status = 'generating'
    where id = p_design_id and owner_principal_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (p_design_id, v_owner, 'customer', 'generation_run.started', jsonb_build_object('runId', v_run_id));
  return query select v_run_id, v_task_id, v_outbox_id;
end;
$$;

revoke all on function public.start_studio_run(uuid,text) from public, anon;
grant execute on function public.start_studio_run(uuid,text) to authenticated, service_role;
