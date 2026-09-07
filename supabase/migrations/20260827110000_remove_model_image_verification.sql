-- Model image verification is removed from the Caleums pipeline.
--
-- gpt-5.6-luna no longer grades generated stills. A still becomes `ready` when
-- the provider returns bytes and those bytes are stored privately. Identity
-- remains owned by the pre-spend deterministic solver and the immutable
-- canonical PNG, which are unchanged.
--
-- gpt-5.6-luna survives in exactly one place: proposing an Arabic spelling for
-- an English name at design entry, which the customer then confirms. That call
-- happens in the web tier and has no prompt release or task profile.

-- 1. Retire `verification.image`: unpublish it so no task can pin it, and stop
--    any further publication. `prompt_releases` and `prompt_publication_events`
--    are append-only audit enforced by trigger, so their historical rows stay
--    exactly as they were - they record what was true. An unpublished profile
--    is unreachable, which is what actually removes it from the pipeline.
delete from public.prompt_profile_publications where profile = 'verification.image';

alter table public.prompt_profile_publications drop constraint if exists prompt_profile_publications_profile_check;
alter table public.prompt_profile_publications add constraint prompt_profile_publications_profile_check check (profile in
  ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final'));

-- create_prompt_release validates the profile inline; drop the retired one.
create or replace function public.create_prompt_release(p_profile text,p_template text,p_parsed_variables text[],p_change_note text,p_created_by text)
returns public.prompt_releases language plpgsql security definer set search_path='' as $$
declare v_release public.prompt_releases; v_version integer; v_required text[];
begin
  if p_profile not in ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final') then raise exception 'invalid prompt profile'; end if;
  if length(trim(p_template))=0 or length(p_template)>12000 then raise exception 'invalid prompt template length'; end if;
  if length(trim(p_change_note))=0 or length(p_change_note)>500 then raise exception 'invalid change note'; end if;
  v_required:=array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'];
  if p_profile<>'image.studio' then v_required:=v_required||array['inspiration_rule']; end if;
  if p_parsed_variables is null or not (p_parsed_variables @> v_required and p_parsed_variables <@ v_required) or cardinality(p_parsed_variables)<>cardinality(array(select distinct unnest(p_parsed_variables))) then raise exception 'invalid prompt variables'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-release:'||p_profile,0));
  select coalesce(max(version),0)+1 into v_version from public.prompt_releases where profile=p_profile;
  insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values(p_profile,v_version,p_template,p_parsed_variables,p_change_note,p_created_by) returning * into v_release;
  insert into public.audit_events(actor_type,action,detail) values('operator','prompt.release_created',jsonb_build_object('profile',p_profile,'releaseId',v_release.id,'version',v_version));
  return v_release;
end $$;
revoke all on function public.create_prompt_release(text,text,text[],text,text) from public,anon,authenticated;

-- 2. A pipeline release no longer pins a verifier model.
alter table public.pipeline_releases alter column verifier_model drop not null;
update public.pipeline_releases set verifier_model = null where id = 'caleums-final-media-v1';

-- 3. Motion derives from a stored, ready still - not from a model verdict.
--    The old predicate required verification_result->>'passed'='true', which no
--    asset can satisfy once model verification is gone.
create or replace function public.request_video_task(p_run_id uuid,p_kind text,p_source_task_id uuid,p_request_key text)
returns public.generation_tasks
language plpgsql security definer set search_path='' as $$
declare
  v_run public.generation_runs; v_source public.generation_tasks; v_source_asset public.assets;
  v_task public.generation_tasks; v_profile text; v_view text; v_model text;
  v_prompt public.prompt_releases; v_policy public.runtime_policy; v_usage public.principal_daily_usage;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='28000'; end if;
  if p_kind not in ('preview','final') then raise exception 'invalid video kind' using errcode='22023'; end if;
  select * into v_run from public.generation_runs where id=p_run_id for update;
  select * into v_source from public.generation_tasks where id=p_source_task_id and run_id=p_run_id and status='ready';
  if not found then raise exception 'ready source task required' using errcode='P0002'; end if;
  select * into v_source_asset from public.assets where task_id=p_source_task_id order by created_at desc limit 1;
  if not found then raise exception 'stored source still required' using errcode='P0002'; end if;
  v_profile:=case when p_kind='preview' then 'video.preview' else 'video.final' end;
  v_view:=case when p_kind='preview' then 'motion_preview' else 'motion_final' end;
  v_model:=case when p_kind='preview' then 'bytedance/seedance-2.0/fast/image-to-video' else 'bytedance/seedance-2.0/image-to-video' end;
  select * into v_task from public.generation_tasks where dispatch_idempotency_key='video:'||p_request_key;
  if found then return v_task; end if;
  select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
  if not found then raise exception 'prompt publication required: %',v_profile; end if;
  select * into v_policy from public.runtime_policy where id=true;
  insert into public.principal_daily_usage(principal_id) values(v_run.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_run.owner_principal_id and usage_date=current_date for update;
  if v_usage.reserved_spend_cents+v_policy.video_reservation_cents>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,dependency_task_id,input_asset_ids,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
  values(p_run_id,v_run.owner_principal_id,v_view,'video:'||p_request_key,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'video.fal',v_profile,'9:16',p_source_task_id,array[v_source_asset.id],'caleums-final-media-v1',v_model,v_policy.video_reservation_cents,v_policy.video_reservation_cents)
  returning * into v_task;
  insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,dispatch_idempotency_key)
  values('run',p_run_id,'presentation.requested',jsonb_build_object('runId',p_run_id,'taskId',v_task.id,'taskKind','video','promptReleaseId',v_prompt.id),'outbox:video:'||p_request_key);
  update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_policy.video_reservation_cents where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_policy.video_reservation_cents where principal_id=v_run.owner_principal_id and usage_date=current_date;
  return v_task;
end $$;

revoke all on function public.request_video_task(uuid,text,uuid,text) from public,anon,authenticated;
