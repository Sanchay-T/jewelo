-- P1-6. Pipeline release v2: the identity engine is `caleums-identity-v4`.
--
-- The engine that renders the pendant changed under P1-2 to P1-6 (HarfBuzz over
-- the pinned font bytes, bridges, welded rings, and a report measured on the
-- encoded PNG). The pipeline release is the pin that says which engine produced
-- a run's media, so a new engine needs a new release rather than a silent
-- reinterpretation of the old one. Still, verifier and video models and the shot
-- mapping are unchanged from v1: only the identity engine moved.
--
-- Additive and re-runnable: the insert is guarded by the primary key, the status
-- flip only touches a row that is still active, and the two functions are
-- replaced rather than dropped. The functions no longer name a release at all;
-- they read the active row, so the next bump is data.

insert into public.pipeline_releases
  (id,status,identity_engine_release,still_model,verifier_model,video_preview_model,video_final_model,shot_mapping)
select 'caleums-final-media-v2','active','caleums-identity-v4',
       r.still_model,r.verifier_model,r.video_preview_model,r.video_final_model,r.shot_mapping
from public.pipeline_releases r where r.id='caleums-final-media-v1'
on conflict (id) do nothing;

update public.pipeline_releases set status='legacy'
where id='caleums-final-media-v1' and status='active'
  and exists (select 1 from public.pipeline_releases where id='caleums-final-media-v2');

create or replace function public.expand_final_media_run(p_run_id uuid)
returns table(task_id uuid,outbox_id uuid)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
  v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage;
  v_view text; v_profile text; v_ratio text; v_prompt public.prompt_releases; v_anchor public.style_anchor_releases;
  v_task_id uuid; v_outbox_id uuid; v_first_task uuid; v_first_outbox uuid; v_additional integer;
  v_release text;
begin
  select * into v_run from public.generation_runs where id=p_run_id for update;
  if not found then raise exception 'run not found' using errcode='P0002'; end if;
  -- The release is read from the registry, never written here as a literal:
  -- bumping the identity engine is an insert plus a status flip, not a code change.
  select id into v_release from public.pipeline_releases where status='active' order by created_at desc limit 1;
  if v_release is null then raise exception 'no active pipeline release' using errcode='P0001'; end if;
  -- Already expanded: any final-media pin, not just the one that is active now,
  -- so a run pinned to an older release is still recognised after a bump.
  if v_run.pipeline_release_id like 'caleums-final-media-%' then
    select id into v_first_task from public.generation_tasks where run_id=p_run_id and presentation_view='studio';
    select id into v_first_outbox from public.outbox_events where aggregate_id=p_run_id and payload->>'taskId'=v_first_task::text;
    return query select v_first_task,v_first_outbox; return;
  end if;
  if exists(select 1 from public.generation_prompt_snapshots where task_id in (select id from public.generation_tasks where run_id=p_run_id))
    or exists(select 1 from public.assets where run_id=p_run_id) then
    select id into v_first_task from public.generation_tasks where run_id=p_run_id and presentation_view='studio';
    select id into v_first_outbox from public.outbox_events where aggregate_id=p_run_id and payload->>'taskId'=v_first_task::text;
    return query select v_first_task,v_first_outbox; return;
  end if;
  select * into v_policy from public.runtime_policy where id=true;
  insert into public.principal_daily_usage(principal_id) values(v_run.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_run.owner_principal_id and usage_date=current_date for update;
  v_additional := v_policy.studio_reservation_cents * 3;
  if v_usage.reserved_spend_cents + v_additional > v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  for v_view,v_profile,v_ratio in values
    ('studio','image.packshot','1:1'),('on_skin','image.worn','4:5'),('close_up','image.macro_gift','1:1'),('dark','image.dark_editorial','9:16')
  loop
    select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
    if not found then raise exception 'prompt publication required: %',v_profile; end if;
    select r.* into v_anchor from public.style_anchor_publications p join public.style_anchor_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
    if not found then raise exception 'style anchor registry entry required: %',v_profile; end if;
    if v_view='studio' then
      update public.generation_tasks set task_profile=v_profile,aspect_ratio=v_ratio,prompt_release=v_prompt.profile||'@v'||v_prompt.version,prompt_release_id=v_prompt.id,provider_profile='still.openai',model_release='gpt-image-2-2026-04-21',style_anchor_release_id=v_anchor.id,pipeline_release=v_release,reservation_cents=v_policy.studio_reservation_cents,estimated_cost_cents=v_policy.studio_reservation_cents where run_id=p_run_id and presentation_view='studio' returning id into v_task_id;
      update public.outbox_events set event_type='presentation.requested',payload=jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id) where aggregate_id=p_run_id and payload->>'taskId'=v_task_id::text returning id into v_outbox_id;
      v_first_task:=v_task_id; v_first_outbox:=v_outbox_id;
    else
      -- Created and reserved now, dispatched only by release_dependent_tasks.
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,dependency_task_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,v_first_task,v_release,'gpt-image-2-2026-04-21',v_policy.studio_reservation_cents,v_policy.studio_reservation_cents) returning id into v_task_id;
    end if;
  end loop;
  update public.generation_runs set pipeline_release_id=v_release,reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease',v_release,'taskCount',4,'chain','studio_first'));
  return query select v_first_task,v_first_outbox;
end $$;

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
    values (p_run_id, v_run.owner_principal_id, v_view, 'video:' || p_request_key, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'video.fal', v_profile, '9:16', p_source_task_id, array[v_source_asset.id], v_run.pipeline_release_id, v_model, v_policy.video_reservation_cents, v_policy.video_reservation_cents)
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

revoke all on function public.expand_final_media_run(uuid) from public,anon,authenticated;
grant execute on function public.expand_final_media_run(uuid) to service_role;
revoke all on function public.request_video_task(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.request_video_task(uuid,text,uuid,text) to service_role;
