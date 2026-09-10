-- Spend guards fail closed, and money already spent is always recorded.
--
-- Three defects found by the 7 September adversarial review of W0.
--
-- M5a - the spend cap failed OPEN when runtime_policy was empty.
--   enforce_daily_provider_spend_cap does `select * into v_policy from
--   public.runtime_policy where id = true`. plpgsql leaves v_policy all-NULL
--   when no row matches and does NOT raise, so every subsequent comparison
--   (`... > v_policy.max_reserved_spend_cents`) evaluates to NULL, `if NULL
--   then` is not taken, and both the per-principal and the global ceiling are
--   silently skipped. One deleted or never-seeded singleton row therefore
--   removes every spend ceiling in the system. It now raises
--   `runtime policy missing` before any comparison.
--
-- M5b - a BEFORE trigger could refuse to record money that was already spent.
--   The ceilings were evaluated on every insert and update of
--   public.principal_daily_usage, including the reconciliation, release,
--   cancellation and stale-recovery paths whose whole job is to write down a
--   provider charge that has already happened. A principal sitting at the
--   ceiling, or an attempt whose actual cost exceeded its estimate, made
--   reconcile_provider_attempt raise `daily spend guard exceeded`; the whole
--   reconcile transaction rolled back; the completed task stayed `generating`
--   with an open attempt; the two-minute sweeper then found it stale. A
--   ceiling must never be able to convert a completed paid attempt into a
--   second paid attempt.
--
--   The guard now fires only on a *new commitment*: an increase in
--   reserved_spend_cents or in runs_started. An update that only raises
--   actual_spend_cents, or that lowers reserved_spend_cents, is history being
--   recorded and is always accepted. The budget is not weakened: the recorded
--   actual spend stays inside the total that the next reservation is measured
--   against, so the next reservation is refused instead.
--
--   The review also reported that reconcile_provider_attempt raises
--   actual_spend_cents in one statement and releases reserved_spend_cents in a
--   later one, leaving the trigger to see the peak. That is true of the
--   definition in 20260827010000_caleums_security_accounting_identity_fix.sql
--   line 69, which 20260827080000_caleums_final_media_pipeline.sql line 289
--   already superseded with a single UPDATE. The current function is restated
--   below unchanged, with the two columns moved in one statement, so the
--   property is pinned by a migration whose name states it and cannot be lost
--   again by a future `create or replace` that starts from the older text.
--
-- M1 - a duplicate dispatch could open a second paid attempt.
--   generation_tasks.dispatch_idempotency_key is written once at task creation
--   and never updated, so it cannot distinguish two deliveries of one dispatch;
--   the outbox event's own dispatch key is fresh on every legitimate
--   re-dispatch but is not carried in the job payload. What *is* observable in
--   the database is that every legitimate path closes the task's open provider
--   attempt before reserving the next one:
--     - the in-dispatch regeneration loop calls fail() ->
--       reconcile_provider_attempt (completed_at set) before its next reserve;
--     - cancel_generation_task closes the open attempt itself;
--     - retry_generation_task only accepts status failed or blocked;
--     - recover_stale_generation_tasks never re-dispatches a task with an open
--       attempt - it marks it ambiguous and blocks it for operator review;
--     - video poll closes the attempt before writing its retry outbox event.
--   The only caller that reaches reserve_provider_attempt while attempt N is
--   still open is a second, concurrent execution of the same dispatch. It is
--   now refused with `provider attempt already open`, before any reservation
--   and before any provider call. The exact-replay short circuit on
--   provider_idempotency_key is evaluated first and is unaffected.
--
-- Re-runnable: create or replace only. No table, column or signature changes,
-- so PostgREST call sites and the granted signatures are untouched.

create or replace function public.enforce_daily_provider_spend_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_policy public.runtime_policy;
  v_old_reserved integer;
  v_old_runs integer;
  v_others_spend bigint;
  v_others_runs bigint;
  v_new_total integer;
begin
  select * into v_policy from public.runtime_policy where id = true;
  -- Fail closed. A missing singleton would otherwise make every comparison
  -- below NULL and disable both ceilings.
  if v_policy.id is null then
    raise exception 'runtime policy missing' using errcode = 'P0001';
  end if;

  v_old_reserved := case when tg_op = 'UPDATE' then old.reserved_spend_cents else 0 end;
  v_old_runs := case when tg_op = 'UPDATE' then old.runs_started else 0 end;

  -- Nothing new is being committed: a reconciliation, a reservation release, a
  -- cancellation, a stale recovery, or the zero-valued upsert that creates the
  -- row. Recording it can never be refused; refusing it would lose the truth
  -- about a charge that already happened and would re-open the task for
  -- another paid attempt.
  if new.reserved_spend_cents <= v_old_reserved
     and new.runs_started <= v_old_runs then
    return new;
  end if;

  v_new_total := new.actual_spend_cents + new.reserved_spend_cents;

  -- Per-principal ceiling.
  if v_new_total > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;

  -- Serialize the aggregate read so two sessions cannot both pass a stale sum.
  -- Acquired last, after the caller's row lock, on every path; no lock cycle.
  perform pg_advisory_xact_lock(
    hashtextextended('global-daily-spend-cap:' || new.usage_date::text, 0)
  );

  select
    coalesce(sum(u.actual_spend_cents + u.reserved_spend_cents), 0),
    coalesce(sum(u.runs_started), 0)
  into v_others_spend, v_others_runs
  from public.principal_daily_usage u
  where u.usage_date = new.usage_date
    and u.principal_id <> new.principal_id;

  if v_others_spend + v_new_total > v_policy.global_max_reserved_spend_cents then
    raise exception 'global daily spend guard exceeded' using errcode = 'P0001';
  end if;

  if v_others_runs + new.runs_started > v_policy.global_daily_generation_limit then
    raise exception 'global daily generation limit exceeded' using errcode = 'P0001';
  end if;

  return new;
end $$;

revoke all on function public.enforce_daily_provider_spend_cap()
from public, anon, authenticated;

-- Unchanged from 20260827080000 except for the comment: the actual-spend
-- increase and the reservation release are one statement on each of
-- principal_daily_usage and generation_runs, so no observer ever sees the peak.
create or replace function public.reconcile_provider_attempt(p_task_id uuid,p_attempt integer,p_status text,p_actual_cost_cents integer,p_error_class text default null,p_terminal boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_reserved integer;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents<0 then raise exception 'invalid actual cost'; end if;
  update public.provider_attempts set status=p_status,actual_cost_cents=p_actual_cost_cents,error_class=left(p_error_class,120),completed_at=now()
    where task_id=p_task_id and attempt=p_attempt and completed_at is null returning estimated_cost_cents into v_reserved;
  if not found then return; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  -- One UPDATE: the net change is a decrease whenever the actual cost does not
  -- exceed the estimate, and the trigger never sees an intermediate peak.
  update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=current_date;
  update public.generation_runs set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where id=v_run.id;
  update public.generation_tasks set reservation_cents=greatest(0,reservation_cents-v_reserved) where id=p_task_id;
end $$;

revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;

-- Unchanged from 20260827080000 except for the open-attempt guard marked below.
create or replace function public.reserve_provider_attempt(p_task_id uuid,p_provider text,p_model text,p_provider_key text)
returns table(attempt_number integer,duplicate_complete boolean)
language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts; v_reserve integer; v_estimate integer;
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
  v_attempt:=v_task.attempt+1; if v_attempt>3 then raise exception 'provider attempt budget exhausted' using errcode='P0001'; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  select * into v_policy from public.runtime_policy where id=true;
  if v_policy.id is null then raise exception 'runtime policy missing' using errcode='P0001'; end if;
  insert into public.principal_daily_usage(principal_id) values(v_task.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_task.owner_principal_id and usage_date=current_date for update;
  v_estimate:=coalesce(nullif(v_task.estimated_cost_cents,0),v_policy.studio_reservation_cents);
  v_reserve:=greatest(v_estimate-v_task.reservation_cents,0);
  if v_usage.reserved_spend_cents+v_reserve>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  if v_reserve>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_reserve where principal_id=v_task.owner_principal_id and usage_date=current_date;
    update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_reserve where id=v_run.id;
    update public.generation_tasks set reservation_cents=reservation_cents+v_reserve where id=p_task_id returning * into v_task;
  end if;
  insert into public.provider_attempts(task_id,owner_principal_id,attempt,provider,model,provider_idempotency_key,status,estimated_cost_cents,prompt_release_id)
  values(p_task_id,v_task.owner_principal_id,v_attempt,p_provider,p_model,p_provider_key,'reserved',v_estimate,v_task.prompt_release_id);
  update public.generation_tasks set attempt=v_attempt,status='generating' where id=p_task_id;
  return query select v_attempt,false;
end $$;

revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;
