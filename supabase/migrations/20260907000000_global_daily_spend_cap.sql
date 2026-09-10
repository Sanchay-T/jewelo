-- Global daily provider spend cap.
--
-- Why: the existing cap is per principal, not global. enforce_daily_provider_spend_cap
-- compares a single principal_daily_usage row against
-- runtime_policy.max_reserved_spend_cents, and start_studio_run /
-- approve_and_start_studio / expand_final_media_run / reserve_provider_attempt /
-- request_video_task each check only the owning principal's reservation. A shop
-- demo mints a fresh anonymous principal for every browser session, so the
-- nightly budget was unbounded in aggregate: N sessions x the per-shopper cap.
--
-- What: a second, global ceiling enforced at the same choke point. Every
-- reservation path in this schema writes public.principal_daily_usage, so the
-- BEFORE trigger on that table observes all of them, present and future.
--
-- The per-principal cap is unchanged. The error text keeps the words
-- "spend guard" and "generation limit" so
-- apps/web/src/lib/backend/supabase-rest.ts still maps them to HTTP 429
-- spend_guard.
--
-- Only increases are guarded. Reconciliation, cancellation and stale recovery
-- reduce or move already-committed money and must never be refused by a ceiling;
-- refusing them would lose the truth about spend that already happened.
--
-- usage_date defaults to CURRENT_DATE, evaluated in the database's UTC
-- timezone, so the global day rolls over at 05:30 IST.
--
-- Re-runnable: add column if not exists, create or replace, drop/create trigger.

alter table public.runtime_policy
  add column if not exists global_max_reserved_spend_cents integer not null default 6000
    check (global_max_reserved_spend_cents >= 0),
  add column if not exists global_daily_generation_limit integer not null default 100
    check (global_daily_generation_limit > 0);

create or replace function public.enforce_daily_provider_spend_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_policy public.runtime_policy;
  v_new_total integer;
  v_old_total integer;
  v_others_spend bigint;
  v_others_runs bigint;
begin
  select * into v_policy from public.runtime_policy where id = true;

  -- Per-principal ceiling, unchanged.
  if new.actual_spend_cents + new.reserved_spend_cents > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;

  v_new_total := new.actual_spend_cents + new.reserved_spend_cents;
  v_old_total := case when tg_op = 'UPDATE' then old.actual_spend_cents + old.reserved_spend_cents else 0 end;

  if v_new_total <= v_old_total
     and (tg_op = 'INSERT' or new.runs_started <= old.runs_started) then
    return new;
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

drop trigger if exists principal_daily_usage_spend_cap
on public.principal_daily_usage;
create trigger principal_daily_usage_spend_cap
before insert or update of actual_spend_cents, reserved_spend_cents, runs_started
on public.principal_daily_usage
for each row execute function public.enforce_daily_provider_spend_cap();

revoke all on function public.enforce_daily_provider_spend_cap()
from public, anon, authenticated;

-- Caps for the 8 September shop visit: USD 60 across the whole night,
-- USD 12 per shopper session (unchanged from the seeded value).
-- Lower global_max_reserved_spend_cents to 4000 after launch.
-- supabase_region records where the project actually lives.
update public.runtime_policy
set global_max_reserved_spend_cents = 6000,
    max_reserved_spend_cents = 1200,
    supabase_region = 'ap-south-1',
    updated_at = now()
where id = true;
