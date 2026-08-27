-- Caleums run semantics: one derived run status, one guarded task transition,
-- per-task cancellation that releases only its own reservation, and a
-- deterministic server-side estimate snapshot.
--
-- Motion never gates commerce: completeness is derived from still siblings only.
-- Replay-safe: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. Derived run status
-- ---------------------------------------------------------------------------
create or replace function public.refresh_run_status(p_run_id uuid)
returns text
language plpgsql
security definer
set search_path = '' as $$
declare
  v_run public.generation_runs;
  v_total integer;
  v_cancelled integer;
  v_attention integer;
  v_ready integer;
  v_still_total integer;
  v_still_ready integer;
  v_still_cancelled integer;
  v_status public.run_status;
  v_reason text;
begin
  select * into v_run from public.generation_runs where id = p_run_id for update;
  if not found then raise exception 'run not found' using errcode = 'P0002'; end if;

  select
    count(*),
    count(*) filter (where t.status = 'cancelled'),
    count(*) filter (where t.status in ('blocked', 'failed')),
    count(*) filter (where t.status = 'ready'),
    count(*) filter (where t.provider_profile <> 'video.fal'),
    count(*) filter (where t.provider_profile <> 'video.fal' and t.status = 'ready'),
    count(*) filter (where t.provider_profile <> 'video.fal' and t.status = 'cancelled')
  into v_total, v_cancelled, v_attention, v_ready, v_still_total, v_still_ready, v_still_cancelled
  from public.generation_tasks t
  where t.run_id = p_run_id;

  -- A run with no tasks yet is still owned by its creator's transaction.
  if v_total = 0 then
    return v_run.status::text;
  end if;

  -- A cancelled run is only legitimate when every task is cancelled; any other
  -- combination is derived again so a single cancelled sibling cannot strand
  -- ready or running work.
  if v_cancelled = v_total then
    v_status := 'cancelled';
  elsif v_attention > 0 then
    v_status := 'operator_review';
  elsif v_still_ready > 0 and v_still_ready + v_still_cancelled = v_still_total then
    v_status := 'complete';
  elsif v_ready > 0 then
    v_status := 'partial';
  else
    v_status := 'running';
  end if;

  if v_status = 'operator_review' then
    select t.terminal_error_code into v_reason
    from public.generation_tasks t
    where t.run_id = p_run_id and t.status in ('blocked', 'failed')
    order by t.created_at, t.id
    limit 1;
  else
    v_reason := null;
  end if;

  update public.generation_runs set
    status = v_status,
    operator_review_reason = v_reason,
    cancelled_at = case
      when v_status = 'cancelled' then coalesce(cancelled_at, now())
      else cancelled_at
    end,
    updated_at = now()
  where id = p_run_id;

  return v_status::text;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Guarded task transition
-- ---------------------------------------------------------------------------
create or replace function public.transition_generation_task(
  p_task_id uuid,
  p_from text[],
  p_to text,
  p_patch jsonb default '{}'::jsonb
)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks;
begin
  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid task patch' using errcode = '22023';
  end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;

  if p_to <> 'cancelled'
    and (v_task.status = 'cancelled' or v_task.cancel_requested_at is not null) then
    raise exception 'task cancelled' using errcode = 'P0001';
  end if;

  if not (v_task.status::text = any(p_from)) then
    raise exception 'invalid task transition: % -> %', v_task.status::text, p_to
      using errcode = 'P0001';
  end if;

  update public.generation_tasks set
    status = p_to::public.task_status,
    terminal_error_code = coalesce(left(p_patch->>'terminal_error_code', 120), terminal_error_code),
    provider_status_url = coalesce(p_patch->>'provider_status_url', provider_status_url),
    provider_response_url = coalesce(p_patch->>'provider_response_url', provider_response_url),
    identity_artifact_id = coalesce((p_patch->>'identity_artifact_id')::uuid, identity_artifact_id),
    attempt = coalesce((p_patch->>'attempt')::integer, attempt),
    input_asset_ids = coalesce(
      case when jsonb_typeof(p_patch->'input_asset_ids') = 'array' then (
        select coalesce(array_agg(element::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(p_patch->'input_asset_ids') as patched(element)
      ) else null end,
      input_asset_ids
    ),
    updated_at = now()
  where id = p_task_id
  returning * into v_task;

  perform public.refresh_run_status(v_task.run_id);
  return v_task;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Per-task cancellation releases only its own reservation
-- ---------------------------------------------------------------------------
create or replace function public.cancel_generation_task(p_task_id uuid)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare
  v_task public.generation_tasks;
  v_run public.generation_runs;
  v_release integer;
begin
  select * into v_task from public.generation_tasks
    where id = p_task_id and owner_principal_id = auth.uid()
      and status in ('queued', 'retrying', 'generating', 'verifying')
    for update;
  if not found then raise exception 'task cannot be cancelled' using errcode = 'P0001'; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;

  v_release := greatest(coalesce(v_task.reservation_cents, 0), 0);
  if v_release > 0 then
    update public.principal_daily_usage set
      reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
      where principal_id = v_task.owner_principal_id and usage_date = current_date;
    update public.generation_runs set
      reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
      where id = v_run.id;
  end if;

  update public.generation_tasks set
    cancel_requested_at = now(), status = 'cancelled', reservation_cents = 0
    where id = p_task_id
    returning * into v_task;

  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_run.design_id, auth.uid(), 'customer', 'task.cancelled',
      jsonb_build_object('taskId', p_task_id, 'releasedReservationCents', v_release));

  perform public.refresh_run_status(v_task.run_id);
  return v_task;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Retry paths carry dispatch routing and derive run status
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
  if not found or v_task.status not in ('failed', 'blocked') then
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

create or replace function public.operator_retry_generation_task(
  p_task_id uuid,
  p_retry_key text,
  p_reason text default null
) returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
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
  if v_task.attempt >= 3 then
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

-- ---------------------------------------------------------------------------
-- 5. Approval enforces the one-active-run rule before any spend
-- ---------------------------------------------------------------------------
create or replace function public.approve_and_start_studio(
  p_draft_id uuid,
  p_specification jsonb,
  p_approval_key text,
  p_run_key text
) returns table(approved_design_id uuid, revision_id uuid, run_id uuid, task_id uuid, outbox_id uuid, canonical_identity_anchor jsonb)
language plpgsql
security definer
set search_path = '' as $$
declare
  v record;
  v_expanded record;
  v_owner uuid := auth.uid();
  v_draft_design_id uuid;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  -- Approval and run replay stay idempotent; the active-run guard applies only
  -- to genuinely new approvals.
  if not exists (
       select 1 from public.design_revisions dr
       where dr.owner_principal_id = v_owner and dr.approval_idempotency_key = p_approval_key
     )
     and not exists (
       select 1 from public.generation_runs gr
       where gr.owner_principal_id = v_owner and gr.run_idempotency_key = p_run_key
     )
  then
    select dd.design_id into v_draft_design_id from public.design_drafts dd
      where dd.id = p_draft_id and dd.owner_principal_id = v_owner;
    if v_draft_design_id is not null and exists (
      select 1 from public.generation_runs gr
      where gr.design_id = v_draft_design_id and gr.owner_principal_id = v_owner
        and gr.status in ('queued', 'running', 'partial', 'operator_review')
    ) then
      raise exception 'one active generation run allowed' using errcode = 'P0001';
    end if;
  end if;
  select * into v from public.approve_and_start_studio_legacy(p_draft_id, p_specification, p_approval_key, p_run_key);
  select * into v_expanded from public.expand_final_media_run(v.run_id);
  return query select v.approved_design_id, v.revision_id, v.run_id, v_expanded.task_id, v_expanded.outbox_id, v.canonical_identity_anchor;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Pre-spend gate derives run status instead of asserting it
-- ---------------------------------------------------------------------------
create or replace function public.mark_task_pre_spend_blocked(p_task_id uuid, p_reason text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_release integer;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '28000'; end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_task.attempt <> 0 then raise exception 'pre-spend gate cannot follow provider reservation' using errcode = 'P0001'; end if;
  if v_task.status = 'blocked' then return v_task; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;
  v_release := v_task.reservation_cents;
  update public.principal_daily_usage set
    reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
    where principal_id = v_task.owner_principal_id and usage_date = current_date;
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

-- ---------------------------------------------------------------------------
-- 7. Video requests fail closed without a live prompt publication
-- ---------------------------------------------------------------------------
create or replace function public.request_video_task(p_run_id uuid, p_kind text, p_source_task_id uuid, p_request_key text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare
  v_run public.generation_runs; v_source public.generation_tasks; v_source_asset public.assets;
  v_profile text; v_view text; v_model text; v_prompt public.prompt_releases;
  v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_task public.generation_tasks;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '28000'; end if;
  if p_kind not in ('preview', 'final') then raise exception 'invalid video kind' using errcode = '22023'; end if;
  select * into v_run from public.generation_runs where id = p_run_id for update;
  select * into v_source from public.generation_tasks where id = p_source_task_id and run_id = p_run_id and status = 'ready';
  if not found then raise exception 'verified source task required' using errcode = 'P0002'; end if;
  select * into v_source_asset from public.assets
    where task_id = p_source_task_id and verification_result->>'passed' = 'true'
    order by created_at desc limit 1;
  if not found then raise exception 'verified source still required' using errcode = 'P0002'; end if;
  v_profile := case when p_kind = 'preview' then 'video.preview' else 'video.final' end;
  v_view := case when p_kind = 'preview' then 'motion_preview' else 'motion_final' end;
  v_model := case when p_kind = 'preview' then 'bytedance/seedance-2.0/fast/image-to-video' else 'bytedance/seedance-2.0/image-to-video' end;
  select * into v_task from public.generation_tasks where dispatch_idempotency_key = 'video:' || p_request_key;
  if found then return v_task; end if;
  select r.* into v_prompt from public.prompt_profile_publications p
    join public.prompt_releases r on r.id = p.release_id
    where p.profile = v_profile for share of p;
  if not found then raise exception 'prompt publication required: %', v_profile using errcode = 'P0001'; end if;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_run.owner_principal_id)
    on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage
    where principal_id = v_run.owner_principal_id and usage_date = current_date for update;
  if v_usage.reserved_spend_cents + v_policy.video_reservation_cents > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile, task_profile, aspect_ratio, dependency_task_id, input_asset_ids, pipeline_release, model_release, reservation_cents, estimated_cost_cents)
    values (p_run_id, v_run.owner_principal_id, v_view, 'video:' || p_request_key, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'video.fal', v_profile, '9:16', p_source_task_id, array[v_source_asset.id], 'caleums-final-media-v1', v_model, v_policy.video_reservation_cents, v_policy.video_reservation_cents)
    returning * into v_task;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', v_task.id, 'video.requested',
      jsonb_build_object('runId', p_run_id, 'taskId', v_task.id, 'taskKind', 'video'),
      'outbox:video:' || p_request_key);
  update public.principal_daily_usage set reserved_spend_cents = reserved_spend_cents + v_policy.video_reservation_cents
    where principal_id = v_run.owner_principal_id and usage_date = current_date;
  update public.generation_runs set reserved_spend_cents = reserved_spend_cents + v_policy.video_reservation_cents
    where id = p_run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_run.design_id, v_run.owner_principal_id, 'job', 'video.requested',
      jsonb_build_object('taskId', v_task.id, 'sourceTaskId', p_source_task_id, 'kind', p_kind));
  return v_task;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Stale recovery derives run status instead of asserting it
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
          updated_at = now()
        where id = v_row.run_id;
        update public.generation_tasks set
          reservation_cents = greatest(0, reservation_cents - v_charge),
          status = 'blocked', terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      else
        update public.generation_tasks set status = 'blocked',
          terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      end if;
      perform public.refresh_run_status(v_row.run_id);

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

-- ---------------------------------------------------------------------------
-- 9. Server-side deterministic estimate snapshot
-- ---------------------------------------------------------------------------
create table if not exists public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.design_revisions(id),
  owner_principal_id uuid not null,
  currency text not null default 'AED',
  low_amount integer not null,
  high_amount integer not null,
  confidence text not null default 'medium',
  assumptions jsonb not null default '[]',
  gold_price_timestamp timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (revision_id)
);

alter table public.price_snapshots enable row level security;
drop policy if exists price_snapshots_owner_read on public.price_snapshots;
create policy price_snapshots_owner_read on public.price_snapshots
  for select using (owner_principal_id = auth.uid());

create or replace function public.estimate_revision(p_revision_id uuid)
returns public.price_snapshots
language plpgsql
security definer
set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_revision public.design_revisions;
  v_snapshot public.price_snapshots;
  v_spec jsonb;
  v_base numeric := 1500;
  v_low integer;
  v_high integer;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into v_revision from public.design_revisions
    where id = p_revision_id and owner_principal_id = v_owner;
  if not found then raise exception 'revision not found' using errcode = 'P0002'; end if;

  select * into v_snapshot from public.price_snapshots where revision_id = p_revision_id;
  if found then return v_snapshot; end if;

  v_spec := v_revision.specification;
  v_base := v_base
    + case v_spec->>'metalColor' when 'white' then 150 when 'rose' then 100 else 0 end
    + case v_spec->>'sizeProfile' when 'delicate' then -200 when 'statement' then 500 else 0 end
    + case v_spec->>'stoneCoverage' when 'accent' then 250 when 'partial-pave' then 600 when 'full-pave' then 1100 else 0 end
    + case v_spec->>'gemstone'
        when 'natural-diamond' then 900
        when 'lab-diamond' then 300
        when 'ruby' then 450
        when 'emerald' then 450
        when 'blue-sapphire' then 450
        when 'pink-sapphire' then 450
        else 0 end
    + case v_spec->'chain'->>'style' when 'box' then 100 when 'curb' then 100 else 0 end;
  if coalesce((v_spec->>'nameCount')::integer, 1) = 2 then
    v_base := v_base * 1.6;
  end if;
  v_low := round(v_base * 0.9);
  v_high := round(v_base * 1.15);

  insert into public.price_snapshots(
    revision_id, owner_principal_id, low_amount, high_amount, assumptions, expires_at
  ) values (
    p_revision_id, v_owner, v_low, v_high,
    jsonb_build_array(
      '18K gold at the atelier reference rate',
      'modelled weight for the chosen size',
      'final quote confirms stones and weight'
    ),
    now() + interval '48 hours'
  )
  on conflict (revision_id) do nothing
  returning * into v_snapshot;

  if v_snapshot.id is null then
    select * into v_snapshot from public.price_snapshots where revision_id = p_revision_id;
  end if;
  return v_snapshot;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Privileges
-- ---------------------------------------------------------------------------
revoke all on table public.price_snapshots from public, anon;
grant select on public.price_snapshots to authenticated;
grant all privileges on table public.price_snapshots to service_role;

revoke all on function public.refresh_run_status(uuid) from public, anon, authenticated;
revoke all on function public.transition_generation_task(uuid,text[],text,jsonb) from public, anon, authenticated;
revoke all on function public.operator_retry_generation_task(uuid,text,text) from public, anon, authenticated;
revoke all on function public.mark_task_pre_spend_blocked(uuid,text) from public, anon, authenticated;
revoke all on function public.request_video_task(uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.recover_stale_generation_tasks(timestamptz,integer) from public, anon, authenticated;
revoke all on function public.cancel_generation_task(uuid) from public, anon;
revoke all on function public.retry_generation_task(uuid,text) from public, anon;
revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public, anon;
revoke all on function public.estimate_revision(uuid) from public, anon;

grant execute on function public.refresh_run_status(uuid) to service_role;
grant execute on function public.transition_generation_task(uuid,text[],text,jsonb) to service_role;
grant execute on function public.operator_retry_generation_task(uuid,text,text) to service_role;
grant execute on function public.mark_task_pre_spend_blocked(uuid,text) to service_role;
grant execute on function public.request_video_task(uuid,text,uuid,text) to service_role;
grant execute on function public.recover_stale_generation_tasks(timestamptz,integer) to service_role;
grant execute on function public.cancel_generation_task(uuid) to authenticated;
grant execute on function public.retry_generation_task(uuid,text) to authenticated;
grant execute on function public.approve_and_start_studio(uuid,jsonb,text,text) to authenticated, service_role;
grant execute on function public.estimate_revision(uuid) to authenticated;
