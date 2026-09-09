-- P6-10: never publish a terminal ready task before its verified asset exists.
-- The live studio smoke exposed ready to /api/state before POST /assets finished;
-- the browser correctly treated ready-without-media as terminal and stopped.
-- Keep asset, status, accounting and dependent dispatch in one transaction.
-- Reconciliation keeps its exact usage-date and once-only accounting semantics;
-- only lock acquisition moves ahead of the attempt UPDATE to match cancellation.

create or replace function public.reconcile_provider_attempt(p_task_id uuid, p_attempt integer, p_status text, p_actual_cost_cents integer, p_error_class text default null, p_terminal boolean default false)
returns void
language plpgsql
security definer
set search_path = '' as $function$
declare v_task public.generation_tasks; v_run public.generation_runs; v_reserved integer; v_usage_date date; v_release integer; v_release_date date;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents<0 then raise exception 'invalid actual cost'; end if;
  -- Match cancellation and atomic completion: task, then run, then attempt.
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  if not found then return; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  update public.provider_attempts set status=p_status,actual_cost_cents=p_actual_cost_cents,error_class=left(p_error_class,120),completed_at=now()
    where task_id=p_task_id and attempt=p_attempt and completed_at is null
    returning estimated_cost_cents, usage_date into v_reserved, v_usage_date;
  if not found then
    -- Fix-3 review M2: the pre-spend fallback. The task refused to spend before
    -- any attempt existed, so there is nothing to reconcile and the run-start
    -- reservation is still booked. Release it from the row the task says holds
    -- it, the same row `mark_task_pre_spend_blocked` would have used.
    if p_attempt=0 and p_terminal
      and not exists(select 1 from public.provider_attempts where task_id=p_task_id) then
      select * into v_task from public.generation_tasks where id=p_task_id for update;
      if not found then return; end if;
      v_release:=greatest(coalesce(v_task.reservation_cents,0),0);
      if v_release>0 then
        select * into v_run from public.generation_runs where id=v_task.run_id for update;
        v_release_date:=coalesce(v_task.reservation_usage_date,v_task.created_at::date);
        insert into public.principal_daily_usage(principal_id,usage_date) values(v_task.owner_principal_id,v_release_date) on conflict(principal_id,usage_date) do nothing;
        update public.principal_daily_usage set reserved_spend_cents=greatest(0,reserved_spend_cents-v_release) where principal_id=v_task.owner_principal_id and usage_date=v_release_date;
        update public.generation_runs set reserved_spend_cents=greatest(0,reserved_spend_cents-v_release) where id=v_run.id;
        update public.generation_tasks set reservation_cents=0 where id=p_task_id;
        insert into public.audit_events(design_id,principal_id,actor_type,action,detail)
          values(v_run.design_id,v_task.owner_principal_id,'job','task.reservation_released_without_attempt',
            jsonb_build_object('taskId',p_task_id,'errorClass',left(p_error_class,120),'releasedReservationCents',v_release,'reservationUsageDate',v_release_date));
      end if;
    end if;
    return;
  end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  -- Fix-3 review M3: the attempt's own booking date. It is where its
  -- reservation was added and it is the day the provider was actually called,
  -- so the release and the charge land on one row and one UPDATE. The net
  -- change is a decrease whenever the actual cost does not exceed the estimate,
  -- and `enforce_daily_provider_spend_cap` never sees an intermediate peak.
  insert into public.principal_daily_usage(principal_id,usage_date)
    values(v_task.owner_principal_id,v_usage_date)
    on conflict(principal_id,usage_date) do nothing;
  update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=v_usage_date;
  update public.generation_runs set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where id=v_run.id;
  update public.generation_tasks set reservation_cents=greatest(0,reservation_cents-v_reserved) where id=p_task_id;
end $function$;

revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean)
  from public, anon, authenticated;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean)
  to service_role;

create or replace function public.complete_presentation_task(
  p_task_id uuid,
  p_attempt integer,
  p_asset jsonb,
  p_actual_cost_cents integer
)
returns text
language plpgsql
security definer
set search_path = '' as $$
declare
  v_task public.generation_tasks;
  v_run public.generation_runs;
  v_attempt public.provider_attempts;
  v_asset public.assets;
  v_existing public.assets;
  v_checkpoint public.provider_output_checkpoints;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required' using errcode='28000';
  end if;
  if p_attempt is null or p_attempt < 1 or p_actual_cost_cents is null or p_actual_cost_cents < 0
    or jsonb_typeof(p_asset) is distinct from 'object' then
    raise exception 'invalid completion payload' using errcode='22023';
  end if;
  if p_asset - array['design_id','revision_id','run_id','task_id','owner_principal_id',
    'presentation_view','bucket_id','object_path','mime_type','byte_size','checksum_sha256',
    'provider','model','prompt_release','prompt_release_id','identity_fingerprint',
    'identity_artifact_id','attempt','verification_result','pipeline_release',
    'style_anchor_release_id','input_asset_ids'] <> '{}'::jsonb then
    raise exception 'invalid completion asset fields' using errcode='22023';
  end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  if not found then raise exception 'task not found' using errcode='P0002'; end if;
  -- This fence is held until commit. A cancelling customer either wins before
  -- any asset exists, or sees an already-completed task after this transaction.
  if v_task.status='cancelled' or v_task.cancel_requested_at is not null then
    raise exception 'task cancelled' using errcode='P0001';
  end if;
  if v_task.attempt is distinct from p_attempt then
    raise exception 'stale completion attempt' using errcode='P0001';
  end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  select * into v_attempt from public.provider_attempts
    where task_id=p_task_id and attempt=p_attempt for update;
  if not found then raise exception 'provider attempt missing' using errcode='P0002'; end if;
  v_asset := jsonb_populate_record(null::public.assets,p_asset);
  if v_asset.task_id is distinct from v_task.id
    or v_asset.run_id is distinct from v_run.id
    or v_asset.design_id is distinct from v_run.design_id
    or v_asset.revision_id is distinct from v_run.revision_id
    or v_asset.owner_principal_id is distinct from v_task.owner_principal_id
    or v_run.owner_principal_id is distinct from v_task.owner_principal_id
    or v_attempt.owner_principal_id is distinct from v_task.owner_principal_id
    or v_asset.attempt is distinct from p_attempt
    or v_asset.presentation_view is distinct from v_task.presentation_view
    or v_asset.prompt_release is distinct from v_task.prompt_release
    or v_asset.prompt_release_id is distinct from v_task.prompt_release_id
    or v_attempt.prompt_release_id is distinct from v_task.prompt_release_id
    or v_asset.pipeline_release is distinct from v_task.pipeline_release
    or v_asset.style_anchor_release_id is distinct from v_task.style_anchor_release_id
    or v_asset.provider is distinct from v_attempt.provider
    or v_asset.model is distinct from v_attempt.model
    or v_asset.identity_artifact_id is distinct from v_task.identity_artifact_id then
    raise exception 'completion lineage mismatch' using errcode='P0001';
  end if;
  perform 1 from public.identity_artifacts
    where id=v_asset.identity_artifact_id and revision_id=v_run.revision_id
      and owner_principal_id=v_task.owner_principal_id and fingerprint=v_asset.identity_fingerprint;
  if not found then raise exception 'completion identity mismatch' using errcode='P0001'; end if;
  select * into v_checkpoint from public.provider_output_checkpoints
    where task_id=p_task_id and attempt=p_attempt;
  if not found or v_checkpoint.owner_principal_id is distinct from v_task.owner_principal_id
    or v_asset.bucket_id is distinct from v_checkpoint.bucket_id
    or v_asset.object_path is distinct from v_checkpoint.object_path
    or v_asset.mime_type is distinct from v_checkpoint.mime_type
    or v_asset.byte_size is distinct from v_checkpoint.byte_size
    or v_asset.checksum_sha256 is distinct from v_checkpoint.checksum_sha256 then
    raise exception 'completion checkpoint mismatch' using errcode='P0001';
  end if;
  if jsonb_typeof(v_asset.verification_result) is distinct from 'object'
    or v_asset.verification_result->>'passed' is distinct from 'true'
    or v_asset.verification_result->>'exactText' is distinct from 'true'
    or v_asset.verification_result->>'exactScript' is distinct from 'true'
    or v_asset.verification_result->>'exactlyTwoConnectedRings' is distinct from 'true'
    or v_asset.verification_result->>'correctShot' is distinct from 'true'
    or v_asset.verification_result->>'noAddedIdentityElements' is distinct from 'true'
    or (v_asset.provider='openai' and v_asset.verification_result#>>'{nameCheck,passed}' is distinct from 'true') then
    raise exception 'completion verification missing' using errcode='P0001';
  end if;
  if v_asset.input_asset_ids is null or exists (
    select 1 from unnest(v_asset.input_asset_ids) as ids(id)
    left join public.assets a on a.id=ids.id
    where a.id is null or a.owner_principal_id<>v_task.owner_principal_id
      or a.run_id<>v_run.id or a.revision_id<>v_run.revision_id
  ) then
    raise exception 'completion input lineage mismatch' using errcode='P0001';
  end if;
  select * into v_existing from public.assets where task_id=p_task_id and attempt=p_attempt;
  if found and not (to_jsonb(v_existing) @> p_asset) then
    raise exception 'completion asset conflict' using errcode='P0001';
  end if;
  if v_task.status='ready' then
    if v_existing.id is null or v_attempt.status<>'succeeded' or v_attempt.completed_at is null
      or v_attempt.actual_cost_cents is distinct from p_actual_cost_cents then
      raise exception 'incomplete terminal presentation' using errcode='P0001';
    end if;
    return 'applied';
  end if;
  if v_task.status not in ('generating','verifying') or v_attempt.completed_at is not null
    or v_attempt.status not in ('reserved','submitted') then
    raise exception 'invalid completion state' using errcode='P0001';
  end if;
  insert into public.assets(design_id,revision_id,run_id,task_id,owner_principal_id,
    presentation_view,bucket_id,object_path,mime_type,byte_size,checksum_sha256,
    provider,model,prompt_release,prompt_release_id,identity_fingerprint,identity_artifact_id,
    attempt,verification_result,pipeline_release,style_anchor_release_id,input_asset_ids)
  values(v_asset.design_id,v_asset.revision_id,v_asset.run_id,v_asset.task_id,v_asset.owner_principal_id,
    v_asset.presentation_view,v_asset.bucket_id,v_asset.object_path,v_asset.mime_type,v_asset.byte_size,v_asset.checksum_sha256,
    v_asset.provider,v_asset.model,v_asset.prompt_release,v_asset.prompt_release_id,v_asset.identity_fingerprint,v_asset.identity_artifact_id,
    v_asset.attempt,v_asset.verification_result,v_asset.pipeline_release,v_asset.style_anchor_release_id,v_asset.input_asset_ids)
  on conflict (task_id,attempt) do nothing;
  perform public.reconcile_provider_attempt(p_task_id,p_attempt,'succeeded',p_actual_cost_cents,null,true);
  perform public.transition_generation_task(p_task_id,array['generating','verifying'],'ready');
  if v_task.presentation_view='studio' then
    perform public.release_dependent_tasks(p_task_id);
  end if;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail)
    values(v_run.design_id,v_task.owner_principal_id,'job','task.ready',
      jsonb_build_object('taskId',p_task_id,'attempt',p_attempt,'assetId',
        (select id from public.assets where task_id=p_task_id and attempt=p_attempt)));
  return 'applied';
end $$;

revoke all on function public.complete_presentation_task(uuid,integer,jsonb,integer)
  from public, anon, authenticated;
grant execute on function public.complete_presentation_task(uuid,integer,jsonb,integer)
  to service_role;
