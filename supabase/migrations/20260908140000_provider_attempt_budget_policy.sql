-- The paid-attempt budget becomes policy, in one place, instead of the literal 3.
--
-- Pipeline review 1 finding 10. The number of paid attempts one task may make
-- was written as `3` in four places: `reserve_provider_attempt`,
-- `retry_generation_task`, `operator_retry_generation_task` and
-- `apps/jobs/src/presentation.ts`. Three of them are SQL and one is TypeScript,
-- so lowering the budget meant a deploy plus a migration and getting them out of
-- step meant either a wasted paid attempt (the job stops later than the RPC
-- allows, and `reserve_provider_attempt` raises after the customer has been
-- told a retry is coming) or a task the RPC will never serve again that still
-- looks retryable in the operator console.
--
-- The column is the authority. `packages/config` carries the same number only as
-- the fallback used when the policy row cannot be read, and
-- `presentation.ts` / `video.ts` read this column on every run.
--
-- Re-runnable: the column is added if absent, the functions are replaced.

alter table public.runtime_policy
  add column if not exists provider_attempt_budget integer not null default 3
  check (provider_attempt_budget between 1 and 10);

-- Unchanged from 20260907030000_spend_cap_fail_closed.sql except that the
-- policy row is read before the budget test and the budget comes from it.
create or replace function public.reserve_provider_attempt(p_task_id uuid,p_provider text,p_model text,p_provider_key text)
returns table(attempt_number integer,duplicate_complete boolean)
language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts; v_reserve integer; v_estimate integer;
begin
  select * into v_existing from public.provider_attempts where provider_idempotency_key=p_provider_key;
  if found then return query select v_existing.attempt,v_existing.status='succeeded'; return; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  if not found then raise exception 'task not found' using errcode='P0002'; end if;
  if v_task.status='cancelled' or v_task.cancel_requested_at is not null then raise exception 'task cancelled' using errcode='P0001'; end if;
  -- M1 guard: a second, concurrent execution of one dispatch cannot open a
  -- second paid attempt. Every legitimate caller closes the previous attempt
  -- first, so this can only be a duplicate. Placed after the exact-replay short
  -- circuit and before every write, so it costs nothing and spends nothing.
  perform 1 from public.provider_attempts
    where task_id=p_task_id and completed_at is null and status in ('reserved','submitted');
  if found then raise exception 'provider attempt already open' using errcode='P0001'; end if;
  -- Fail closed: no policy row, no budget, no spend.
  select * into v_policy from public.runtime_policy where id=true;
  if v_policy.id is null then raise exception 'runtime policy missing' using errcode='P0001'; end if;
  v_attempt:=v_task.attempt+1;
  if v_attempt>v_policy.provider_attempt_budget then raise exception 'provider attempt budget exhausted' using errcode='P0001'; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  insert into public.principal_daily_usage(principal_id) values(v_task.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_task.owner_principal_id and usage_date=current_date for update;
  v_estimate:=coalesce(nullif(v_task.estimated_cost_cents,0),v_policy.studio_reservation_cents);
  v_reserve:=greatest(v_estimate-v_task.reservation_cents,0);
  if v_usage.reserved_spend_cents+v_reserve>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  if v_reserve>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_reserve where principal_id=v_task.owner_principal_id and usage_date=current_date;
    update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_reserve where id=v_run.id;
    update public.generation_tasks set reservation_cents=reservation_cents+v_reserve where id=p_task_id returning * into v_task;
  end if;
  insert into public.provider_attempts(task_id,owner_principal_id,attempt,provider,model,provider_idempotency_key,status,estimated_cost_cents,prompt_release_id)
  values(p_task_id,v_task.owner_principal_id,v_attempt,p_provider,p_model,p_provider_key,'reserved',v_estimate,v_task.prompt_release_id);
  update public.generation_tasks set attempt=v_attempt,status='generating' where id=p_task_id;
  return query select v_attempt,false;
end $$;

revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;

-- Unchanged from 20260827140000_caleums_review_fixes.sql except for the budget.
create or replace function public.retry_generation_task(p_task_id uuid, p_retry_key text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_design uuid; v_outbox_key text; v_budget integer;
begin
  select * into v_task from public.generation_tasks
    where id = p_task_id and owner_principal_id = auth.uid() for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_task.status not in ('failed', 'blocked') then
    raise exception 'task cannot be retried' using errcode = 'P0001';
  end if;
  if v_task.cancel_requested_at is not null then
    raise exception 'task cancelled' using errcode = 'P0001';
  end if;
  select provider_attempt_budget into v_budget from public.runtime_policy where id = true;
  if v_budget is null then raise exception 'runtime policy missing' using errcode = 'P0001'; end if;
  if v_task.attempt >= v_budget then
    raise exception 'provider attempt budget exhausted' using errcode = 'P0001';
  end if;
  v_outbox_key := 'retry:' || p_task_id || ':' || p_retry_key;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', p_task_id, 'studio.retry_requested',
      jsonb_build_object(
        'taskId', p_task_id,
        'taskKind', case when v_task.provider_profile = 'video.fal' then 'video' else 'still' end,
        'operation', case when v_task.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end
      ), v_outbox_key)
    on conflict (dispatch_idempotency_key) do nothing;
  update public.generation_tasks set status = 'retrying', terminal_error_code = null
    where id = p_task_id returning * into v_task;
  select design_id into v_design from public.generation_runs where id = v_task.run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_design, auth.uid(), 'customer', 'task.retry_requested',
      jsonb_build_object('taskId', p_task_id, 'retryKey', p_retry_key));
  perform public.refresh_run_status(v_task.run_id);
  return v_task;
end $$;

revoke all on function public.retry_generation_task(uuid,text) from public, anon;
grant execute on function public.retry_generation_task(uuid,text) to authenticated;

-- Unchanged from 20260827120000_caleums_run_semantics.sql except for the budget.
create or replace function public.operator_retry_generation_task(
  p_task_id uuid,
  p_retry_key text,
  p_reason text default null
)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_design_id uuid; v_outbox_key text; v_budget integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(p_retry_key, '') is null then
    raise exception 'retry key required' using errcode = '22023';
  end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  select design_id into v_design_id from public.generation_runs where id = v_task.run_id;
  v_outbox_key := 'operator-retry:' || p_task_id || ':' || p_retry_key;
  if exists (select 1 from public.outbox_events where dispatch_idempotency_key = v_outbox_key) then
    return v_task;
  end if;
  if v_task.status not in ('failed', 'blocked') then
    raise exception 'task cannot be retried' using errcode = 'P0001';
  end if;
  if v_task.cancel_requested_at is not null then
    raise exception 'task cancelled' using errcode = 'P0001';
  end if;
  select provider_attempt_budget into v_budget from public.runtime_policy where id = true;
  if v_budget is null then raise exception 'runtime policy missing' using errcode = 'P0001'; end if;
  if v_task.attempt >= v_budget then
    raise exception 'provider attempt budget exhausted' using errcode = 'P0001';
  end if;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', p_task_id, 'studio.operator_retry_requested',
      jsonb_build_object(
        'taskId', p_task_id,
        'taskKind', case when v_task.provider_profile = 'video.fal' then 'video' else 'still' end,
        'operation', case when v_task.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end
      ), v_outbox_key);
  update public.generation_tasks set status = 'retrying', terminal_error_code = null
    where id = p_task_id returning * into v_task;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_design_id, v_task.owner_principal_id, 'operator', 'task.operator_retry_requested',
      jsonb_build_object('taskId', p_task_id, 'retryKey', p_retry_key,
        'reason', left(p_reason, 300), 'attempt', v_task.attempt, 'budgetOverride', false));
  perform public.refresh_run_status(v_task.run_id);
  return v_task;
end $$;

revoke all on function public.operator_retry_generation_task(uuid,text,text) from public, anon, authenticated;
grant execute on function public.operator_retry_generation_task(uuid,text,text) to service_role;
