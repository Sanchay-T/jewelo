-- Fix-3 review M2 and M3: the money is booked on the day it is spent, and a
-- refusal to spend always gives the reservation back.
--
-- M3. `20260908160000_reservation_usage_date_topup.sql` made
-- `reserve_provider_attempt` guard and book against
-- `generation_tasks.reservation_usage_date`, the day the task's first
-- reservation landed on. That closed the midnight release leak and opened a
-- worse one in the other direction: a retry never moves the date, so a bulk
-- operator retry of yesterday's blocked tasks is checked against yesterday's
-- ledger row - already emptied by the releases - and books today's provider
-- calls there too. Today's row stays small while today's real spend runs past
-- `max_reserved_spend_cents`, and nothing raises. The old bug leaked capacity
-- in the safe direction; that one leaks in the paying direction.
--
-- The date a reservation sits on is now recorded per attempt rather than
-- derived. `provider_attempts.usage_date` is the ledger row this attempt's
-- reservation was booked on; `reserve_provider_attempt` books on
-- `current_date`, guards against `current_date`, and stamps the attempt row,
-- and `reconcile_provider_attempt` releases from and charges to the attempt's
-- own stamp. A task that still holds a reservation booked on an earlier day is
-- carried onto today by the same call: the amount is released from the old row
-- and added to today's, so the guard sees the whole of what today has
-- outstanding, and `generation_tasks.reservation_usage_date` is re-stamped so
-- it keeps pointing at the row that holds the money. That stamp goes on
-- serving the three paths that have no attempt row to read - the run-start
-- reservation at attempt 0, `mark_task_pre_spend_blocked` and the
-- dependency-terminal branch of the sweeper - exactly as
-- `20260908150000_reservation_usage_date.sql` set them up.
--
-- Carrying can be refused: if today's row is already at the ceiling, the retry
-- raises `daily spend guard exceeded` and the whole transaction rolls back,
-- including the release. That is the direction to fail in.
--
-- M2. `reconcile_provider_attempt` returns at once when no attempt row matches,
-- which is right for a late or duplicate reconcile but wrong for the one caller
-- that reaches it at attempt 0: the presentation job's pre-spend fallback,
-- which runs when `mark_task_pre_spend_blocked` itself failed. No provider
-- attempt was ever opened - attempt numbers start at 1 - so the run-start
-- reservation was never released and the principal's ceiling stayed consumed
-- for the rest of the day by a run that correctly refused to spend anything.
-- A terminal reconcile at attempt 0 for a task with no attempt row at all now
-- performs the reservation-release half of `mark_task_pre_spend_blocked`. It
-- cannot double-release: the release zeroes `reservation_cents`, and the
-- `not exists` keeps it away from any task that has ever opened a paid attempt.
--
-- Both bodies below are restated from the live ones read with
-- `pg_get_functiondef`, not rebuilt from earlier migration files, so nothing
-- added since the last migration is dropped here.
--
-- Re-runnable: `add column if not exists`, a backfill restricted to nulls, and
-- `create or replace` on two functions with no signature change.

alter table public.provider_attempts
  add column if not exists usage_date date;

comment on column public.provider_attempts.usage_date is
  'The principal_daily_usage.usage_date this attempt''s reservation was booked on. Written when the attempt is reserved; reconcile_provider_attempt releases from it and charges the actual cost to it.';

-- An open attempt's reservation sits wherever the task says it does; a closed
-- attempt was released long ago and its date is history, which is the day it
-- ran. Neither backfill changes any existing accounting.
update public.provider_attempts pa
  set usage_date = case
    when pa.completed_at is null
      then coalesce(t.reservation_usage_date, pa.created_at::date)
    else pa.created_at::date end
  from public.generation_tasks t
  where t.id = pa.task_id and pa.usage_date is null;

update public.provider_attempts
  set usage_date = created_at::date
  where usage_date is null;

alter table public.provider_attempts
  alter column usage_date set default current_date;

alter table public.provider_attempts
  alter column usage_date set not null;

-- 1. Booking: today's row, and the carry that brings an older reservation onto
-- it.

create or replace function public.reserve_provider_attempt(p_task_id uuid, p_provider text, p_model text, p_provider_key text)
returns table(attempt_number integer, duplicate_complete boolean)
language plpgsql
security definer
set search_path = '' as $function$
declare v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts; v_reserve integer; v_estimate integer; v_book_date date; v_carry integer; v_carry_date date;
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
  -- Fix-3 review M3: the day this attempt runs is the day it is booked on and
  -- guarded against. Anything the task still holds on an earlier row is carried
  -- here first, so the guard below sees everything this principal has
  -- outstanding today and no ceiling can be walked past by retrying yesterday's
  -- work.
  v_book_date:=current_date;
  v_carry_date:=v_task.reservation_usage_date;
  v_carry:=case when coalesce(v_task.reservation_cents,0)>0 and v_carry_date is not null and v_carry_date<>v_book_date then v_task.reservation_cents else 0 end;
  -- Released from the older row before today's row is locked, so the two rows
  -- are always taken in ascending date order and two carrying sessions cannot
  -- wait on each other.
  if v_carry>0 then
    insert into public.principal_daily_usage(principal_id,usage_date) values(v_task.owner_principal_id,v_carry_date) on conflict(principal_id,usage_date) do nothing;
    update public.principal_daily_usage set reserved_spend_cents=greatest(0,reserved_spend_cents-v_carry) where principal_id=v_task.owner_principal_id and usage_date=v_carry_date;
  end if;
  insert into public.principal_daily_usage(principal_id,usage_date) values(v_task.owner_principal_id,v_book_date) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_task.owner_principal_id and usage_date=v_book_date for update;
  v_estimate:=coalesce(nullif(v_task.estimated_cost_cents,0),v_policy.studio_reservation_cents);
  v_reserve:=greatest(v_estimate-coalesce(v_task.reservation_cents,0),0);
  if v_usage.reserved_spend_cents+v_carry+v_reserve>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  if v_carry>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_carry where principal_id=v_task.owner_principal_id and usage_date=v_book_date;
    -- The task-level stamp keeps pointing at the row that holds the money, so
    -- the pre-spend block and the dependency-terminal release still find it.
    update public.generation_tasks set reservation_usage_date=v_book_date where id=p_task_id returning * into v_task;
  end if;
  if v_reserve>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_reserve where principal_id=v_task.owner_principal_id and usage_date=v_book_date;
    update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_reserve where id=v_run.id;
    update public.generation_tasks set reservation_cents=reservation_cents+v_reserve,reservation_usage_date=v_book_date where id=p_task_id returning * into v_task;
  end if;
  insert into public.provider_attempts(task_id,owner_principal_id,attempt,provider,model,provider_idempotency_key,status,estimated_cost_cents,prompt_release_id,usage_date)
  values(p_task_id,v_task.owner_principal_id,v_attempt,p_provider,p_model,p_provider_key,'reserved',v_estimate,v_task.prompt_release_id,v_book_date);
  update public.generation_tasks set attempt=v_attempt,status='generating',reservation_usage_date=coalesce(reservation_usage_date,v_book_date) where id=p_task_id;
  return query select v_attempt,false;
end $function$;

-- 2. Release: the attempt's own row, and the reservation no attempt ever held.

create or replace function public.reconcile_provider_attempt(p_task_id uuid, p_attempt integer, p_status text, p_actual_cost_cents integer, p_error_class text default null, p_terminal boolean default false)
returns void
language plpgsql
security definer
set search_path = '' as $function$
declare v_task public.generation_tasks; v_run public.generation_runs; v_reserved integer; v_usage_date date; v_release integer; v_release_date date;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents<0 then raise exception 'invalid actual cost'; end if;
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
