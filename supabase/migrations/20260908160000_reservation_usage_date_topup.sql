-- Fix-2 review M2: the retry top-up books on the booking date, not on today.
--
-- `20260908150000_reservation_usage_date.sql` taught the release paths
-- (`reconcile_provider_attempt`, `mark_task_pre_spend_blocked`, the
-- dependency-terminal branch of the sweeper) to release from
-- `generation_tasks.reservation_usage_date`, but left the two booking paths
-- reserving on `current_date`. A task reserved at 23:59 on day D and retried at
-- 00:02 on D+1 therefore added the top-up to the D+1 ledger row while its
-- reconcile released from the D row, where nothing was held any more:
-- `greatest(0, ...)` swallowed the release and the amount stayed reserved on
-- D+1 for ever, permanently consuming part of `max_reserved_spend_cents`.
--
-- Both functions are restated from the live bodies read with
-- `pg_get_functiondef`, not reconstructed from earlier migration files, so no
-- property added since the last migration is dropped here.
--
-- 1. Booking: the paid attempt reservation and its top-up.
--
-- Every ledger read, guard and write in this function now uses the booking date
-- `v_book_date = coalesce(reservation_usage_date, current_date)`, which is the
-- same row the release paths read. The first reservation of a task also stamps
-- `reservation_usage_date`, so the pairing is recorded rather than inferred;
-- `coalesce` in the write means a later attempt can never move it.

create or replace function public.reserve_provider_attempt(p_task_id uuid, p_provider text, p_model text, p_provider_key text)
returns table(attempt_number integer, duplicate_complete boolean)
language plpgsql
security definer
set search_path = '' as $function$
declare v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts; v_reserve integer; v_estimate integer; v_book_date date;
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
  -- Fix-2 review M2: the booking date. A retry that crosses midnight tops up
  -- the row its first attempt reserved on, which is the row its reconcile will
  -- release from.
  v_book_date:=coalesce(v_task.reservation_usage_date,current_date);
  insert into public.principal_daily_usage(principal_id,usage_date) values(v_task.owner_principal_id,v_book_date) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_task.owner_principal_id and usage_date=v_book_date for update;
  v_estimate:=coalesce(nullif(v_task.estimated_cost_cents,0),v_policy.studio_reservation_cents);
  v_reserve:=greatest(v_estimate-v_task.reservation_cents,0);
  if v_usage.reserved_spend_cents+v_reserve>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  if v_reserve>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_reserve where principal_id=v_task.owner_principal_id and usage_date=v_book_date;
    update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_reserve where id=v_run.id;
    update public.generation_tasks set reservation_cents=reservation_cents+v_reserve,reservation_usage_date=coalesce(reservation_usage_date,v_book_date) where id=p_task_id returning * into v_task;
  end if;
  insert into public.provider_attempts(task_id,owner_principal_id,attempt,provider,model,provider_idempotency_key,status,estimated_cost_cents,prompt_release_id)
  values(p_task_id,v_task.owner_principal_id,v_attempt,p_provider,p_model,p_provider_key,'reserved',v_estimate,v_task.prompt_release_id);
  update public.generation_tasks set attempt=v_attempt,status='generating',reservation_usage_date=coalesce(reservation_usage_date,v_book_date) where id=p_task_id;
  return query select v_attempt,false;
end $function$;

revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;

-- 2. Booking: the video task.
--
-- Latent half of the same defect. The task was inserted with no
-- `reservation_usage_date` while its reservation was booked on `current_date`,
-- so a release taken before midnight from `coalesce(reservation_usage_date,
-- created_at::date)` happened to agree and a release taken after one did not.
-- The date is now recorded on the row that holds the reservation.

create or replace function public.request_video_task(p_run_id uuid, p_kind text, p_source_task_id uuid, p_request_key text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $function$
declare
  v_run public.generation_runs; v_source public.generation_tasks; v_source_asset public.assets;
  v_profile text; v_view text; v_model text; v_prompt public.prompt_releases;
  v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_task public.generation_tasks;
  v_book_date date;
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
  -- One date for the ledger row, the task row and every guard below, so the
  -- booking cannot be split across two days by a midnight between statements.
  v_book_date := current_date;
  insert into public.principal_daily_usage(principal_id, usage_date) values (v_run.owner_principal_id, v_book_date)
    on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage
    where principal_id = v_run.owner_principal_id and usage_date = v_book_date for update;
  if v_usage.reserved_spend_cents + v_policy.video_reservation_cents > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile, task_profile, aspect_ratio, dependency_task_id, input_asset_ids, pipeline_release, model_release, reservation_cents, estimated_cost_cents, reservation_usage_date)
    values (p_run_id, v_run.owner_principal_id, v_view, 'video:' || p_request_key, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'video.fal', v_profile, '9:16', p_source_task_id, array[v_source_asset.id], v_run.pipeline_release_id, v_model, v_policy.video_reservation_cents, v_policy.video_reservation_cents, v_book_date)
    returning * into v_task;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', v_task.id, 'video.requested',
      jsonb_build_object('runId', p_run_id, 'taskId', v_task.id, 'taskKind', 'video'),
      'outbox:video:' || p_request_key);
  update public.principal_daily_usage set reserved_spend_cents = reserved_spend_cents + v_policy.video_reservation_cents
    where principal_id = v_run.owner_principal_id and usage_date = v_book_date;
  update public.generation_runs set reserved_spend_cents = reserved_spend_cents + v_policy.video_reservation_cents
    where id = p_run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_run.design_id, v_run.owner_principal_id, 'job', 'video.requested',
      jsonb_build_object('taskId', v_task.id, 'sourceTaskId', p_source_task_id, 'kind', p_kind));
  return v_task;
end $function$;

revoke all on function public.request_video_task(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.request_video_task(uuid,text,uuid,text) to service_role;
