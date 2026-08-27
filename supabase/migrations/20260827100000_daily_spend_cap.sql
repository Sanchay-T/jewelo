-- Enforce the configured daily provider cap across both reserved and reconciled
-- spend, regardless of which workflow creates or retries a task.

create or replace function public.enforce_daily_provider_spend_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_cap integer;
begin
  select max_reserved_spend_cents into v_cap
  from public.runtime_policy where id = true;
  if new.actual_spend_cents + new.reserved_spend_cents > v_cap then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists principal_daily_usage_spend_cap
on public.principal_daily_usage;
create trigger principal_daily_usage_spend_cap
before insert or update of actual_spend_cents, reserved_spend_cents
on public.principal_daily_usage
for each row execute function public.enforce_daily_provider_spend_cap();

revoke all on function public.enforce_daily_provider_spend_cap()
from public, anon, authenticated;
