-- Immutable, operator-managed prompt releases with exact task snapshot lineage.
-- This is expand/backfill only: legacy prompt_release remains as a display key.

create table public.prompt_releases (
  id uuid primary key default gen_random_uuid(),
  profile text not null check (profile in ('image.studio', 'video.preview', 'video.final')),
  version integer not null check (version > 0),
  template text not null check (length(template) between 1 and 12000),
  parsed_variables text[] not null,
  change_note text not null check (length(change_note) between 1 and 500),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (profile, version)
);

create table public.prompt_profile_publications (
  profile text primary key check (profile in ('image.studio', 'video.preview', 'video.final')),
  release_id uuid not null references public.prompt_releases(id) on delete restrict,
  published_by text not null,
  published_at timestamptz not null default now()
);

create table public.prompt_publication_events (
  id bigint generated always as identity primary key,
  profile text not null check (profile in ('image.studio', 'video.preview', 'video.final')),
  previous_release_id uuid references public.prompt_releases(id) on delete restrict,
  release_id uuid not null references public.prompt_releases(id) on delete restrict,
  published_by text not null,
  published_at timestamptz not null default now()
);
create index prompt_publication_events_profile_ordered
  on public.prompt_publication_events(profile, id desc);

create or replace function public.prevent_prompt_history_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'prompt history is immutable' using errcode = '55000';
end $$;
create trigger prompt_releases_immutable before update or delete on public.prompt_releases
for each row execute function public.prevent_prompt_history_mutation();
create trigger prompt_publication_events_immutable before update or delete on public.prompt_publication_events
for each row execute function public.prevent_prompt_history_mutation();

alter table public.prompt_releases enable row level security;
alter table public.prompt_profile_publications enable row level security;
alter table public.prompt_publication_events enable row level security;

insert into public.prompt_releases(id, profile, version, template, parsed_variables, change_note, created_by)
values
  ('00000000-0000-0000-0000-000000000401', 'image.studio', 1,
   'Create one refined {{presentation_view}} product photograph of the supplied immutable name-pendant identity for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}). Preserve the exact spelling, glyph order, {{layout}} geometry and attachments. Use {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, and approved dimensions {{dimensions}}. Show the pendant on its {{chain_style}} chain at {{chain_length}}. Do not invent, remove, or reshape identity details.',
   array['presentation_view','approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length'],
   'Safe initial studio rendering profile', 'system:migration'),
  ('00000000-0000-0000-0000-000000000402', 'video.preview', 1,
   'Create a restrained silent {{presentation_view}} motion preview from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}). Keep {{layout}} geometry, spelling and attachments unchanged throughout every frame. Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}. Use only subtle product-camera movement and controlled specular light; no morphing or new objects.',
   array['presentation_view','approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length'],
   'Safe initial preview motion profile', 'system:migration'),
  ('00000000-0000-0000-0000-000000000403', 'video.final', 1,
   'Create a polished silent {{presentation_view}} final product film from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}). Keep exact spelling, {{layout}} geometry and attachments stable for the full shot. Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}. Use elegant, restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details.',
   array['presentation_view','approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length'],
   'Safe initial final motion profile', 'system:migration');

insert into public.prompt_profile_publications(profile, release_id, published_by)
values
  ('image.studio', '00000000-0000-0000-0000-000000000401', 'system:migration'),
  ('video.preview', '00000000-0000-0000-0000-000000000402', 'system:migration'),
  ('video.final', '00000000-0000-0000-0000-000000000403', 'system:migration');
insert into public.prompt_publication_events(profile, previous_release_id, release_id, published_by)
select profile, null, release_id, published_by from public.prompt_profile_publications;

alter table public.generation_tasks add column prompt_release_id uuid;
alter table public.assets add column prompt_release_id uuid;
alter table public.provider_attempts add column prompt_release_id uuid;

update public.generation_tasks
set prompt_release_id = '00000000-0000-0000-0000-000000000401',
    prompt_release = 'image.studio@v1'
where prompt_release = 'studio-placeholder-v1';

drop trigger assets_immutable on public.assets;
update public.assets a
set prompt_release_id = t.prompt_release_id,
    prompt_release = t.prompt_release
from public.generation_tasks t
where t.id = a.task_id and a.prompt_release_id is null;
create trigger assets_immutable before update on public.assets
for each row execute function public.prevent_revision_mutation();

update public.provider_attempts p
set prompt_release_id = t.prompt_release_id
from public.generation_tasks t
where t.id = p.task_id and p.prompt_release_id is null;

do $$
begin
  if exists (select 1 from public.generation_tasks where prompt_release_id is null)
    or exists (select 1 from public.assets where prompt_release_id is null)
    or exists (select 1 from public.provider_attempts where prompt_release_id is null) then
    raise exception 'unmapped legacy prompt lineage remains';
  end if;
end $$;

alter table public.generation_tasks alter column prompt_release_id set not null;
alter table public.assets alter column prompt_release_id set not null;
alter table public.provider_attempts alter column prompt_release_id set not null;
alter table public.generation_tasks add constraint generation_tasks_prompt_release_fk
  foreign key (prompt_release_id) references public.prompt_releases(id) on delete restrict;
alter table public.assets add constraint assets_prompt_release_fk
  foreign key (prompt_release_id) references public.prompt_releases(id) on delete restrict;
alter table public.provider_attempts add constraint provider_attempts_prompt_release_fk
  foreign key (prompt_release_id) references public.prompt_releases(id) on delete restrict;

create table public.generation_prompt_snapshots (
  task_id uuid primary key references public.generation_tasks(id) on delete restrict,
  prompt_release_id uuid not null references public.prompt_releases(id) on delete restrict,
  variable_snapshot jsonb not null check (jsonb_typeof(variable_snapshot) = 'object'),
  compiled_prompt text not null check (length(compiled_prompt) between 1 and 16000),
  compiler_version text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create trigger generation_prompt_snapshots_immutable before update or delete on public.generation_prompt_snapshots
for each row execute function public.prevent_prompt_history_mutation();
alter table public.generation_prompt_snapshots enable row level security;

-- Materialize the safe baseline for every known legacy task during the same
-- transaction so a retry cannot drift on its first post-migration dispatch.
do $$
declare
  v_row record;
  v_variables jsonb;
  v_compiled text;
  v_name text;
  v_value text;
begin
  for v_row in
    select t.id as task_id, t.prompt_release_id, t.presentation_view,
      r.template, dr.specification, dr.identity_anchor
    from public.generation_tasks t
    join public.generation_runs gr on gr.id = t.run_id
    join public.design_revisions dr on dr.id = gr.revision_id
    join public.prompt_releases r on r.id = t.prompt_release_id
  loop
    v_variables := jsonb_build_object(
      'approved_name', v_row.identity_anchor->>'approvedText',
      'language', v_row.identity_anchor->>'language',
      'arabic_style', v_row.specification->>'arabicStyle',
      'layout', v_row.specification->>'layout',
      'metal_karat', v_row.specification->>'metalKarat',
      'metal_color', v_row.specification->>'metalColor',
      'finish', v_row.specification->>'finish',
      'stone_coverage', v_row.specification->>'stoneCoverage',
      'gemstone', v_row.specification->>'gemstone',
      'size_profile', v_row.specification->>'sizeProfile',
      'dimensions', concat(v_row.specification->'dimensions'->>'widthMm', ' × ', v_row.specification->'dimensions'->>'heightMm', ' × ', v_row.specification->'dimensions'->>'thicknessMm', ' mm'),
      'chain_style', v_row.specification->'chain'->>'style',
      'chain_length', concat(v_row.specification->'chain'->>'lengthCm', ' cm'),
      'presentation_view', v_row.presentation_view
    );
    if exists (select 1 from jsonb_each_text(v_variables) where length(trim(value)) = 0) then
      raise exception 'legacy task % has incomplete prompt variables', v_row.task_id;
    end if;
    v_compiled := v_row.template;
    for v_name, v_value in select key, value from jsonb_each_text(v_variables)
    loop
      v_compiled := replace(v_compiled, '{{' || v_name || '}}', v_value);
    end loop;
    if position('{{' in v_compiled) > 0 or position('}}' in v_compiled) > 0 then
      raise exception 'legacy task % has unresolved prompt variables', v_row.task_id;
    end if;
    insert into public.generation_prompt_snapshots(task_id, prompt_release_id, variable_snapshot, compiled_prompt, compiler_version, sha256)
      values (v_row.task_id, v_row.prompt_release_id, v_variables, v_compiled, 'caleums-prompt-compiler-v1', encode(extensions.digest(convert_to(v_compiled, 'UTF8'), 'sha256'), 'hex'));
  end loop;
end $$;

create or replace function public.create_prompt_release(
  p_profile text,
  p_template text,
  p_parsed_variables text[],
  p_change_note text,
  p_created_by text
) returns public.prompt_releases
language plpgsql security definer set search_path = '' as $$
declare v_release public.prompt_releases; v_version integer;
begin
  if p_profile not in ('image.studio','video.preview','video.final') then raise exception 'invalid prompt profile'; end if;
  if length(trim(p_template)) = 0 or length(p_template) > 12000 then raise exception 'invalid prompt template length'; end if;
  if length(trim(p_change_note)) = 0 or length(p_change_note) > 500 then raise exception 'invalid change note'; end if;
  if length(trim(p_created_by)) = 0 then raise exception 'invalid prompt actor'; end if;
  if p_parsed_variables is null or p_parsed_variables @> array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'] is false
    or p_parsed_variables <@ array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'] is false then
    raise exception 'invalid prompt variables';
  end if;
  if cardinality(p_parsed_variables) <> cardinality(array(select distinct unnest(p_parsed_variables))) then
    raise exception 'duplicate prompt variables';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-release:' || p_profile, 0));
  select coalesce(max(version), 0) + 1 into v_version from public.prompt_releases where profile = p_profile;
  insert into public.prompt_releases(profile, version, template, parsed_variables, change_note, created_by)
    values (p_profile, v_version, p_template, p_parsed_variables, p_change_note, p_created_by)
    returning * into v_release;
  insert into public.audit_events(actor_type, action, detail)
    values ('operator', 'prompt.release_created', jsonb_build_object('profile', p_profile, 'releaseId', v_release.id, 'version', v_version));
  return v_release;
end $$;

create or replace function public.reserve_provider_attempt(
  p_task_id uuid, p_provider text, p_model text, p_provider_key text
) returns table(attempt_number integer, duplicate_complete boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_task public.generation_tasks; v_run public.generation_runs; v_policy public.runtime_policy;
  v_usage public.principal_daily_usage; v_attempt integer; v_existing public.provider_attempts;
begin
  select * into v_existing from public.provider_attempts where provider_idempotency_key = p_provider_key;
  if found then return query select v_existing.attempt, v_existing.status = 'succeeded'; return; end if;
  select * into v_task from public.generation_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  if v_task.status = 'cancelled' or v_task.cancel_requested_at is not null then raise exception 'task cancelled' using errcode = 'P0001'; end if;
  v_attempt := v_task.attempt + 1;
  if v_attempt > 3 then raise exception 'provider attempt budget exhausted' using errcode = 'P0001'; end if;
  select * into v_run from public.generation_runs where id = v_task.run_id for update;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_task.owner_principal_id) on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id = v_task.owner_principal_id and usage_date = current_date for update;
  if v_attempt > 1 then
    if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then
      update public.generation_tasks set status = 'blocked', terminal_error_code = 'spend_guard_exceeded' where id = p_task_id;
      update public.generation_runs set status = 'operator_review', operator_review_reason = 'spend_guard_exceeded' where id = v_run.id;
      raise exception 'daily spend guard exceeded' using errcode = 'P0001';
    end if;
    update public.principal_daily_usage set reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where principal_id = v_task.owner_principal_id and usage_date = current_date;
    update public.generation_runs set reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where id = v_run.id;
  end if;
  insert into public.provider_attempts(task_id, owner_principal_id, attempt, provider, model, provider_idempotency_key, status, estimated_cost_cents, prompt_release_id)
    values (p_task_id, v_task.owner_principal_id, v_attempt, p_provider, p_model, p_provider_key, 'reserved', v_policy.studio_reservation_cents, v_task.prompt_release_id);
  update public.generation_tasks set attempt = v_attempt, status = 'generating' where id = p_task_id;
  return query select v_attempt, false;
end $$;

create or replace function public.publish_prompt_release(
  p_release_id uuid,
  p_expected_current_release_id uuid,
  p_published_by text
) returns table(profile text, release_id uuid, version integer, previous_release_id uuid, published_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_release public.prompt_releases;
  v_current public.prompt_profile_publications;
  v_published_at timestamptz := now();
begin
  select * into v_release from public.prompt_releases where id = p_release_id;
  if not found then raise exception 'prompt release not found' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-publication:' || v_release.profile, 0));
  select * into v_current from public.prompt_profile_publications where prompt_profile_publications.profile = v_release.profile for update;
  if p_expected_current_release_id is distinct from v_current.release_id then
    raise exception 'prompt publication changed; refresh required' using errcode = '40001';
  end if;
  insert into public.prompt_profile_publications(profile, release_id, published_by, published_at)
    values (v_release.profile, v_release.id, p_published_by, v_published_at)
    on conflict on constraint prompt_profile_publications_pkey do update
      set release_id = excluded.release_id,
          published_by = excluded.published_by,
          published_at = excluded.published_at;
  insert into public.prompt_publication_events(profile, previous_release_id, release_id, published_by, published_at)
    values (v_release.profile, v_current.release_id, v_release.id, p_published_by, v_published_at);
  insert into public.audit_events(actor_type, action, detail)
    values ('operator', 'prompt.release_published', jsonb_build_object('profile', v_release.profile, 'previousReleaseId', v_current.release_id, 'releaseId', v_release.id, 'version', v_release.version));
  return query select v_release.profile, v_release.id, v_release.version, v_current.release_id, v_published_at;
end $$;

create or replace function public.materialize_prompt_snapshot(
  p_task_id uuid,
  p_prompt_release_id uuid,
  p_variable_snapshot jsonb,
  p_compiled_prompt text,
  p_compiler_version text,
  p_sha256 text
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
  insert into public.generation_prompt_snapshots(task_id, prompt_release_id, variable_snapshot, compiled_prompt, compiler_version, sha256)
    values (p_task_id, p_prompt_release_id, p_variable_snapshot, p_compiled_prompt, p_compiler_version, p_sha256)
    on conflict (task_id) do nothing;
  select * into v_snapshot from public.generation_prompt_snapshots where task_id = p_task_id;
  return v_snapshot;
end $$;

-- Both authoritative run creators resolve and lock the live publication before
-- creating any run/task/outbox/spend state, and pin the exact release UUID.
create or replace function public.approve_and_start_studio(
  p_draft_id uuid, p_specification jsonb, p_approval_key text, p_run_key text
) returns table(approved_design_id uuid, revision_id uuid, run_id uuid, task_id uuid, outbox_id uuid, canonical_identity_anchor jsonb)
language plpgsql security definer set search_path = '' as $$
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
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile)
    values (v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:release:' || v_prompt.id, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'still.fal') returning id into v_task_id;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id, 'promptReleaseId', v_prompt.id), 'outbox:' || v_run_id || ':studio:release:' || v_prompt.id) returning id into v_outbox_id;
  update public.principal_daily_usage set runs_started = runs_started + 1, reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where principal_id = v_owner and usage_date = current_date;
  update public.designs set active_revision_id = v_revision_id, status = 'generating' where id = v_design_id and owner_principal_id = v_owner and customer_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail) values (v_design_id, v_owner, 'customer', 'revision.approved_run.started', jsonb_build_object('revisionId', v_revision_id, 'runId', v_run_id, 'promptReleaseId', v_prompt.id));
  return query select v_design_id, v_revision_id, v_run_id, v_task_id, v_outbox_id, v_identity_anchor;
end $$;

create or replace function public.start_studio_run(p_design_id uuid, p_run_key text)
returns table(run_id uuid, task_id uuid, outbox_id uuid)
language plpgsql security definer set search_path = '' as $$
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
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, prompt_release_id, provider_profile)
    values (v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:release:' || v_prompt.id, v_prompt.profile || '@v' || v_prompt.version, v_prompt.id, 'still.fal') returning id into v_task_id;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id, 'promptReleaseId', v_prompt.id), 'outbox:' || v_run_id || ':studio:release:' || v_prompt.id) returning id into v_outbox_id;
  update public.principal_daily_usage set runs_started = runs_started + 1, reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where principal_id = v_owner and usage_date = current_date;
  update public.designs set status = 'generating' where id = p_design_id and owner_principal_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail) values (p_design_id, v_owner, 'customer', 'generation_run.started', jsonb_build_object('runId', v_run_id, 'promptReleaseId', v_prompt.id));
  return query select v_run_id, v_task_id, v_outbox_id;
end $$;

revoke all on table public.prompt_releases, public.prompt_profile_publications,
  public.prompt_publication_events, public.generation_prompt_snapshots from public, anon, authenticated;
grant select on public.prompt_releases, public.prompt_profile_publications,
  public.prompt_publication_events, public.generation_prompt_snapshots to service_role;
revoke all on function public.prevent_prompt_history_mutation() from public, anon, authenticated;
revoke all on function public.create_prompt_release(text,text,text[],text,text) from public, anon, authenticated;
revoke all on function public.publish_prompt_release(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.materialize_prompt_snapshot(uuid,uuid,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.create_prompt_release(text,text,text[],text,text) to service_role;
grant execute on function public.publish_prompt_release(uuid,uuid,text) to service_role;
grant execute on function public.materialize_prompt_snapshot(uuid,uuid,jsonb,text,text,text) to service_role;

revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public, anon;
grant execute on function public.approve_and_start_studio(uuid,jsonb,text,text) to authenticated, service_role;
revoke all on function public.start_studio_run(uuid,text) from public, anon;
grant execute on function public.start_studio_run(uuid,text) to authenticated, service_role;
