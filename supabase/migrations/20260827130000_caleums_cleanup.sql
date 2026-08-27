-- Caleums cleanup.
--
-- 1. Replace the dynamically spliced expand_final_media_run with a static
--    definition. 20260827090000 read pg_get_functiondef back and regex-spliced
--    "#variable_conflict use_column" into the body at migration time. That
--    splice is superseded here by a plain create or replace that carries the
--    pragma in source, so the function shape no longer depends on a regex
--    matching pg_get_functiondef output.
-- 2. Raise the development runtime spend/generation ceilings so a full
--    four-still Caleums fanout plus optional video fits inside the guard.
--
-- Re-runnable: every statement is create or replace / alter ... set default /
-- idempotent update or grant.

create or replace function public.expand_final_media_run(p_run_id uuid)
returns table(task_id uuid,outbox_id uuid)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
  v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage;
  v_view text; v_profile text; v_ratio text; v_prompt public.prompt_releases; v_anchor public.style_anchor_releases;
  v_task_id uuid; v_outbox_id uuid; v_first_task uuid; v_first_outbox uuid; v_additional integer;
begin
  select * into v_run from public.generation_runs where id=p_run_id for update;
  if not found then raise exception 'run not found' using errcode='P0002'; end if;
  if v_run.pipeline_release_id='caleums-final-media-v1' then
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
      update public.generation_tasks set task_profile=v_profile,aspect_ratio=v_ratio,prompt_release=v_prompt.profile||'@v'||v_prompt.version,prompt_release_id=v_prompt.id,provider_profile='still.openai',model_release='gpt-image-2-2026-04-21',style_anchor_release_id=v_anchor.id,pipeline_release='caleums-final-media-v1',reservation_cents=v_policy.studio_reservation_cents,estimated_cost_cents=v_policy.studio_reservation_cents where run_id=p_run_id and presentation_view='studio' returning id into v_task_id;
      update public.outbox_events set event_type='presentation.requested',payload=jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id) where aggregate_id=p_run_id and payload->>'taskId'=v_task_id::text returning id into v_outbox_id;
    else
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,'caleums-final-media-v1','gpt-image-2-2026-04-21',v_policy.studio_reservation_cents,v_policy.studio_reservation_cents) returning id into v_task_id;
      insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,dispatch_idempotency_key)
      values('run',p_run_id,'presentation.requested',jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id),'outbox:'||p_run_id||':'||v_view||':release:'||v_prompt.id) returning id into v_outbox_id;
    end if;
    if v_view='studio' then v_first_task:=v_task_id; v_first_outbox:=v_outbox_id; end if;
  end loop;
  update public.generation_runs set pipeline_release_id='caleums-final-media-v1',reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease','caleums-final-media-v1','taskCount',4));
  return query select v_first_task,v_first_outbox;
end $$;

revoke all on function public.expand_final_media_run(uuid) from public,anon,authenticated;
grant execute on function public.expand_final_media_run(uuid) to service_role;

alter table public.runtime_policy
  alter column max_reserved_spend_cents set default 1200,
  alter column daily_generation_limit set default 6;
update public.runtime_policy set max_reserved_spend_cents = 1200, daily_generation_limit = 6;
