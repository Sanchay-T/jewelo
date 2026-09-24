-- A provider output checkpoint is resumed only while its attempt is open.
--
-- Staging run 440f6323: attempt 2 stored its checkpoint, the verifier call then
-- threw a transient error, and the job's `fail` closed attempt 2 as `failed`
-- and left the task `retrying`. The sweeper's `has_checkpoint` branch matched
-- on the checkpoint alone, flipped the task to `verifying` and re-emitted
-- verification recovery; the worker resumed the same bytes, paid for the
-- vision read, and `complete_presentation_task` refused the closed attempt.
-- Back to `retrying`, for ever: never terminal, never re-shot.
--
-- Restated from 20260908150000_reservation_usage_date.sql with two changes:
--   1. `has_checkpoint` now also requires the attempt row to be open
--      (`reserved`/`submitted`, `completed_at` null). Both branches that read it
--      take the new meaning: a closed attempt's checkpoint is dead output that
--      nothing will resume, so the verification branch skips it and the
--      dependency-terminal branch no longer shields the task from being
--      blocked and releasing its reservation.
--   2. The retry branch also takes a task parked in `generating`/`verifying`
--      with a failed, closed attempt (a task this bug already flipped to
--      `verifying`, or a worker that died between closing the attempt and
--      moving the task to `retrying`), which otherwise matched no branch.
-- apps/jobs/src/presentation.ts `loadStoredOutput` applies the same rule.

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
  v_reserve_date date;
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
      (cp.task_id is not null
        and pa.status in ('reserved', 'submitted')
        and pa.completed_at is null) as has_checkpoint,
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
      v_reserve_date := coalesce(v_row.reservation_usage_date, v_row.created_at::date);
      insert into public.principal_daily_usage(principal_id, usage_date)
      values (v_row.owner_principal_id, v_reserve_date)
      on conflict (principal_id, usage_date) do nothing;
      update public.principal_daily_usage set
        reserved_spend_cents =
          greatest(0, reserved_spend_cents - coalesce(v_row.reservation_cents, 0))
      where principal_id = v_row.owner_principal_id
        and usage_date = v_reserve_date;
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
          'reservationUsageDate', v_reserve_date,
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

    elsif v_row.status in ('retrying', 'generating', 'verifying')
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
