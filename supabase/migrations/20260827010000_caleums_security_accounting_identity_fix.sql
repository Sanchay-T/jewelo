-- Coordinator security review follow-up. This migration is intentionally
-- replay-safe after the one-view base and corrects the already-applied
-- development schema without weakening the base invariants.

create or replace function public.canonical_identity_anchor(p_specification jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_language text;
  v_approved_text text;
  v_layout text;
  v_connector text;
  v_fingerprint text;
begin
  v_language := case when coalesce(p_specification->>'arabicStyle', 'none') <> 'none' then 'ar' else 'en' end;
  select string_agg(
    case when v_language = 'ar' then nullif(item->>'approvedArabicText', '') else nullif(item->>'approvedEnglishText', '') end,
    ' & ' order by ordinal
  ) into v_approved_text
  from jsonb_array_elements(p_specification->'names') with ordinality as names(item, ordinal);
  if v_approved_text is null or length(v_approved_text) = 0 then
    raise exception 'approved text missing for selected script' using errcode = '22023';
  end if;
  v_layout := coalesce(p_specification->>'layout', 'single-name');
  v_connector := coalesce(p_specification->>'connector', 'none');
  v_fingerprint := encode(extensions.digest(
    convert_to(concat_ws('|', v_language, v_approved_text, v_layout, v_connector), 'UTF8'), 'sha256'
  ), 'hex');
  return jsonb_build_object(
    'approvedText', v_approved_text,
    'language', v_language,
    'typography', case when v_language = 'ar' then 'Noto Naskh Arabic' else 'Playfair Display Italic' end,
    'fingerprint', v_fingerprint,
    'geometryPath', concat_ws(':', 'canonical', v_layout, v_connector, v_fingerprint)
  );
end $$;

create or replace function public.enforce_canonical_revision_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.identity_anchor := public.canonical_identity_anchor(new.specification);
  update public.designs set name = new.identity_anchor->>'approvedText'
    where id = new.design_id and owner_principal_id = new.owner_principal_id;
  return new;
end $$;
drop trigger if exists revisions_canonical_identity on public.design_revisions;
create trigger revisions_canonical_identity before insert on public.design_revisions
for each row execute function public.enforce_canonical_revision_identity();

create or replace function public.reconcile_provider_attempt(
  p_task_id uuid,
  p_attempt integer,
  p_status text,
  p_actual_cost_cents integer,
  p_error_class text default null,
  p_terminal boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_task public.generation_tasks; v_run public.generation_runs;
begin
  if p_status not in ('succeeded','failed','ambiguous') then raise exception 'invalid attempt status'; end if;
  if p_actual_cost_cents < 0 then raise exception 'invalid actual cost'; end if;
  update public.provider_attempts set status = p_status, actual_cost_cents = p_actual_cost_cents,
    error_class = left(p_error_class, 120), completed_at = now()
    where task_id = p_task_id and attempt = p_attempt and completed_at is null;
  if not found then return; end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;
  update public.principal_daily_usage set actual_spend_cents = actual_spend_cents + p_actual_cost_cents
    where principal_id = v_task.owner_principal_id and usage_date = current_date;
  update public.generation_runs set actual_spend_cents = actual_spend_cents + p_actual_cost_cents where id = v_run.id;
  if p_status = 'succeeded' or p_terminal then
    update public.principal_daily_usage set reserved_spend_cents = greatest(0, reserved_spend_cents - v_run.reserved_spend_cents)
      where principal_id = v_task.owner_principal_id and usage_date = current_date;
    update public.generation_runs set reserved_spend_cents = 0 where id = v_run.id;
  end if;
end $$;

grant usage on schema public to authenticated, service_role;
grant select on public.profiles, public.designs, public.design_drafts,
  public.design_revisions, public.generation_runs, public.generation_tasks,
  public.provider_attempts, public.assets, public.quotes, public.orders,
  public.audit_events, public.principal_daily_usage, public.share_grants
  to authenticated;
grant insert, update, delete on public.design_drafts, public.share_grants to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.canonical_identity_anchor(jsonb) from public, anon, authenticated;
revoke all on function public.enforce_canonical_revision_identity() from public, anon, authenticated;
revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;
