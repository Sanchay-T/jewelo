-- Image-only pipeline (2026-09-03)
--
-- The product decision removed video/motion generation. Jewelo now generates
-- still images only. This migration makes the schema honest about that in the
-- one place it matters: no code path may create or resume a paid fal video
-- attempt any more.
--
-- Deliberately NOT changed, because existing rows still reference them and
-- dropping them would destroy lineage:
--   * the `presentation_view` check values 'motion', 'motion_preview',
--     'motion_final';
--   * the prompt `profile` check values 'video.preview', 'video.final' and
--     their seeded releases/publications;
--   * `runtime_policy.video_reservation_cents` and the
--     `pipeline_releases.video_*_model` columns;
--   * the 'video/mp4' MIME type allowed on the generated-assets bucket;
--   * any already-generated `motion_*` task/asset rows.
-- They are inert once nothing can create new video work, and the run-status
-- views already exclude 'video.fal' tasks from completeness and commerce.

-- ---------------------------------------------------------------------------
-- 1. No new paid video task can ever be created
-- ---------------------------------------------------------------------------
drop function if exists public.request_video_task(uuid, text, uuid, text);

-- ---------------------------------------------------------------------------
-- 2. A customer retry cannot resurrect a legacy video task into paid work
-- ---------------------------------------------------------------------------
create or replace function public.retry_generation_task(p_task_id uuid, p_retry_key text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_design uuid; v_outbox_key text;
begin
  select * into v_task from public.generation_tasks
    where id = p_task_id and owner_principal_id = auth.uid() for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if coalesce(v_task.provider_profile, '') = 'video.fal' then
    raise exception 'video generation removed' using errcode = 'P0001';
  end if;
  if v_task.status not in ('failed', 'blocked') then
    raise exception 'task cannot be retried' using errcode = 'P0001';
  end if;
  if v_task.cancel_requested_at is not null then
    raise exception 'task cancelled' using errcode = 'P0001';
  end if;
  if v_task.attempt >= 3 then
    raise exception 'provider attempt budget exhausted' using errcode = 'P0001';
  end if;
  v_outbox_key := 'retry:' || p_task_id || ':' || p_retry_key;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', p_task_id, 'studio.retry_requested',
      jsonb_build_object(
        'taskId', p_task_id, 'taskKind', 'still', 'operation', 'still_execute'
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

-- ---------------------------------------------------------------------------
-- 3. An operator retry is held to the same rule
-- ---------------------------------------------------------------------------
create or replace function public.operator_retry_generation_task(
  p_task_id uuid,
  p_retry_key text,
  p_reason text default null
) returns public.generation_tasks
language plpgsql security definer set search_path = '' as $$
declare
  v_task public.generation_tasks;
  v_design_id uuid;
  v_outbox_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(p_retry_key, '') is null then
    raise exception 'retry key required' using errcode = '22023';
  end if;
  select * into v_task from public.generation_tasks
    where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if coalesce(v_task.provider_profile, '') = 'video.fal' then
    raise exception 'video generation removed' using errcode = 'P0001';
  end if;
  select design_id into v_design_id from public.generation_runs where id = v_task.run_id;
  v_outbox_key := 'operator-retry:' || p_task_id || ':' || p_retry_key;
  if exists (select 1 from public.outbox_events where dispatch_idempotency_key = v_outbox_key) then
    return v_task;
  end if;
  if v_task.status not in ('failed', 'blocked') then
    raise exception 'task cannot be retried' using errcode = 'P0001';
  end if;
  if v_task.attempt >= 3 then
    raise exception 'provider attempt budget exhausted' using errcode = 'P0001';
  end if;
  insert into public.outbox_events(
    aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key
  ) values (
    'task', p_task_id, 'studio.operator_retry_requested',
    jsonb_build_object('taskId', p_task_id), v_outbox_key
  );
  update public.generation_tasks set status = 'retrying', terminal_error_code = null
    where id = p_task_id returning * into v_task;
  update public.generation_runs set status = 'queued', operator_review_reason = null
    where id = v_task.run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (
      v_design_id, v_task.owner_principal_id, 'operator',
      'task.operator_retry_requested',
      jsonb_build_object('taskId', p_task_id, 'retryKey', p_retry_key,
        'reason', left(p_reason, 300), 'attempt', v_task.attempt,
        'budgetOverride', false)
    );
  return v_task;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Stale recovery never targets a removed video Trigger task
-- ---------------------------------------------------------------------------
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
      (cp.task_id is not null) as has_checkpoint
    from public.generation_tasks t
    join public.generation_runs r on r.id = t.run_id
    left join public.provider_attempts pa
      on pa.task_id = t.id and pa.attempt = t.attempt
    left join public.provider_output_checkpoints cp
      on cp.task_id = t.id and cp.attempt = t.attempt
    where t.updated_at < p_stale_before
      and t.status in ('queued', 'generating', 'verifying', 'retrying')
      -- Video generation was removed on 2026-09-03. A legacy 'video.fal' task
      -- has no Trigger task to recover into, so recovering it would only churn
      -- the outbox against a task id that no longer exists.
      and coalesce(t.provider_profile, '') <> 'video.fal'
    order by t.updated_at, t.id
    limit p_limit
    for update of t skip locked
  loop
    v_event_id := null;
    v_event_key := 'recovery:' || v_row.id || ':attempt:' || v_row.attempt
      || ':stale:' || floor(extract(epoch from v_row.updated_at) * 1000000)::bigint;

    if v_row.has_checkpoint then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'provider_output.verification_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', 'still', 'operation', 'still_execute',
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

    elsif v_row.attempt = 0 and v_row.status = 'queued' then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'task.dispatch_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', 'still', 'operation', 'still_execute',
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
          'taskKind', 'still', 'operation', 'still_execute',
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
revoke all on function public.retry_generation_task(uuid,text)
  from public, anon;
grant execute on function public.retry_generation_task(uuid,text)
  to authenticated, service_role;
revoke all on function public.operator_retry_generation_task(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.operator_retry_generation_task(uuid,text,text)
  to service_role;
