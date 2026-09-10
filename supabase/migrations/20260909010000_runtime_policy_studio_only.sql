-- DS-6: a studio-only switch, so the first paid run bills one image and not four.
--
-- P4-1 published all six style anchors, so `expand_final_media_run` now finds a
-- publication for every profile and fans every run out to four tasks at
-- creation: the studio still plus on_skin, close_up and dark, each reserved at
-- `studio_reservation_cents` and each allowed `provider_attempt_budget`
-- attempts.
-- With the launch numbers that is up to four images per run and twelve with
-- retries, on the very first run made against a real provider.
--
-- The switch is operational state, not a schema decision, so it lives on the
-- `runtime_policy` singleton beside the caps that P5-1 proved binding, and
-- defaults to false: with the flag off this function behaves exactly as it does
-- today, statement for statement.
--
-- With the flag on the three dependent views are still created - the run keeps
-- its shape, the atelier keeps four slots and the operator queue keeps the
-- history - but they are created `cancelled` with `reservation_cents = 0` and
-- `terminal_error_code = 'studio_only_policy'`.
-- Nothing books their 300 cents, nothing dispatches them
-- (`release_dependent_tasks` only picks up tasks in `queued`), and
-- `refresh_run_status` already treats a run whose still views are ready or
-- cancelled as `complete`, so a studio-only run completes rather than sitting
-- in `partial`.
-- The atelier reads a `cancelled` task as unreachable and shows that view as
-- `unavailable` (`apps/web/src/features/atelier/personalizedRun.ts`), which is
-- the honest sentence: the shop photographs the other angles by hand.
--
-- Run-level bookkeeping fixed in the same function, because it would otherwise
-- claim work that was never booked:
--   * `generation_runs.reserved_spend_cents` and `principal_daily_usage.
--     reserved_spend_cents` are incremented by `v_additional`, which is now 0
--     under the flag, so the run reserves the studio's 100 cents and nothing
--     more;
--   * the `pipeline.final_media_pinned` audit event recorded `taskCount 4`
--     unconditionally; it now records the number of dispatchable tasks (1 under
--     the flag) and a `studioOnly` boolean, so the ledger says which shape the
--     run was created in;
--   * the daily spend guard is skipped under the flag rather than evaluated
--     with a zero increment, so the false branch keeps its exact behaviour even
--     when `studio_reservation_cents` is 0.
-- There is no `expected_task_count` column on `generation_runs`; run status is
-- derived from the task rows by `refresh_run_status`, so there is nothing else
-- to correct.
--
-- The dependent rows carry `reservation_usage_date = null` under the flag,
-- because no reservation was booked for them and every release path reads that
-- date to find the row that holds the money.
-- They are terminal at insert, so no release path runs for them at all.
--
-- Re-runnable: `add column if not exists` plus one `create or replace` with no
-- signature, security or search_path change.

alter table public.runtime_policy
  add column if not exists studio_only boolean not null default false;

comment on column public.runtime_policy.studio_only is
  'When true, expand_final_media_run creates the three dependent views cancelled with terminal_error_code studio_only_policy and books no reservation for them, so a run bills one image. Set for the first real-provider smoke, cleared once DS-6 is satisfied.';

create or replace function public.expand_final_media_run(p_run_id uuid)
returns table(task_id uuid,outbox_id uuid)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare
  v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage;
  v_view text; v_profile text; v_ratio text; v_prompt public.prompt_releases; v_anchor public.style_anchor_releases;
  v_task_id uuid; v_outbox_id uuid; v_first_task uuid; v_first_outbox uuid; v_additional integer;
  v_release text; v_studio_only boolean;
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
  -- Read once, at expansion time, so a flip mid-run cannot leave one run half
  -- booked: the shape of a run is decided by the policy it was expanded under.
  v_studio_only := coalesce(v_policy.studio_only,false);
  insert into public.principal_daily_usage(principal_id) values(v_run.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_run.owner_principal_id and usage_date=current_date for update;
  v_additional := case when v_studio_only then 0 else v_policy.studio_reservation_cents * 3 end;
  if not v_studio_only and v_usage.reserved_spend_cents + v_additional > v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
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
      -- Under studio_only the same row is written terminal and free: cancelled,
      -- zero cents, no usage date because nothing was booked for it, and a code
      -- that says which policy ended it.
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,dependency_task_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents,reservation_usage_date,status,terminal_error_code)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,v_first_task,v_release,'gpt-image-2-2026-04-21',
        case when v_studio_only then 0 else v_policy.studio_reservation_cents end,
        case when v_studio_only then 0 else v_policy.studio_reservation_cents end,
        case when v_studio_only then null else current_date end,
        case when v_studio_only then 'cancelled' else 'queued' end::public.task_status,
        case when v_studio_only then 'studio_only_policy' else null end) returning id into v_task_id;
    end if;
  end loop;
  update public.generation_runs set pipeline_release_id=v_release,reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease',v_release,'taskCount',case when v_studio_only then 1 else 4 end,'studioOnly',v_studio_only,'chain','studio_first'));
  return query select v_first_task,v_first_outbox;
end $$;
