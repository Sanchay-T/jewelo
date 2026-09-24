-- SP-1b: the database's own restatement of the still verdict must require the
-- one-piece field. 06de81d added `singleConnectedPiece` to the still
-- verification and the jobs gate refuses a still without it, but the
-- independent completion authority here restated every other flag and not that
-- one, so a job build that lost the gate could still write a ready asset for a
-- pendant cut into two halves. Identical body to
-- 20260909030000_complete_presentation_atomically.sql plus one condition in the
-- verification block, raising the same 'completion verification missing'.
-- Every still written by the current jobs code already carries the field.

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
    or v_asset.verification_result->>'singleConnectedPiece' is distinct from 'true'
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
