-- SP-2e1: the still route (free or stencil) is recorded once, in the immutable
-- prompt snapshot, when the studio still is compiled. Dependent views copy their
-- parent's route. The job reads the route back from the snapshot and never
-- recomputes it, so the compiled prompt and the images sent with it cannot
-- disagree about whether a stencil is in the request.
--
-- Additive and backwards compatible with the code already running:
--   * The column has a constant default, so every existing snapshot reads
--     `stencil`, which is what every existing snapshot was compiled for. Adding
--     it rewrites no row and fires no update trigger, so the immutability
--     trigger on this table is not involved.
--   * `materialize_prompt_snapshot` gains a trailing `p_still_route` with the
--     default `stencil`. A function's argument list cannot be changed with
--     `create or replace`, so the six-argument version is dropped and the
--     seven-argument one created in the same transaction. The running job and
--     `apps/jobs/src/video.ts` call it through PostgREST with the six named
--     arguments, which resolve to this function with the default. Keeping both
--     would make that six-argument call ambiguous.
--   * The body is the one from 20260827060000_caleums_prompt_registry.sql with
--     the route check and the extra column in the insert. Security definer,
--     search_path and grants are the same.

alter table public.generation_prompt_snapshots
  add column if not exists still_route text not null default 'stencil'
    constraint generation_prompt_snapshots_still_route_check
    check (still_route in ('free', 'stencil'));

drop function if exists public.materialize_prompt_snapshot(uuid, uuid, jsonb, text, text, text);

create function public.materialize_prompt_snapshot(
  p_task_id uuid,
  p_prompt_release_id uuid,
  p_variable_snapshot jsonb,
  p_compiled_prompt text,
  p_compiler_version text,
  p_sha256 text,
  p_still_route text default 'stencil'
) returns public.generation_prompt_snapshots
language plpgsql security definer set search_path = '' as $$
declare v_snapshot public.generation_prompt_snapshots; v_pinned uuid;
begin
  select prompt_release_id into v_pinned from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_pinned <> p_prompt_release_id then raise exception 'prompt release does not match task pin'; end if;
  if jsonb_typeof(p_variable_snapshot) <> 'object' then raise exception 'invalid prompt variable snapshot'; end if;
  if length(p_compiled_prompt) = 0 or length(p_compiled_prompt) > 16000 then raise exception 'invalid compiled prompt length'; end if;
  if p_sha256 <> encode(extensions.digest(convert_to(p_compiled_prompt, 'UTF8'), 'sha256'), 'hex') then
    raise exception 'compiled prompt checksum mismatch';
  end if;
  if p_still_route is null or p_still_route not in ('free', 'stencil') then
    raise exception 'invalid still route' using errcode = '22023';
  end if;
  insert into public.generation_prompt_snapshots(task_id, prompt_release_id, variable_snapshot, compiled_prompt, compiler_version, sha256, still_route)
    values (p_task_id, p_prompt_release_id, p_variable_snapshot, p_compiled_prompt, p_compiler_version, p_sha256, p_still_route)
    on conflict (task_id) do nothing;
  select * into v_snapshot from public.generation_prompt_snapshots where task_id = p_task_id;
  return v_snapshot;
end $$;

revoke all on function public.materialize_prompt_snapshot(uuid,uuid,jsonb,text,text,text,text) from public, anon, authenticated;
grant execute on function public.materialize_prompt_snapshot(uuid,uuid,jsonb,text,text,text,text) to service_role;
