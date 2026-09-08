-- Money is recorded against the day it was committed, and the row always exists.
--
-- Pipeline review 1 findings 4 and 11.
--
-- `reserve_provider_attempt` reserves against `current_date` and upserts the
-- `principal_daily_usage` row for that date. `reconcile_provider_attempt` and
-- `mark_task_pre_spend_blocked` then wrote the actual spend and released the
-- reservation with a bare `update ... where usage_date = current_date`, which is
-- wrong twice over for an attempt that crosses UTC midnight:
--
--   * the update matches no row - the reservation lives on yesterday's row - so
--     `update` reports zero rows and nothing raises. The money actually spent is
--     never recorded, and the reservation is never released, so that principal's
--     daily ceiling stays permanently consumed by an attempt that finished.
--   * even on the same day, a row that was somehow never created (a reconcile
--     arriving for an attempt whose usage row was pruned) silently records
--     nothing at all.
--
-- Both now take the date from the attempt itself - `provider_attempts.created_at`
-- for a reconcile, `generation_tasks.created_at` for a pre-spend block, which is
-- the same date the dependency-terminal release in
-- `20260907020000_dependent_view_terminal_gate.sql` already used - and both
-- insert the row before updating it, so the write can never be a no-op.
--
-- The spend trigger is unaffected: every statement here either lowers
-- `reserved_spend_cents` or raises `actual_spend_cents` only, which
-- `enforce_daily_provider_spend_cap` accepts as history rather than a new
-- commitment, and the seeding insert is all zeroes.
--
-- Re-runnable: create or replace only, no signature changes.

create or replace function public.reconcile_provider_attempt(p_task_id uuid,p_attempt integer,p_status text,p_actual_cost_cents integer,p_error_class text default null,p_terminal boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_reserved integer; v_usage_date date;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents<0 then raise exception 'invalid actual cost'; end if;
  update public.provider_attempts set status=p_status,actual_cost_cents=p_actual_cost_cents,error_class=left(p_error_class,120),completed_at=now()
    where task_id=p_task_id and attempt=p_attempt and completed_at is null
    returning estimated_cost_cents, created_at::date into v_reserved, v_usage_date;
  if not found then return; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  -- The day the attempt was reserved, not the day it finished.
  insert into public.principal_daily_usage(principal_id,usage_date)
    values(v_task.owner_principal_id,v_usage_date)
    on conflict(principal_id,usage_date) do nothing;
  -- One UPDATE: the net change is a decrease whenever the actual cost does not
  -- exceed the estimate, and the trigger never sees an intermediate peak.
  update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=v_usage_date;
  update public.generation_runs set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where id=v_run.id;
  update public.generation_tasks set reservation_cents=greatest(0,reservation_cents-v_reserved) where id=p_task_id;
end $$;

revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;

-- Unchanged from 20260827120000_caleums_run_semantics.sql except for the usage
-- date and the seeding insert.
create or replace function public.mark_task_pre_spend_blocked(p_task_id uuid, p_reason text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_release integer; v_usage_date date;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '28000'; end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_task.attempt <> 0 then raise exception 'pre-spend gate cannot follow provider reservation' using errcode = 'P0001'; end if;
  if v_task.status = 'blocked' then return v_task; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;
  v_release := v_task.reservation_cents;
  v_usage_date := v_task.created_at::date;
  insert into public.principal_daily_usage(principal_id, usage_date)
    values (v_task.owner_principal_id, v_usage_date)
    on conflict (principal_id, usage_date) do nothing;
  update public.principal_daily_usage set
    reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
    where principal_id = v_task.owner_principal_id and usage_date = v_usage_date;
  update public.generation_runs set
    reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
    where id = v_run.id;
  update public.generation_tasks set
    reservation_cents = 0, status = 'blocked', terminal_error_code = left(p_reason, 120)
    where id = p_task_id returning * into v_task;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_run.design_id, v_task.owner_principal_id, 'job', 'task.pre_spend_operator_review',
      jsonb_build_object('taskId', p_task_id, 'reason', left(p_reason, 120), 'releasedReservationCents', v_release));
  perform public.refresh_run_status(v_run.id);
  return v_task;
end $$;

revoke all on function public.mark_task_pre_spend_blocked(uuid,text) from public, anon, authenticated;
grant execute on function public.mark_task_pre_spend_blocked(uuid,text) to service_role;

-- Same rule for the dependency-terminal release inside the stale sweeper.
--
-- It already released against `v_row.created_at::date` (pipeline review 1
-- finding 11), which is the correct date, but with a bare update: a task whose
-- usage row does not exist released nothing and reported success. The whole
-- function is restated with only the two added lines below, so the property
-- cannot be lost by a later `create or replace` that starts from the old text.

create or replace function public.recover_stale_generation_tasks(
  p_stale_before timestamptz,
  p_limit integer default 100
)
returns table(task_id uuid, recovery_action text, outbox_id uuid)
language plpgsql
security definer
set search_path = '' as $$
#variable_conflict use_column
declare
  v_row record;
  v_event_id uuid;
  v_event_key text;
  v_charge integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if p_stale_before is null or p_stale_before > now()
    or p_limit < 1 or p_limit > 500 then
    raise exception 'invalid stale recovery window' using errcode = '22023';
  end if;

  for v_row in
    select
      t.*,
      r.design_id,
      pa.status as attempt_status,
      pa.provider as attempt_provider,
      pa.provider_request_id,
      pa.estimated_cost_cents as attempt_estimate,
      pa.completed_at as attempt_completed_at,
      pa.created_at as attempt_created_at,
      (cp.task_id is not null) as has_checkpoint,
      dep.status as dependency_status
    from public.generation_tasks t
    join public.generation_runs r on r.id = t.run_id
    left join public.provider_attempts pa
      on pa.task_id = t.id and pa.attempt = t.attempt
    left join public.provider_output_checkpoints cp
      on cp.task_id = t.id and cp.attempt = t.attempt
    left join public.generation_tasks dep
      on dep.id = t.dependency_task_id
    where t.updated_at < p_stale_before
      and t.status in ('queued', 'generating', 'verifying', 'retrying')
    order by t.updated_at, t.id
    limit p_limit
    for update of t skip locked
  loop
    v_event_id := null;
    v_event_key := 'recovery:' || v_row.id || ':attempt:' || v_row.attempt
      || ':stale:' || floor(extract(epoch from v_row.updated_at) * 1000000)::bigint;

    -- Terminal parent: stop once. Checked before every dispatch branch so a
    -- dependent view can never be re-queued, whatever phase it is parked in.
    if v_row.dependency_status in ('blocked', 'failed', 'cancelled')
      and not v_row.has_checkpoint then
      insert into public.principal_daily_usage(principal_id, usage_date)
      values (v_row.owner_principal_id, v_row.created_at::date)
      on conflict (principal_id, usage_date) do nothing;
      update public.principal_daily_usage set
        reserved_spend_cents =
          greatest(0, reserved_spend_cents - coalesce(v_row.reservation_cents, 0))
      where principal_id = v_row.owner_principal_id
        and usage_date = v_row.created_at::date;
      update public.generation_runs set
        reserved_spend_cents =
          greatest(0, reserved_spend_cents - coalesce(v_row.reservation_cents, 0)),
        updated_at = now()
      where id = v_row.run_id;
      update public.generation_tasks set
        status = 'blocked',
        reservation_cents = 0,
        terminal_error_code = 'dependency_' || v_row.dependency_status,
        updated_at = now()
      where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.dependency_terminal_blocked',
        jsonb_build_object('taskId', v_row.id,
          'dependencyTaskId', v_row.dependency_task_id,
          'dependencyStatus', v_row.dependency_status,
          'releasedReservationCents', coalesce(v_row.reservation_cents, 0),
          'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'dependency_terminal';
      outbox_id := null; return next;

    elsif v_row.has_checkpoint then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'provider_output.verification_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_poll' else 'still_execute' end,
          'recoveryPhase', 'stored_unverified', 'attempt', v_row.attempt
        ),
        v_event_key || ':verify'
      ) returning id into v_event_id;
      update public.generation_tasks set status = 'verifying', updated_at = now()
        where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_verification_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'verify_stored_output';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt_provider = 'fal'
      and v_row.attempt_status = 'submitted'
      and nullif(v_row.provider_request_id, '') is not null then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'video.poll_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id, 'taskKind', 'video',
          'operation', 'video_poll', 'attempt', v_row.attempt,
          'providerRequestId', v_row.provider_request_id, 'pollCount', 0
        ),
        v_event_key || ':video-poll'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_video_poll_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'providerRequestId', v_row.provider_request_id,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'video_poll';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt = 0 and v_row.status = 'queued' then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'task.dispatch_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end,
          'attempt', 0
        ),
        v_event_key || ':dispatch'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_dispatch_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', 0,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'dispatch';
      outbox_id := v_event_id; return next;

    elsif v_row.status = 'retrying'
      and v_row.attempt_status = 'failed'
      and v_row.attempt_completed_at is not null then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'task.retry_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end,
          'attempt', v_row.attempt
        ),
        v_event_key || ':retry'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_retry_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'retry';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt_status in ('reserved', 'submitted', 'ambiguous') then
      v_charge := greatest(coalesce(v_row.attempt_estimate, 0), 0);

      update public.provider_attempts set
        status = 'ambiguous',
        actual_cost_cents = coalesce(actual_cost_cents, v_charge),
        error_class = coalesce(error_class, 'stale_worker_ambiguous'),
        completed_at = coalesce(completed_at, now())
      where task_id = v_row.id and attempt = v_row.attempt
        and completed_at is null;

      if found then
        insert into public.principal_daily_usage(principal_id, usage_date)
        values (v_row.owner_principal_id, v_row.attempt_created_at::date)
        on conflict (principal_id, usage_date) do nothing;
        update public.principal_daily_usage set
          actual_spend_cents = actual_spend_cents + v_charge,
          reserved_spend_cents = greatest(0, reserved_spend_cents - v_charge)
        where principal_id = v_row.owner_principal_id
          and usage_date = v_row.attempt_created_at::date;
        update public.generation_runs set
          actual_spend_cents = actual_spend_cents + v_charge,
          reserved_spend_cents = greatest(0, reserved_spend_cents - v_charge),
          status = 'operator_review',
          operator_review_reason = 'stale_worker_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.run_id;
        update public.generation_tasks set
          reservation_cents = greatest(0, reservation_cents - v_charge),
          status = 'blocked', terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      else
        update public.generation_runs set status = 'operator_review',
          operator_review_reason = 'stale_worker_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.run_id;
        update public.generation_tasks set status = 'blocked',
          terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      end if;

      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_paid_request_blocked',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'provider', v_row.attempt_provider, 'providerRequestId', v_row.provider_request_id,
          'conservativeCostCents', v_charge, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'operator_review';
      outbox_id := null; return next;
    end if;
  end loop;
end $$;

revoke all on function public.recover_stale_generation_tasks(timestamptz,integer)
  from public, anon, authenticated;
grant execute on function public.recover_stale_generation_tasks(timestamptz,integer)
  to service_role;
