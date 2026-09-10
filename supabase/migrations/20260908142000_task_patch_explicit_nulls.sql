-- An explicit null in a task patch clears the column instead of being ignored.
--
-- Pipeline review 1 finding 7. `transition_generation_task` merged its patch
-- with `coalesce(p_patch->>'col', col)`, which cannot tell "the caller did not
-- mention this column" from "the caller asked for this column to be null":
-- `->>` answers NULL for both. So a task moving out of a failed state could
-- never clear `terminal_error_code`, and a video task that finished could never
-- clear `provider_status_url` or `provider_response_url` - the operator console
-- kept showing the error and the polling URLs of an attempt that was over, and
-- a stale provider URL stayed readable on a task that had moved on.
--
-- Presence is now tested with `p_patch ? 'col'`, so an absent key leaves the
-- column alone and an explicit null clears it. Existing callers pass only the
-- keys they mean, so their behaviour is unchanged.
--
-- The two retry paths (`retry_generation_task`,
-- `operator_retry_generation_task`) already set `terminal_error_code = null`
-- directly; a task that re-enters `retrying`, `generating` or `verifying`
-- through this function now clears it too, because a live task must not carry
-- the terminal code of the attempt before it.
--
-- Re-runnable: create or replace only.

create or replace function public.transition_generation_task(
  p_task_id uuid,
  p_from text[],
  p_to text,
  p_patch jsonb default '{}'::jsonb
)
returns public.generation_tasks
language plpgsql
security definer
set search_path = '' as $$
declare v_task public.generation_tasks;
begin
  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid task patch' using errcode = '22023';
  end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;

  if p_to <> 'cancelled'
    and (v_task.status = 'cancelled' or v_task.cancel_requested_at is not null) then
    raise exception 'task cancelled' using errcode = 'P0001';
  end if;

  if not (v_task.status::text = any(p_from)) then
    raise exception 'invalid task transition: % -> %', v_task.status::text, p_to
      using errcode = 'P0001';
  end if;

  update public.generation_tasks set
    status = p_to::public.task_status,
    -- A task that is running again carries no terminal code, whatever the
    -- patch says; otherwise the patch decides, and an absent key keeps it.
    terminal_error_code = case
      when p_to in ('queued', 'retrying', 'generating', 'verifying') then null
      when coalesce(p_patch, '{}'::jsonb) ? 'terminal_error_code'
        then left(p_patch->>'terminal_error_code', 120)
      else terminal_error_code
    end,
    provider_status_url = case
      when coalesce(p_patch, '{}'::jsonb) ? 'provider_status_url'
        then p_patch->>'provider_status_url'
      else provider_status_url
    end,
    provider_response_url = case
      when coalesce(p_patch, '{}'::jsonb) ? 'provider_response_url'
        then p_patch->>'provider_response_url'
      else provider_response_url
    end,
    identity_artifact_id = case
      when coalesce(p_patch, '{}'::jsonb) ? 'identity_artifact_id'
        then (p_patch->>'identity_artifact_id')::uuid
      else identity_artifact_id
    end,
    attempt = coalesce((p_patch->>'attempt')::integer, attempt),
    input_asset_ids = coalesce(
      case when jsonb_typeof(p_patch->'input_asset_ids') = 'array' then (
        select coalesce(array_agg(element::uuid), '{}'::uuid[])
        from jsonb_array_elements_text(p_patch->'input_asset_ids') as patched(element)
      ) else null end,
      input_asset_ids
    ),
    updated_at = now()
  where id = p_task_id
  returning * into v_task;

  perform public.refresh_run_status(v_task.run_id);
  return v_task;
end $$;

revoke all on function public.transition_generation_task(uuid,text[],text,jsonb)
  from public, anon, authenticated;
grant execute on function public.transition_generation_task(uuid,text[],text,jsonb)
  to service_role;
