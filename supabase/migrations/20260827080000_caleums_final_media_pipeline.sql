-- Final media pipeline: independent OpenAI still siblings, deterministic
-- identity artifacts, immutable prompt/style/model pins, and optional fal video.

create table public.pipeline_releases (
  id text primary key,
  status text not null check (status in ('legacy','active','rolled_back')),
  identity_engine_release text not null,
  still_model text not null,
  verifier_model text not null,
  video_preview_model text not null,
  video_final_model text not null,
  shot_mapping jsonb not null check (jsonb_typeof(shot_mapping) = 'object'),
  created_at timestamptz not null default now()
);
insert into public.pipeline_releases values
  ('caleums-one-view-v1','legacy','caleums-latin-existing-v1','legacy','legacy','legacy','legacy','{}',now()),
  ('caleums-final-media-v1','active','caleums-arabic-v3','gpt-image-2-2026-04-21','server:OPENAI_VERIFIER_MODEL','bytedance/seedance-2.0/fast/image-to-video','bytedance/seedance-2.0/image-to-video',
   '{"studio":{"profile":"image.packshot","ratio":"1:1"},"on_skin":{"profile":"image.worn","ratio":"4:5"},"close_up":{"profile":"image.macro_gift","ratio":"1:1"},"dark":{"profile":"image.dark_editorial","ratio":"9:16"},"studio_hero":{"profile":"image.studio_hero","ratio":"9:16"},"billboard":{"profile":"image.billboard","ratio":"16:9"},"motion_preview":{"profile":"video.preview","ratio":"9:16"},"motion_final":{"profile":"video.final","ratio":"9:16"}}',now());

create table public.identity_artifacts (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.design_revisions(id) on delete restrict,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  engine_release text not null,
  font_release text not null,
  approved_text text not null,
  script text not null check (script in ('en','ar')),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  bucket_id text not null check (bucket_id = 'identity-anchors'),
  object_path text not null,
  png_sha256 text not null check (png_sha256 ~ '^[a-f0-9]{64}$'),
  validation_report jsonb not null check (validation_report->>'passed' = 'true'),
  created_at timestamptz not null default now(),
  unique (revision_id, fingerprint),
  unique (bucket_id, object_path),
  foreign key (revision_id, owner_principal_id)
    references public.design_revisions(id, owner_principal_id)
);
create trigger identity_artifacts_immutable before update or delete on public.identity_artifacts
for each row execute function public.prevent_prompt_history_mutation();

create table public.style_anchor_releases (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  version integer not null check (version > 0),
  source_task_id text not null,
  status text not null check (status in ('missing','published','retired')),
  bucket_id text,
  object_path text,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  approval_note text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (profile, version),
  check ((status = 'published') = (bucket_id is not null and object_path is not null and checksum_sha256 is not null))
);
create table public.style_anchor_publications (
  profile text primary key,
  release_id uuid not null references public.style_anchor_releases(id) on delete restrict,
  published_by text not null,
  published_at timestamptz not null default now()
);
create table public.style_anchor_publication_events (
  id bigint generated always as identity primary key,
  profile text not null,
  previous_release_id uuid references public.style_anchor_releases(id) on delete restrict,
  release_id uuid not null references public.style_anchor_releases(id) on delete restrict,
  published_by text not null,
  published_at timestamptz not null default now()
);
create trigger style_anchor_releases_immutable before update or delete on public.style_anchor_releases
for each row execute function public.prevent_prompt_history_mutation();
create trigger style_anchor_publication_events_immutable before update or delete on public.style_anchor_publication_events
for each row execute function public.prevent_prompt_history_mutation();

insert into public.style_anchor_releases(id,profile,version,source_task_id,status,approval_note,created_by) values
  ('00000000-0000-0000-0000-000000000601','image.worn',1,'ee78f9a4-6ace-428c-9f12-4e6101188190','missing','Exact approved artifact was not present in authorized local sources','system:migration'),
  ('00000000-0000-0000-0000-000000000602','image.packshot',1,'ddd3862a-05cb-4b95-9b6b-aa8d6453293b','missing','Exact approved artifact was not present in authorized local sources','system:migration'),
  ('00000000-0000-0000-0000-000000000603','image.macro_gift',1,'44f3b981-18bd-4dbf-892e-dcf3f4c9c817','missing','Exact approved artifact was not present in authorized local sources','system:migration'),
  ('00000000-0000-0000-0000-000000000604','image.dark_editorial',1,'ba0b8433-f0f2-4458-82c9-5d3ce88081d6','missing','Exact approved artifact was not present in authorized local sources','system:migration'),
  ('00000000-0000-0000-0000-000000000605','image.studio_hero',1,'d0c0bac4-d2e4-481c-8fff-c658acd807ac','missing','Exact approved artifact was not present in authorized local sources','system:migration'),
  ('00000000-0000-0000-0000-000000000606','image.billboard',1,'f7de6e1b-4278-4866-97ac-865abeb89560','missing','Exact approved artifact was not present in authorized local sources','system:migration');
insert into public.style_anchor_publications(profile,release_id,published_by)
select profile,id,'system:migration' from public.style_anchor_releases;
insert into public.style_anchor_publication_events(profile,previous_release_id,release_id,published_by)
select profile,null,release_id,published_by from public.style_anchor_publications;

alter table public.prompt_releases drop constraint if exists prompt_releases_profile_check;
alter table public.prompt_releases add constraint prompt_releases_profile_check check (profile in
  ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final','verification.image'));
alter table public.prompt_profile_publications drop constraint if exists prompt_profile_publications_profile_check;
alter table public.prompt_profile_publications add constraint prompt_profile_publications_profile_check check (profile in
  ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final','verification.image'));
alter table public.prompt_publication_events drop constraint if exists prompt_publication_events_profile_check;
alter table public.prompt_publication_events add constraint prompt_publication_events_profile_check check (profile in
  ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final','verification.image'));

insert into public.prompt_releases(id,profile,version,template,parsed_variables,change_note,created_by) values
  ('00000000-0000-0000-0000-000000000501','image.packshot',1,'Catalogue photograph of the full necklace against neutral ivory cream. The first supplied image is the ONE AND ONLY geometry law for {{approved_name}} ({{language}}; {{arabic_style}}), preserving exact {{layout}} geometry and fused marks. The second supplied image is style only. Render {{metal_karat}} {{metal_color}} metal with {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain at {{chain_length}}. The pendant is the sharpest hero; exactly two connected jump rings, no added letters, names, charms, duplicates, text or logos. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final independent packshot release','system:migration'),
  ('00000000-0000-0000-0000-000000000502','image.worn',1,'Jewellery-focused worn photograph for {{approved_name}} ({{language}}; {{arabic_style}}), at {{chain_length}} with a modest neckline. The first supplied image is immutable {{layout}} geometry law; the second is style only. Render {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain. Preserve exact spelling and exactly two connected jump rings; no additions or duplicates. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final independent worn release','system:migration'),
  ('00000000-0000-0000-0000-000000000503','image.macro_gift',1,'Macro gift photograph on black suede for {{approved_name}} ({{language}}; {{arabic_style}}). The first supplied image is immutable {{layout}} geometry law; the second is style only. Render {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain at {{chain_length}}. Preserve exact spelling and exactly two connected jump rings; no additions or duplicates. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final independent macro gift release','system:migration'),
  ('00000000-0000-0000-0000-000000000504','image.dark_editorial',1,'Dark editorial jewellery photograph for {{approved_name}} ({{language}}; {{arabic_style}}). The first supplied image is immutable {{layout}} geometry law; the second is style only. Render {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain at {{chain_length}}. Preserve exact spelling and exactly two connected jump rings; no additions or duplicates. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final independent dark editorial release','system:migration'),
  ('00000000-0000-0000-0000-000000000505','image.studio_hero',1,'Studio hero photograph for {{approved_name}} ({{language}}; {{arabic_style}}). The first supplied image is immutable {{layout}} geometry law; the second is style only. Render {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain at {{chain_length}}. Preserve exact spelling and exactly two connected jump rings; no additions or duplicates. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final admin studio hero release','system:migration'),
  ('00000000-0000-0000-0000-000000000506','image.billboard',1,'Billboard campaign photograph for {{approved_name}} ({{language}}; {{arabic_style}}). The first supplied image is immutable {{layout}} geometry law; the second is style only. Render {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and a {{chain_style}} chain at {{chain_length}}. Preserve exact spelling and exactly two connected jump rings; no additions or duplicates. Requested view: {{presentation_view}}. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final admin billboard release','system:migration'),
  ('00000000-0000-0000-0000-000000000507','video.preview',2,'Create a restrained silent {{presentation_view}} motion preview from the verified still for {{approved_name}} ({{language}}; {{arabic_style}}). Preserve exact {{layout}} geometry, {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} {{dimensions}}, and {{chain_style}} at {{chain_length}}. No morphing or new objects. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final silent four-second preview','system:migration'),
  ('00000000-0000-0000-0000-000000000508','video.final',2,'Create a polished silent {{presentation_view}} final film from the verified still for {{approved_name}} ({{language}}; {{arabic_style}}). Preserve exact {{layout}} geometry, {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} {{dimensions}}, and {{chain_style}} at {{chain_length}}. No morphing or new objects. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final silent six-second film','system:migration'),
  ('00000000-0000-0000-0000-000000000509','verification.image',1,'Verify generated {{presentation_view}} for {{approved_name}} ({{language}}; {{arabic_style}}) against immutable {{layout}} geometry, {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} {{dimensions}}, and {{chain_style}} at {{chain_length}}. Reject wrong spelling/script, identity drift, incoherent pendant, anything other than exactly two connected jump rings, wrong shot, added letters, names, charms or duplicates. {{inspiration_rule}}',array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view','inspiration_rule'],'Final image verification release','system:migration');

insert into public.prompt_profile_publications(profile,release_id,published_by)
select profile,id,'system:migration' from public.prompt_releases where id between '00000000-0000-0000-0000-000000000501' and '00000000-0000-0000-0000-000000000509'
on conflict (profile) do update set release_id=excluded.release_id,published_by=excluded.published_by,published_at=now();
insert into public.prompt_publication_events(profile,previous_release_id,release_id,published_by)
select profile,null,id,'system:migration' from public.prompt_releases where id between '00000000-0000-0000-0000-000000000501' and '00000000-0000-0000-0000-000000000509';

alter table public.generation_runs add column pipeline_release_id text references public.pipeline_releases(id);
update public.generation_runs set pipeline_release_id='caleums-one-view-v1';
alter table public.generation_runs alter column pipeline_release_id set default 'caleums-one-view-v1';
alter table public.generation_runs alter column pipeline_release_id set not null;

alter table public.generation_tasks drop constraint if exists generation_tasks_presentation_view_check;
alter table public.generation_tasks add constraint generation_tasks_presentation_view_check check (presentation_view in
  ('studio','on_skin','close_up','dark','motion','studio_hero','billboard','motion_preview','motion_final'));
alter table public.generation_tasks add column task_profile text;
alter table public.generation_tasks add column aspect_ratio text check (aspect_ratio in ('1:1','4:5','9:16','16:9'));
alter table public.generation_tasks add column dependency_task_id uuid references public.generation_tasks(id) on delete restrict;
alter table public.generation_tasks add column input_asset_ids uuid[] not null default '{}';
alter table public.generation_tasks add column style_anchor_release_id uuid references public.style_anchor_releases(id) on delete restrict;
alter table public.generation_tasks add column identity_artifact_id uuid references public.identity_artifacts(id) on delete restrict;
alter table public.generation_tasks add column pipeline_release text references public.pipeline_releases(id);
alter table public.generation_tasks add column model_release text;
alter table public.generation_tasks add column reservation_cents integer not null default 0 check (reservation_cents >= 0);
alter table public.generation_tasks add column estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0);
alter table public.generation_tasks add column provider_status_url text;
alter table public.generation_tasks add column provider_response_url text;
update public.generation_tasks t set
  task_profile='image.studio', aspect_ratio='1:1', pipeline_release='caleums-one-view-v1',
  model_release=t.provider_profile,
  reservation_cents=(select case when count(*)=1 then gr.reserved_spend_cents else 0 end from public.generation_tasks x join public.generation_runs gr on gr.id=x.run_id where x.run_id=t.run_id group by gr.reserved_spend_cents),
  estimated_cost_cents=(select studio_reservation_cents from public.runtime_policy where id=true)
where task_profile is null;
alter table public.generation_tasks alter column task_profile set not null;
alter table public.generation_tasks alter column task_profile set default 'image.studio';
alter table public.generation_tasks alter column aspect_ratio set not null;
alter table public.generation_tasks alter column aspect_ratio set default '1:1';
alter table public.generation_tasks alter column pipeline_release set not null;
alter table public.generation_tasks alter column pipeline_release set default 'caleums-one-view-v1';
alter table public.generation_tasks alter column model_release set not null;
alter table public.generation_tasks alter column model_release set default 'legacy';

alter table public.assets add column pipeline_release text references public.pipeline_releases(id);
alter table public.assets add column identity_artifact_id uuid references public.identity_artifacts(id) on delete restrict;
alter table public.assets add column style_anchor_release_id uuid references public.style_anchor_releases(id) on delete restrict;
update public.assets set pipeline_release='caleums-one-view-v1';
alter table public.assets alter column pipeline_release set not null;
alter table public.runtime_policy add column video_reservation_cents integer not null default 200 check (video_reservation_cents >= 0);

alter table public.pipeline_releases enable row level security;
alter table public.identity_artifacts enable row level security;
alter table public.style_anchor_releases enable row level security;
alter table public.style_anchor_publications enable row level security;
alter table public.style_anchor_publication_events enable row level security;
create policy identity_artifacts_owner_read on public.identity_artifacts for select using (owner_principal_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('style-anchors','style-anchors',false,10485760,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter function public.approve_and_start_studio(uuid,jsonb,text,text) rename to approve_and_start_studio_legacy;
alter function public.start_studio_run(uuid,text) rename to start_studio_run_legacy;

create or replace function public.expand_final_media_run(p_run_id uuid)
returns table(task_id uuid,outbox_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  v_run public.generation_runs; v_policy public.runtime_policy; v_usage public.principal_daily_usage;
  v_view text; v_profile text; v_ratio text; v_prompt public.prompt_releases; v_anchor public.style_anchor_releases;
  v_task_id uuid; v_outbox_id uuid; v_first_task uuid; v_first_outbox uuid; v_additional integer;
begin
  select * into v_run from public.generation_runs where id=p_run_id for update;
  if not found then raise exception 'run not found' using errcode='P0002'; end if;
  if v_run.pipeline_release_id='caleums-final-media-v1' then
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
  insert into public.principal_daily_usage(principal_id) values(v_run.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_run.owner_principal_id and usage_date=current_date for update;
  v_additional := v_policy.studio_reservation_cents * 3;
  if v_usage.reserved_spend_cents + v_additional > v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  for v_view,v_profile,v_ratio in values
    ('studio','image.packshot','1:1'),('on_skin','image.worn','4:5'),('close_up','image.macro_gift','1:1'),('dark','image.dark_editorial','9:16')
  loop
    select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
    if not found then raise exception 'prompt publication required: %',v_profile; end if;
    select r.* into v_anchor from public.style_anchor_publications p join public.style_anchor_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
    if not found then raise exception 'style anchor registry entry required: %',v_profile; end if;
    if v_view='studio' then
      update public.generation_tasks set task_profile=v_profile,aspect_ratio=v_ratio,prompt_release=v_prompt.profile||'@v'||v_prompt.version,prompt_release_id=v_prompt.id,provider_profile='still.openai',model_release='gpt-image-2-2026-04-21',style_anchor_release_id=v_anchor.id,pipeline_release='caleums-final-media-v1',reservation_cents=v_policy.studio_reservation_cents,estimated_cost_cents=v_policy.studio_reservation_cents where run_id=p_run_id and presentation_view='studio' returning id into v_task_id;
      update public.outbox_events set event_type='presentation.requested',payload=jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id) where aggregate_id=p_run_id and payload->>'taskId'=v_task_id::text returning id into v_outbox_id;
    else
      insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,style_anchor_release_id,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
      values(p_run_id,v_run.owner_principal_id,v_view,'task:'||p_run_id||':'||v_view||':release:'||v_prompt.id,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'still.openai',v_profile,v_ratio,v_anchor.id,'caleums-final-media-v1','gpt-image-2-2026-04-21',v_policy.studio_reservation_cents,v_policy.studio_reservation_cents) returning id into v_task_id;
      insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,dispatch_idempotency_key)
      values('run',p_run_id,'presentation.requested',jsonb_build_object('runId',p_run_id,'taskId',v_task_id,'taskKind','still','promptReleaseId',v_prompt.id,'styleAnchorReleaseId',v_anchor.id),'outbox:'||p_run_id||':'||v_view||':release:'||v_prompt.id) returning id into v_outbox_id;
    end if;
    if v_view='studio' then v_first_task:=v_task_id; v_first_outbox:=v_outbox_id; end if;
  end loop;
  update public.generation_runs set pipeline_release_id='caleums-final-media-v1',reserved_spend_cents=reserved_spend_cents+v_additional where id=p_run_id;
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_additional where principal_id=v_run.owner_principal_id and usage_date=current_date;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'system','pipeline.final_media_pinned',jsonb_build_object('runId',p_run_id,'pipelineRelease','caleums-final-media-v1','taskCount',4));
  return query select v_first_task,v_first_outbox;
end $$;

create or replace function public.approve_and_start_studio(p_draft_id uuid,p_specification jsonb,p_approval_key text,p_run_key text)
returns table(approved_design_id uuid,revision_id uuid,run_id uuid,task_id uuid,outbox_id uuid,canonical_identity_anchor jsonb)
language plpgsql security definer set search_path='' as $$
declare v record; v_expanded record;
begin
  select * into v from public.approve_and_start_studio_legacy(p_draft_id,p_specification,p_approval_key,p_run_key);
  select * into v_expanded from public.expand_final_media_run(v.run_id);
  return query select v.approved_design_id,v.revision_id,v.run_id,v_expanded.task_id,v_expanded.outbox_id,v.canonical_identity_anchor;
end $$;

create or replace function public.start_studio_run(p_design_id uuid,p_run_key text)
returns table(run_id uuid,task_id uuid,outbox_id uuid)
language plpgsql security definer set search_path='' as $$
declare v record; v_expanded record;
begin
  select * into v from public.start_studio_run_legacy(p_design_id,p_run_key);
  select * into v_expanded from public.expand_final_media_run(v.run_id);
  return query select v.run_id,v_expanded.task_id,v_expanded.outbox_id;
end $$;

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
  v_attempt:=v_task.attempt+1; if v_attempt>3 then raise exception 'provider attempt budget exhausted' using errcode='P0001'; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  select * into v_policy from public.runtime_policy where id=true;
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
  update public.principal_daily_usage set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where principal_id=v_task.owner_principal_id and usage_date=current_date;
  update public.generation_runs set actual_spend_cents=actual_spend_cents+p_actual_cost_cents,reserved_spend_cents=greatest(0,reserved_spend_cents-v_reserved) where id=v_run.id;
  update public.generation_tasks set reservation_cents=greatest(0,reservation_cents-v_reserved) where id=p_task_id;
end $$;

create or replace function public.mark_task_pre_spend_blocked(p_task_id uuid,p_reason text)
returns public.generation_tasks language plpgsql security definer set search_path='' as $$
declare v_task public.generation_tasks; v_run public.generation_runs; v_release integer;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='28000'; end if;
  select * into v_task from public.generation_tasks where id=p_task_id for update;
  if not found then raise exception 'task not found' using errcode='P0002'; end if;
  if v_task.attempt<>0 then raise exception 'pre-spend gate cannot follow provider reservation' using errcode='P0001'; end if;
  if v_task.status='blocked' then return v_task; end if;
  select * into v_run from public.generation_runs where id=v_task.run_id for update;
  v_release:=v_task.reservation_cents;
  update public.principal_daily_usage set reserved_spend_cents=greatest(0,reserved_spend_cents-v_release) where principal_id=v_task.owner_principal_id and usage_date=current_date;
  update public.generation_runs set reserved_spend_cents=greatest(0,reserved_spend_cents-v_release),status='partial',operator_review_reason=left(p_reason,300) where id=v_run.id;
  update public.generation_tasks set reservation_cents=0,status='blocked',terminal_error_code=left(p_reason,120) where id=p_task_id returning * into v_task;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_task.owner_principal_id,'job','task.pre_spend_operator_review',jsonb_build_object('taskId',p_task_id,'reason',left(p_reason,120),'releasedReservationCents',v_release));
  return v_task;
end $$;

create or replace function public.request_video_task(p_run_id uuid,p_kind text,p_source_task_id uuid,p_request_key text)
returns public.generation_tasks language plpgsql security definer set search_path='' as $$
declare v_run public.generation_runs; v_source public.generation_tasks; v_source_asset public.assets; v_profile text; v_view text; v_model text; v_prompt public.prompt_releases; v_policy public.runtime_policy; v_usage public.principal_daily_usage; v_task public.generation_tasks;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='28000'; end if;
  if p_kind not in ('preview','final') then raise exception 'invalid video kind' using errcode='22023'; end if;
  select * into v_run from public.generation_runs where id=p_run_id for update;
  select * into v_source from public.generation_tasks where id=p_source_task_id and run_id=p_run_id and status='ready';
  if not found then raise exception 'verified source task required' using errcode='P0002'; end if;
  select * into v_source_asset from public.assets where task_id=p_source_task_id and verification_result->>'passed'='true' order by created_at desc limit 1;
  if not found then raise exception 'verified source still required' using errcode='P0002'; end if;
  v_profile:=case when p_kind='preview' then 'video.preview' else 'video.final' end;
  v_view:=case when p_kind='preview' then 'motion_preview' else 'motion_final' end;
  v_model:=case when p_kind='preview' then 'bytedance/seedance-2.0/fast/image-to-video' else 'bytedance/seedance-2.0/image-to-video' end;
  select * into v_task from public.generation_tasks where dispatch_idempotency_key='video:'||p_request_key;
  if found then return v_task; end if;
  select r.* into v_prompt from public.prompt_profile_publications p join public.prompt_releases r on r.id=p.release_id where p.profile=v_profile for share of p;
  select * into v_policy from public.runtime_policy where id=true;
  insert into public.principal_daily_usage(principal_id) values(v_run.owner_principal_id) on conflict(principal_id,usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage where principal_id=v_run.owner_principal_id and usage_date=current_date for update;
  if v_usage.reserved_spend_cents+v_policy.video_reservation_cents>v_policy.max_reserved_spend_cents then raise exception 'daily spend guard exceeded' using errcode='P0001'; end if;
  insert into public.generation_tasks(run_id,owner_principal_id,presentation_view,dispatch_idempotency_key,prompt_release,prompt_release_id,provider_profile,task_profile,aspect_ratio,dependency_task_id,input_asset_ids,pipeline_release,model_release,reservation_cents,estimated_cost_cents)
  values(p_run_id,v_run.owner_principal_id,v_view,'video:'||p_request_key,v_prompt.profile||'@v'||v_prompt.version,v_prompt.id,'video.fal',v_profile,'9:16',p_source_task_id,array[v_source_asset.id],'caleums-final-media-v1',v_model,v_policy.video_reservation_cents,v_policy.video_reservation_cents) returning * into v_task;
  insert into public.outbox_events(aggregate_type,aggregate_id,event_type,payload,dispatch_idempotency_key) values('task',v_task.id,'video.requested',jsonb_build_object('runId',p_run_id,'taskId',v_task.id,'taskKind','video'),'outbox:video:'||p_request_key);
  update public.principal_daily_usage set reserved_spend_cents=reserved_spend_cents+v_policy.video_reservation_cents where principal_id=v_run.owner_principal_id and usage_date=current_date;
  update public.generation_runs set reserved_spend_cents=reserved_spend_cents+v_policy.video_reservation_cents where id=p_run_id;
  insert into public.audit_events(design_id,principal_id,actor_type,action,detail) values(v_run.design_id,v_run.owner_principal_id,'operator','video.requested',jsonb_build_object('taskId',v_task.id,'sourceTaskId',p_source_task_id,'kind',p_kind));
  return v_task;
end $$;

create or replace function public.publish_style_anchor_release(p_release_id uuid,p_expected_current_release_id uuid,p_published_by text)
returns public.style_anchor_publications language plpgsql security definer set search_path='' as $$
declare v_release public.style_anchor_releases; v_current public.style_anchor_publications; v_result public.style_anchor_publications;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='28000'; end if;
  select * into v_release from public.style_anchor_releases where id=p_release_id and status='published';
  if not found then raise exception 'complete published style anchor release required' using errcode='P0002'; end if;
  select * into v_current from public.style_anchor_publications where profile=v_release.profile for update;
  if v_current.release_id is distinct from p_expected_current_release_id then raise exception 'style anchor publication changed; refresh required' using errcode='40001'; end if;
  update public.style_anchor_publications set release_id=v_release.id,published_by=p_published_by,published_at=now() where profile=v_release.profile returning * into v_result;
  insert into public.style_anchor_publication_events(profile,previous_release_id,release_id,published_by) values(v_release.profile,v_current.release_id,v_release.id,p_published_by);
  return v_result;
end $$;

create or replace function public.create_style_anchor_release(p_profile text,p_source_task_id text,p_bucket_id text,p_object_path text,p_checksum_sha256 text,p_approval_note text,p_created_by text)
returns public.style_anchor_releases language plpgsql security definer set search_path='' as $$
declare v_release public.style_anchor_releases; v_version integer; v_expected_source text;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='28000'; end if;
  select source_task_id into v_expected_source from public.style_anchor_releases where profile=p_profile order by version asc limit 1;
  if v_expected_source is null or v_expected_source<>p_source_task_id then raise exception 'style anchor source task mismatch' using errcode='22023'; end if;
  if p_bucket_id<>'style-anchors' or nullif(p_object_path,'') is null or p_checksum_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid style anchor artifact lineage' using errcode='22023'; end if;
  if nullif(trim(p_approval_note),'') is null or nullif(trim(p_created_by),'') is null then raise exception 'style anchor approval metadata required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('style-anchor-release:'||p_profile,0));
  select coalesce(max(version),0)+1 into v_version from public.style_anchor_releases where profile=p_profile;
  insert into public.style_anchor_releases(profile,version,source_task_id,status,bucket_id,object_path,checksum_sha256,approval_note,created_by)
  values(p_profile,v_version,p_source_task_id,'published',p_bucket_id,p_object_path,p_checksum_sha256,left(p_approval_note,500),p_created_by) returning * into v_release;
  insert into public.audit_events(actor_type,action,detail) values('operator','style_anchor.release_created',jsonb_build_object('profile',p_profile,'releaseId',v_release.id,'version',v_version,'sourceTaskId',p_source_task_id,'checksum',p_checksum_sha256));
  return v_release;
end $$;

create or replace function public.create_prompt_release(p_profile text,p_template text,p_parsed_variables text[],p_change_note text,p_created_by text)
returns public.prompt_releases language plpgsql security definer set search_path='' as $$
declare v_release public.prompt_releases; v_version integer; v_required text[];
begin
  if p_profile not in ('image.studio','image.packshot','image.worn','image.macro_gift','image.dark_editorial','image.studio_hero','image.billboard','video.preview','video.final','verification.image') then raise exception 'invalid prompt profile'; end if;
  if length(trim(p_template))=0 or length(p_template)>12000 then raise exception 'invalid prompt template length'; end if;
  if length(trim(p_change_note))=0 or length(p_change_note)>500 then raise exception 'invalid change note'; end if;
  v_required:=array['approved_name','language','arabic_style','layout','metal_karat','metal_color','finish','stone_coverage','gemstone','size_profile','dimensions','chain_style','chain_length','presentation_view'];
  if p_profile<>'image.studio' then v_required:=v_required||array['inspiration_rule']; end if;
  if p_parsed_variables is null or not (p_parsed_variables @> v_required and p_parsed_variables <@ v_required) or cardinality(p_parsed_variables)<>cardinality(array(select distinct unnest(p_parsed_variables))) then raise exception 'invalid prompt variables'; end if;
  perform pg_advisory_xact_lock(hashtextextended('prompt-release:'||p_profile,0));
  select coalesce(max(version),0)+1 into v_version from public.prompt_releases where profile=p_profile;
  insert into public.prompt_releases(profile,version,template,parsed_variables,change_note,created_by) values(p_profile,v_version,p_template,p_parsed_variables,p_change_note,p_created_by) returning * into v_release;
  insert into public.audit_events(actor_type,action,detail) values('operator','prompt.release_created',jsonb_build_object('profile',p_profile,'releaseId',v_release.id,'version',v_version));
  return v_release;
end $$;

revoke all on table public.pipeline_releases,public.identity_artifacts,public.style_anchor_releases,public.style_anchor_publications,public.style_anchor_publication_events from public,anon,authenticated;
grant select on public.identity_artifacts to authenticated;
grant all privileges on public.pipeline_releases,public.identity_artifacts,public.style_anchor_releases,public.style_anchor_publications,public.style_anchor_publication_events to service_role;
grant usage,select on sequence public.style_anchor_publication_events_id_seq to service_role;
revoke all on function public.approve_and_start_studio_legacy(uuid,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.start_studio_run_legacy(uuid,text) from public,anon,authenticated;
revoke all on function public.expand_final_media_run(uuid) from public,anon,authenticated;
revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public,anon;
revoke all on function public.start_studio_run(uuid,text) from public,anon;
revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public,anon,authenticated;
revoke all on function public.mark_task_pre_spend_blocked(uuid,text) from public,anon,authenticated;
revoke all on function public.request_video_task(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.publish_style_anchor_release(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.create_style_anchor_release(text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.approve_and_start_studio(uuid,jsonb,text,text) to authenticated,service_role;
grant execute on function public.start_studio_run(uuid,text) to authenticated,service_role;
grant execute on function public.expand_final_media_run(uuid) to service_role;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;
grant execute on function public.mark_task_pre_spend_blocked(uuid,text) to service_role;
grant execute on function public.request_video_task(uuid,text,uuid,text) to service_role;
grant execute on function public.publish_style_anchor_release(uuid,uuid,text) to service_role;
grant execute on function public.create_style_anchor_release(text,text,text,text,text,text,text) to service_role;

alter publication supabase_realtime add table public.identity_artifacts;
