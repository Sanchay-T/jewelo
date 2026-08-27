-- Caleums studio-first chain.
--
-- The four stills used to dispatch together, so the three model views only ever
-- saw the deterministic silhouette plus a style anchor that carries another
-- customer's name; the model copied that name and the shots disagreed with one
-- another. The studio packshot now runs first and the three model views wait for
-- it: they are still created and reserved inside the same run transaction, but
-- they carry dependency_task_id and no outbox row, so nothing dispatches them
-- until release_dependent_tasks runs after the studio still is ready.
--
-- A studio task that ends blocked never calls release_dependent_tasks, so its
-- dependents stay queued and refresh_run_status already derives operator_review
-- from the blocked studio task itself.
--
-- Re-runnable: create or replace plus an idempotent insert.

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
      v_first_task:=v_task_id; v_first_outbox:=v_outbox_id;
    else
      -- Created and reserved now, dispatched only by release_dependent_tasks.
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,dependency_task_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,v_first_task,'caleums-final-media-v1','gpt-image-2-2026-04-21',v_policy.studio_reservation_cents,v_policy.studio_reservation_cents) returning id into v_task_id;
    end if;
  end loop;
  update public.generation_runs set pipeline_release_id='caleums-final-media-v1',reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease','caleums-final-media-v1','taskCount',4,'chain','studio_first'));
  return query select v_first_task,v_first_outbox;
end $$;

-- Dispatch the model views that were waiting on a now-ready studio still.
create or replace function public.release_dependent_tasks(p_source_task_id uuid)
returns integer
language plpgsql security definer set search_path='' as $$
declare v_source public.generation_tasks; v_task public.generation_tasks; v_released integer := 0; v_outbox_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode='28000';
  end if;
  select * into v_source from public.generation_tasks where id=p_source_task_id;
  if not found then raise exception 'task not found' using errcode='P0002'; end if;
  if v_source.status <> 'ready' then return 0; end if;
  for v_task in
    select t.* from public.generation_tasks t
    where t.dependency_task_id = p_source_task_id
      and t.status = 'queued'
      and t.cancel_requested_at is null
      and not exists (
        select 1 from public.outbox_events o
        where o.payload->>'taskId' = t.id::text
          and o.event_type = 'presentation.requested'
      )
    order by t.created_at
  loop
    insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,dispatch_idempotency_key)
    values('run',v_task.run_id,'presentation.requested',
      jsonb_build_object('runId',v_task.run_id,'taskId',v_task.id,'taskKind','still','operation','still_execute','promptReleaseId',v_task.prompt_release_id,'styleAnchorReleaseId',v_task.style_anchor_release_id),
      'outbox:'||v_task.run_id||':'||v_task.presentation_view||':release:'||v_task.prompt_release_id)
    on conflict (dispatch_idempotency_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then v_released := v_released + 1; end if;
    v_outbox_id := null;
  end loop;
  if v_released > 0 then
    insert into public.audit_events(design_id,principal_id,actor_type,action,detail)
    select r.design_id,v_source.owner_principal_id,'system','pipeline.dependents_released',
      jsonb_build_object('sourceTaskId',p_source_task_id,'released',v_released)
    from public.generation_runs r where r.id=v_source.run_id;
  end if;
  return v_released;
end $$;

revoke all on function public.expand_final_media_run(uuid) from public,anon,authenticated;
grant execute on function public.expand_final_media_run(uuid) to service_role;
revoke all on function public.release_dependent_tasks(uuid) from public,anon,authenticated;
grant execute on function public.release_dependent_tasks(uuid) to service_role;
