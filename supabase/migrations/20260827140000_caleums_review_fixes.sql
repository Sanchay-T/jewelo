-- Caleums review fixes.
--
-- 1. Motion never gates commerce: a failed/blocked video task no longer counts
--    toward the operator-review attention set, and the visible reason survives
--    sibling transitions instead of being nulled on every refresh.
-- 2. A run parked in operator_review no longer blocks a fresh approval.
-- 3. Cancelling a task closes its open provider attempt so a late reconcile is
--    a no-op and cannot release the reservation twice.
-- 4. Retrying a task that does not exist is a 404, not a 409.
--
-- Replay-safe: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. Derived run status: stills own attention, motion only reports a reason
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
    count(*) filter (where t.status in ('blocked', 'failed') and t.provider_profile <> 'video.fal'),
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

  -- The reason reports every attention-worthy task, motion included, but a
  -- motion reason never drives the status. An existing reason is kept when no
  -- task currently carries one, so an asynchronously recorded video failure
  -- survives sibling transitions.
  select case
      when t.provider_profile = 'video.fal'
        then 'video_' || coalesce(t.terminal_error_code, 'failed')
      else t.terminal_error_code
    end
  into v_reason
  from public.generation_tasks t
  where t.run_id = p_run_id and t.status in ('blocked', 'failed')
  order by t.created_at, t.id
  limit 1;

  update public.generation_runs set
    status = v_status,
    operator_review_reason = case
      when v_status = 'complete' then null
      when v_reason is not null then left(v_reason, 300)
      else operator_review_reason
    end,
    cancelled_at = case
      when v_status = 'cancelled' then coalesce(cancelled_at, now())
      else cancelled_at
    end,
    updated_at = now()
  where id = p_run_id;

  return v_status::text;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Per-task cancellation closes its own open provider attempt
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

  -- Close the open attempt first: reconcile_provider_attempt only matches rows
  -- with completed_at is null, so a late reconcile becomes a no-op and cannot
  -- release the reservation a second time.
  update public.provider_attempts set
    status = 'ambiguous', error_class = 'task_cancelled', completed_at = now()
    where task_id = p_task_id and status in ('reserved', 'submitted')
      and completed_at is null;

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
-- 3. A missing task is not found, not a state conflict
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

-- ---------------------------------------------------------------------------
-- 4. A blocked run can be refined or regenerated
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
  -- to genuinely new approvals. A run parked in operator_review is not active:
  -- the customer must be able to refine or regenerate it.
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
        and gr.status in ('queued', 'running', 'partial')
    ) then
      raise exception 'one active generation run allowed' using errcode = 'P0001';
    end if;
  end if;
  select * into v from public.approve_and_start_studio_legacy(p_draft_id, p_specification, p_approval_key, p_run_key);
  select * into v_expanded from public.expand_final_media_run(v.run_id);
  return query select v.approved_design_id, v.revision_id, v.run_id, v_expanded.task_id, v_expanded.outbox_id, v.canonical_identity_anchor;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Privileges: identical to 20260827120000
-- ---------------------------------------------------------------------------
revoke all on function public.refresh_run_status(uuid) from public, anon, authenticated;
revoke all on function public.cancel_generation_task(uuid) from public, anon;
revoke all on function public.retry_generation_task(uuid,text) from public, anon;
revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public, anon;

grant execute on function public.refresh_run_status(uuid) to service_role;
grant execute on function public.cancel_generation_task(uuid) to authenticated;
grant execute on function public.retry_generation_task(uuid,text) to authenticated;
grant execute on function public.approve_and_start_studio(uuid,jsonb,text,text) to authenticated, service_role;
