-- A reservation is released on the day it was booked, not on the day it ended.
--
-- Pipeline fix review 1 finding 3.
--
-- `principal_daily_usage` is keyed by (principal, usage_date), so every cent of
-- `reserved_spend_cents` sits on one particular day's row. Three places book a
-- task's reservation:
--
--   * the run-start RPCs (`approve_and_start_studio_legacy`,
--     `start_studio_run_legacy`) book the studio still's reservation on
--     `current_date`;
--   * `expand_final_media_run` books the other three views on `current_date`
--     at expansion time, which is not necessarily the run-start day;
--   * `reserve_provider_attempt` tops the task up when its estimate exceeds
--     what is already reserved (zero for every path today, because expansion
--     sets `estimated_cost_cents = reservation_cents`).
--
-- The releases used a different date. `reconcile_provider_attempt` releases on
-- `provider_attempts.created_at::date` - the day the attempt ran, which is right
-- for the actual spend and wrong for the reservation - and the dependency
-- terminal branch of `recover_stale_generation_tasks` and
-- `mark_task_pre_spend_blocked` release on `generation_tasks.created_at::date`.
-- A run expanded at 23:58 and generated at 00:03 therefore released nothing:
-- `greatest(0, reserved_spend_cents - v_reserved)` on a row that never held the
-- reservation clamps to zero and reports success, while day D keeps that
-- principal's ceiling permanently consumed by a task that finished.
--
-- The fix is to stop deriving the date and to record it. `reservation_usage_date`
-- is written when the reservation is booked and read by every release. Money
-- actually spent keeps going to the attempt's own date: what was committed on
-- day D+1 belongs to day D+1, and only the reservation follows the booking.
--
-- Backfill uses `created_at::date`, which is what the releases assumed until
-- now, so no existing row's accounting changes.
--
-- Re-runnable: `add column if not exists`, a backfill restricted to nulls, and
-- create or replace on six functions with no signature changes.

alter table public.generation_tasks
  add column if not exists reservation_usage_date date;

comment on column public.generation_tasks.reservation_usage_date is
  'The principal_daily_usage.usage_date this task''s reserved_spend_cents was booked against. Written when the reservation is booked; every release reads it.';

update public.generation_tasks
  set reservation_usage_date = created_at::date
  where reservation_usage_date is null;

-- 1. Booking: the run-start reservation.
--
-- `approve_and_start_studio_legacy` and `start_studio_run_legacy` are the two
-- functions that create the studio task and add `studio_reservation_cents` to
-- today's usage row; the wrappers of the same name without `_legacy` only call
-- them and then `expand_final_media_run`. Both bodies below are the deployed
-- ones, read back with `pg_get_functiondef`, with one line changed in each: the
-- task insert now records the date its reservation was booked on.

CREATE OR REPLACE FUNCTION public.approve_and_start_studio_legacy(p_draft_id uuid, p_specification jsonb, p_approval_key text, p_run_key text)
 RETURNS TABLE(approved_design_id uuid, revision_id uuid, run_id uuid, task_id uuid, outbox_id uuid, canonical_identity_anchor jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_owner uuid := auth.uid(); v_draft public.design_drafts; v_design_id uuid; v_revision_id uuid;
  v_run_id uuid; v_task_id uuid; v_outbox_id uuid; v_revision_number integer; v_identity_anchor jsonb;
  v_language text; v_approved_text text; v_layout text; v_connector text; v_identity_fingerprint text;
  v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_prompt public.prompt_releases;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if coalesce((p_specification->>'spellingConfirmed')::boolean, false) is not true then raise exception 'spelling confirmation required' using errcode = '22023'; end if;
  select * into v_draft from public.design_drafts where id = p_draft_id and owner_principal_id = v_owner for update;
  if not found then raise exception 'draft not found' using errcode = 'P0002'; end if;
  if v_draft.design_id is not null and not exists (select 1 from public.designs d where d.id = v_draft.design_id and d.owner_principal_id = v_owner and d.customer_id = v_owner)
    then raise exception 'draft design ownership mismatch' using errcode = '42501'; end if;
  v_language := case when coalesce(p_specification->>'arabicStyle', 'none') <> 'none' then 'ar' else 'en' end;
  select string_agg(case when v_language = 'ar' then nullif(item->>'approvedArabicText', '') else nullif(item->>'approvedEnglishText', '') end, ' & ' order by ordinal)
    into v_approved_text from jsonb_array_elements(p_specification->'names') with ordinality as names(item, ordinal);
  if v_approved_text is null or length(v_approved_text) = 0 then raise exception 'approved text missing for selected script' using errcode = '22023'; end if;
  v_layout := coalesce(p_specification->>'layout', 'single-name'); v_connector := coalesce(p_specification->>'connector', 'none');
  v_identity_fingerprint := encode(extensions.digest(convert_to(concat_ws('|', v_language, v_approved_text, v_layout, v_connector), 'UTF8'), 'sha256'), 'hex');
  v_identity_anchor := jsonb_build_object('approvedText', v_approved_text, 'language', v_language, 'typography', case when v_language = 'ar' then 'Noto Naskh Arabic' else 'Playfair Display Italic' end, 'fingerprint', v_identity_fingerprint, 'geometryPath', concat_ws(':', 'canonical', v_layout, v_connector, v_identity_fingerprint));
  select gr.id, gr.design_id, gr.revision_id into v_run_id, v_design_id, v_revision_id from public.generation_runs gr where gr.owner_principal_id = v_owner and gr.run_idempotency_key = p_run_key;
  if found then
    select gt.id into v_task_id from public.generation_tasks gt where gt.run_id = v_run_id and gt.presentation_view = 'studio';
    select oe.id into v_outbox_id from public.outbox_events oe where oe.aggregate_id = v_run_id and oe.event_type = 'studio.requested';
    select dr.identity_anchor into v_identity_anchor from public.design_revisions dr where dr.id = v_revision_id and dr.owner_principal_id = v_owner;
    return query select v_design_id, v_revision_id, v_run_id, v_task_id, v_outbox_id, v_identity_anchor; return;
  end if;
  select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id = p.release_id where p.profile = 'image.studio' for share of p;
  if not found then raise exception 'image.studio prompt publication required' using errcode = 'P0001'; end if;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_owner) on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id = v_owner and usage_date = current_date for update;
  if v_usage.runs_started >= v_policy.daily_generation_limit then raise exception 'daily generation quota exceeded' using errcode = 'P0001'; end if;
  if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode = 'P0001'; end if;
  if v_draft.design_id is null then
    insert into public.designs(owner_principal_id, customer_id, locale, name) values (v_owner, v_owner, v_draft.locale, v_approved_text) returning id into v_design_id;
    update public.design_drafts set design_id = v_design_id where id = v_draft.id;
  else v_design_id := v_draft.design_id; end if;
  select id into v_revision_id from public.design_revisions where owner_principal_id = v_owner and approval_idempotency_key = p_approval_key;
  if v_revision_id is null then
    select coalesce(max(revision_number), 0) + 1 into v_revision_number from public.design_revisions where design_id = v_design_id;
    insert into public.design_revisions(design_id, owner_principal_id, draft_id, revision_number, specification, identity_anchor, approval_idempotency_key)
      values (v_design_id, v_owner, p_draft_id, v_revision_number, p_specification, v_identity_anchor, p_approval_key) returning id into v_revision_id;
  end if;
  insert into public.generation_runs(design_id, revision_id, owner_principal_id, run_idempotency_key, reserved_spend_cents)
    values (v_design_id, v_revision_id, v_owner, p_run_key, v_policy.studio_reservation_cents) returning id into v_run_id;
  -- The reservation added below lands on today's usage row; the task says so,
  -- so a release on any later day still finds the row that holds it.
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile, reservation_usage_date)
    values (v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:release:' || v_prompt.id, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'still.fal', current_date) returning id into v_task_id;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id, 'promptReleaseId', v_prompt.id), 'outbox:' || v_run_id || ':studio:release:' || v_prompt.id) returning id into v_outbox_id;
  update public.principal_daily_usage set runs_started = runs_started + 1, reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where principal_id = v_owner and usage_date = current_date;
  update public.designs set active_revision_id = v_revision_id, status = 'generating' where id = v_design_id and owner_principal_id = v_owner and customer_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail) values (v_design_id, v_owner, 'customer', 'revision.approved_run.started', jsonb_build_object('revisionId', v_revision_id, 'runId', v_run_id, 'promptReleaseId', v_prompt.id));
  return query select v_design_id, v_revision_id, v_run_id, v_task_id, v_outbox_id, v_identity_anchor;
end $function$;

CREATE OR REPLACE FUNCTION public.start_studio_run_legacy(p_design_id uuid, p_run_key text)
 RETURNS TABLE(run_id uuid, task_id uuid, outbox_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_owner uuid := auth.uid(); v_revision_id uuid; v_run_id uuid; v_task_id uuid; v_outbox_id uuid;
  v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_prompt public.prompt_releases;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select gr.id into v_run_id from public.generation_runs gr where gr.owner_principal_id = v_owner and gr.run_idempotency_key = p_run_key;
  if found then
    select gt.id into v_task_id from public.generation_tasks gt where gt.run_id = v_run_id and gt.presentation_view = 'studio';
    select oe.id into v_outbox_id from public.outbox_events oe where oe.aggregate_id = v_run_id and oe.event_type = 'studio.requested';
    return query select v_run_id, v_task_id, v_outbox_id; return;
  end if;
  select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id = p.release_id where p.profile = 'image.studio' for share of p;
  if not found then raise exception 'image.studio prompt publication required' using errcode = 'P0001'; end if;
  select d.active_revision_id into v_revision_id from public.designs d where d.id = p_design_id and d.owner_principal_id = v_owner and d.customer_id = v_owner for update;
  if v_revision_id is null then raise exception 'approved revision required' using errcode = 'P0002'; end if;
  if exists (select 1 from public.generation_runs gr where gr.design_id = p_design_id and gr.owner_principal_id = v_owner and gr.status in ('queued','running','partial','operator_review')) then raise exception 'one active generation run allowed' using errcode = 'P0001'; end if;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_owner) on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id = v_owner and usage_date = current_date for update;
  if v_usage.runs_started >= v_policy.daily_generation_limit then raise exception 'daily generation quota exceeded' using errcode = 'P0001'; end if;
  if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode = 'P0001'; end if;
  insert into public.generation_runs(design_id, revision_id, owner_principal_id, run_idempotency_key, reserved_spend_cents)
    values (p_design_id, v_revision_id, v_owner, p_run_key, v_policy.studio_reservation_cents) returning id into v_run_id;
  -- The reservation added below lands on today's usage row; the task says so,
  -- so a release on any later day still finds the row that holds it.
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile, reservation_usage_date)
    values (v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:release:' || v_prompt.id, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'still.fal', current_date) returning id into v_task_id;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id, 'promptReleaseId', v_prompt.id), 'outbox:' || v_run_id || ':studio:release:' || v_prompt.id) returning id into v_outbox_id;
  update public.principal_daily_usage set runs_started = runs_started + 1, reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where principal_id = v_owner and usage_date = current_date;
  update public.designs set status = 'generating' where id = p_design_id and owner_principal_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail) values (p_design_id, v_owner, 'customer', 'generation_run.started', jsonb_build_object('runId', v_run_id, 'promptReleaseId', v_prompt.id));
  return query select v_run_id, v_task_id, v_outbox_id;
end $function$;

-- 2. Booking: the fan-out.
--
-- Unchanged from 20260908120000_pipeline_release_v2.sql except for the
-- reservation date. The studio task keeps the date its run-start reservation
-- landed on (`coalesce`, because that reservation is the one its
-- `reservation_cents` accounts for); the three dependent views are booked here
-- and so carry today.

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
      update public.generation_tasks set task_profile=v_profile,aspect_ratio=v_ratio,prompt_release=v_prompt.profile||'@v'||v_prompt.version,prompt_release_id=v_prompt.id,provider_profile='still.openai',model_release='gpt-image-2-2026-04-21',style_anchor_release_id=v_anchor.id,pipeline_release=v_release,reservation_cents=v_policy.studio_reservation_cents,estimated_cost_cents=v_policy.studio_reservation_cents,reservation_usage_date=coalesce(reservation_usage_date,current_date) where run_id=p_run_id and presentation_view='studio' returning id into v_task_id;
      update public.outbox_events set event_type='presentation.requested',payload=jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id) where aggregate_id=p_run_id and payload->>'taskId'=v_task_id::text returning id into v_outbox_id;
      v_first_task:=v_task_id; v_first_outbox:=v_outbox_id;
    else
      -- Created and reserved now, dispatched only by release_dependent_tasks.
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,dependency_task_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents,reservation_usage_date)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,v_first_task,v_release,'gpt-image-2-2026-04-21',v_policy.studio_reservation_cents,v_policy.studio_reservation_cents,current_date) returning id into v_task_id;
    end if;
  end loop;
  update public.generation_runs set pipeline_release_id=v_release,reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease',v_release,'taskCount',4,'chain','studio_first'));
  return query select v_first_task,v_first_outbox;
end $$;

-- 3. Release: reconciliation.
--
-- Unchanged from 20260908141000_usage_date_from_attempt.sql except that the
-- reservation is released on the task's booking date while the actual spend
-- stays on the attempt's date. When the two are the same day - every run that
-- does not cross midnight - this is one statement, exactly as before.

create or replace function public.reconcile_provider_attempt(p_task_id uuid,p_attempt integer,p_status text,p_actual_cost_cents integer,p_error_class text default null,p_terminal boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_reserved integer; v_spend_date date; v_reserve_date date;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents<0 then raise exception 'invalid actual cost'; end if;
  update public.provider_attempts set status=p_status,actual_cost_cents=p_actual_cost_cents,error_class=left(p_error_class,120),completed_at=now()
    where task_id=p_task_id and attempt=p_attempt and completed_at is null
    returning estimated_cost_cents, created_at::date into v_reserved, v_spend_date;
  if not found then return; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  -- The day the reservation was booked, which is the only row that holds it.
  v_reserve_date := coalesce(v_task.reservation_usage_date, v_spend_date);
  insert into public.principal_daily_usage(principal_id,usage_date)
    values(v_task.owner_principal_id,v_spend_date)
    on conflict(principal_id,usage_date) do nothing;
  insert into public.principal_daily_usage(principal_id,usage_date)
    values(v_task.owner_principal_id,v_reserve_date)
    on conflict(principal_id,usage_date) do nothing;
  if v_reserve_date = v_spend_date then
    -- One UPDATE: the net change is a decrease whenever the actual cost does not
    -- exceed the estimate, and the trigger never sees an intermediate peak.
    update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=v_spend_date;
  else
    -- Release first, then charge: neither statement raises the reserved total,
    -- so `enforce_daily_provider_spend_cap` takes both as history.
    update public.principal_daily_usage set reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=v_reserve_date;
    update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents where principal_id=v_task.owner_principal_id and usage_date=v_spend_date;
  end if;
  update public.generation_runs set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where id=v_run.id;
  update public.generation_tasks set reservation_cents=greatest(0,reservation_cents-v_reserved) where id=p_task_id;
end $$;

revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;

-- 4. Release: the pre-spend block.
--
-- Unchanged from 20260908141000_usage_date_from_attempt.sql except that the
-- date comes from the booking rather than from the task's creation. They agree
-- for every task created and reserved on one day, which is every task today.

create or replace function public.mark_task_pre_spend_blocked(p_task_id uuid, p_reason text)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_release integer; v_usage_date date;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode = '28000'; end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_task.attempt <> 0 then raise exception 'pre-spend gate cannot follow provider reservation' using errcode = 'P0001'; end if;
  if v_task.status = 'blocked' then return v_task; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;
  v_release := v_task.reservation_cents;
  v_usage_date := coalesce(v_task.reservation_usage_date, v_task.created_at::date);
  insert into public.principal_daily_usage(principal_id, usage_date)
    values (v_task.owner_principal_id, v_usage_date)
    on conflict (principal_id, usage_date) do nothing;
  update public.principal_daily_usage set
    reserved_spend_cents = greatest(0, reserved_spend_cents - v_release)
    where principal_id = v_task.owner_principal_id and usage_date = v_usage_date;
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

revoke all on function public.mark_task_pre_spend_blocked(uuid,text) from public, anon, authenticated;
grant execute on function public.mark_task_pre_spend_blocked(uuid,text) to service_role;

-- 5. Release: the dependency-terminal branch of the stale sweeper.
--
-- Unchanged from 20260908141000_usage_date_from_attempt.sql except for the two
-- `v_row.created_at::date` references in that branch, which become the booking
-- date. The whole function is restated so the property cannot be lost by a
-- later `create or replace` that starts from the older text.

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
  v_reserve_date date;
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
      (cp.task_id is not null) as has_checkpoint,
      dep.status as dependency_status
    from public.generation_tasks t
    join public.generation_runs r on r.id = t.run_id
    left join public.provider_attempts pa
      on pa.task_id = t.id and pa.attempt = t.attempt
    left join public.provider_output_checkpoints cp
      on cp.task_id = t.id and cp.attempt = t.attempt
    left join public.generation_tasks dep
      on dep.id = t.dependency_task_id
    where t.updated_at < p_stale_before
      and t.status in ('queued', 'generating', 'verifying', 'retrying')
    order by t.updated_at, t.id
    limit p_limit
    for update of t skip locked
  loop
    v_event_id := null;
    v_event_key := 'recovery:' || v_row.id || ':attempt:' || v_row.attempt
      || ':stale:' || floor(extract(epoch from v_row.updated_at) * 1000000)::bigint;

    -- Terminal parent: stop once. Checked before every dispatch branch so a
    -- dependent view can never be re-queued, whatever phase it is parked in.
    if v_row.dependency_status in ('blocked', 'failed', 'cancelled')
      and not v_row.has_checkpoint then
      v_reserve_date := coalesce(v_row.reservation_usage_date, v_row.created_at::date);
      insert into public.principal_daily_usage(principal_id, usage_date)
      values (v_row.owner_principal_id, v_reserve_date)
      on conflict (principal_id, usage_date) do nothing;
      update public.principal_daily_usage set
        reserved_spend_cents =
          greatest(0, reserved_spend_cents - coalesce(v_row.reservation_cents, 0))
      where principal_id = v_row.owner_principal_id
        and usage_date = v_reserve_date;
      update public.generation_runs set
        reserved_spend_cents =
          greatest(0, reserved_spend_cents - coalesce(v_row.reservation_cents, 0)),
        updated_at = now()
      where id = v_row.run_id;
      update public.generation_tasks set
        status = 'blocked',
        reservation_cents = 0,
        terminal_error_code = 'dependency_' || v_row.dependency_status,
        updated_at = now()
      where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.dependency_terminal_blocked',
        jsonb_build_object('taskId', v_row.id,
          'dependencyTaskId', v_row.dependency_task_id,
          'dependencyStatus', v_row.dependency_status,
          'releasedReservationCents', coalesce(v_row.reservation_cents, 0),
          'reservationUsageDate', v_reserve_date,
          'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'dependency_terminal';
      outbox_id := null; return next;

    elsif v_row.has_checkpoint then
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
