-- Look references and true model lineage. Additive; no earlier migration is
-- edited and no existing row is rewritten.
--
-- 1. The private `look-references` bucket. Per pendant construction, one PNG -
--    a text-free crop of the shop's own reference photo - delivered to the
--    still call as a texture-only input, exactly as a style anchor is
--    delivered. The bytes are private brand reference and never enter git;
--    `scripts/look-references/publish.mjs` uploads them from a local directory
--    and the job proves the object's sha256 against `LOOK_REFERENCES` before
--    any spend.
--
-- 2. `generation_tasks.model_release` was the literal 'gpt-image-2-2026-04-21'
--    written at run expansion, so a deployment that pins another
--    `OPENAI_IMAGE_MODEL` recorded a model it never called. The reservation is
--    already told which model the worker is about to call (`p_model`, which is
--    the configured snapshot), and it is the last write before the paid call,
--    so it stamps the task as well as the attempt. The expansion literal stays
--    as the pre-dispatch placeholder for a task that never reaches a provider.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('look-references','look-references',false,10485760,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.reserve_provider_attempt(p_task_id uuid, p_provider text, p_model text, p_provider_key text)
returns table(attempt_number integer, duplicate_complete boolean)
language plpgsql
security definer
set search_path = '' as $function$
declare v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts; v_reserve integer; v_estimate integer; v_book_date date;
begin
  select * into v_existing from public.provider_attempts where provider_idempotency_key=p_provider_key;
  if found then return query select v_existing.attempt,v_existing.status='succeeded'; return; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  if not found then raise exception 'task not found' using errcode='P0002'; end if;
  if v_task.status='cancelled' or v_task.cancel_requested_at is not null then raise exception 'task cancelled' using errcode='P0001'; end if;
  perform 1 from public.provider_attempts
    where task_id=p_task_id and completed_at is null and status in ('reserved','submitted');
  if found then raise exception 'provider attempt already open' using errcode='P0001'; end if;
  select * into v_policy from public.runtime_policy where id=true;
  if v_policy.id is null then raise exception 'runtime policy missing' using errcode='P0001'; end if;
  v_attempt:=v_task.attempt+1;
  if v_attempt>v_policy.provider_attempt_budget then raise exception 'provider attempt budget exhausted' using errcode='P0001'; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  v_book_date:=coalesce(v_task.reservation_usage_date,current_date);
  insert into public.principal_daily_usage(principal_id,usage_date) values(v_task.owner_principal_id,v_book_date) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_task.owner_principal_id and usage_date=v_book_date for update;
  v_estimate:=coalesce(nullif(v_task.estimated_cost_cents,0),v_policy.studio_reservation_cents);
  v_reserve:=greatest(v_estimate-v_task.reservation_cents,0);
  if v_usage.reserved_spend_cents+v_reserve>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  if v_reserve>0 then
    update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_reserve where principal_id=v_task.owner_principal_id and usage_date=v_book_date;
    update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_reserve where id=v_run.id;
    update public.generation_tasks set reservation_cents=reservation_cents+v_reserve,reservation_usage_date=coalesce(reservation_usage_date,v_book_date) where id=p_task_id returning * into v_task;
  end if;
  insert into public.provider_attempts(task_id,owner_principal_id,attempt,provider,model,provider_idempotency_key,status,estimated_cost_cents,prompt_release_id)
  values(p_task_id,v_task.owner_principal_id,v_attempt,p_provider,p_model,p_provider_key,'reserved',v_estimate,v_task.prompt_release_id);
  -- The only change from 20260908160000: the task records the model that is
  -- about to be called, so lineage is the configured snapshot rather than the
  -- literal the expansion wrote.
  update public.generation_tasks set attempt=v_attempt,status='generating',model_release=coalesce(nullif(btrim(p_model),''),model_release),reservation_usage_date=coalesce(reservation_usage_date,v_book_date) where id=p_task_id;
  return query select v_attempt,false;
end $function$;

revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;
