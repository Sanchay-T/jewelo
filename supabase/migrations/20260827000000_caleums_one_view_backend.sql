-- Caleums one-view-first production backend.
-- The browser may only select a design/revision. Presentation view, prompt
-- release, provider and model are selected by trusted server/job policy.

create extension if not exists pgcrypto with schema extensions;

create type public.design_status as enum ('draft', 'approved', 'generating', 'quoted', 'ordered');
create type public.run_status as enum ('queued', 'running', 'partial', 'complete', 'cancelled', 'operator_review');
create type public.task_status as enum ('queued', 'generating', 'verifying', 'ready', 'retrying', 'failed', 'blocked', 'cancelled');
create type public.checkout_status as enum ('not_created', 'draft', 'ready', 'completed', 'expired', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'operator')),
  created_at timestamptz not null default now()
);

create table public.runtime_policy (
  id boolean primary key default true check (id),
  environment text not null default 'development' check (environment in ('development', 'production')),
  supabase_region text not null default 'ap-northeast-2',
  daily_generation_limit integer not null default 3 check (daily_generation_limit > 0),
  max_reserved_spend_cents integer not null default 500 check (max_reserved_spend_cents >= 0),
  studio_reservation_cents integer not null default 100 check (studio_reservation_cents >= 0),
  updated_at timestamptz not null default now()
);
insert into public.runtime_policy (id) values (true) on conflict do nothing;

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  locale text not null check (locale in ('en', 'ar')),
  status public.design_status not null default 'draft',
  name text not null default 'Untitled pendant',
  resume_path text,
  active_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_principal_id)
);

create table public.design_drafts (
  id uuid primary key default gen_random_uuid(),
  design_id uuid references public.designs(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  locale text not null check (locale in ('en', 'ar')),
  specification jsonb not null,
  spelling_confirmed boolean not null default false,
  revision_token bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draft_specification_object check (jsonb_typeof(specification) = 'object'),
  unique (id, owner_principal_id),
  foreign key (design_id, owner_principal_id) references public.designs(id, owner_principal_id)
);

create table public.design_revisions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.design_drafts(id),
  revision_number integer not null check (revision_number > 0),
  specification jsonb not null,
  identity_anchor jsonb not null,
  approval_idempotency_key text not null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (design_id, revision_number),
  unique (id, owner_principal_id),
  unique (owner_principal_id, approval_idempotency_key),
  constraint revision_specification_object check (jsonb_typeof(specification) = 'object'),
  constraint revision_identity_object check (jsonb_typeof(identity_anchor) = 'object'),
  foreign key (design_id, owner_principal_id) references public.designs(id, owner_principal_id),
  foreign key (draft_id, owner_principal_id) references public.design_drafts(id, owner_principal_id)
);
alter table public.designs add constraint designs_active_revision_fk
  foreign key (active_revision_id, owner_principal_id) references public.design_revisions(id, owner_principal_id);

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  revision_id uuid not null references public.design_revisions(id),
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  status public.run_status not null default 'queued',
  label text not null default 'Studio view',
  run_idempotency_key text not null,
  reserved_spend_cents integer not null check (reserved_spend_cents >= 0),
  actual_spend_cents integer not null default 0 check (actual_spend_cents >= 0),
  cancelled_at timestamptz,
  operator_review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_principal_id, run_idempotency_key),
  unique (id, owner_principal_id),
  foreign key (design_id, owner_principal_id) references public.designs(id, owner_principal_id),
  foreign key (revision_id, owner_principal_id) references public.design_revisions(id, owner_principal_id)
);
create unique index generation_runs_one_active_design
  on public.generation_runs(owner_principal_id, design_id)
  where status in ('queued', 'running');

create table public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.generation_runs(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  presentation_view text not null check (presentation_view in ('studio', 'on_skin', 'close_up', 'dark', 'motion')),
  status public.task_status not null default 'queued',
  attempt integer not null default 0 check (attempt between 0 and 3),
  dispatch_idempotency_key text not null unique,
  prompt_release text not null,
  provider_profile text not null,
  cancel_requested_at timestamptz,
  terminal_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, presentation_view),
  unique (id, owner_principal_id),
  foreign key (run_id, owner_principal_id) references public.generation_runs(id, owner_principal_id)
);

create table public.provider_attempts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.generation_tasks(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  attempt integer not null check (attempt between 1 and 3),
  provider text not null,
  model text not null,
  provider_idempotency_key text not null unique,
  provider_request_id text,
  status text not null check (status in ('reserved', 'submitted', 'succeeded', 'failed', 'ambiguous')),
  estimated_cost_cents integer not null default 0,
  actual_cost_cents integer,
  error_class text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (task_id, attempt),
  foreign key (task_id, owner_principal_id) references public.generation_tasks(id, owner_principal_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  revision_id uuid not null references public.design_revisions(id),
  run_id uuid not null references public.generation_runs(id) on delete cascade,
  task_id uuid not null references public.generation_tasks(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  presentation_view text not null,
  bucket_id text not null,
  object_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  checksum_sha256 text not null,
  provider text not null,
  model text not null,
  prompt_release text not null,
  identity_fingerprint text not null,
  input_asset_ids uuid[] not null default '{}',
  attempt integer not null,
  verification_result jsonb not null,
  created_at timestamptz not null default now(),
  unique (task_id, attempt),
  unique (bucket_id, object_path),
  foreign key (design_id, owner_principal_id) references public.designs(id, owner_principal_id),
  foreign key (revision_id, owner_principal_id) references public.design_revisions(id, owner_principal_id),
  foreign key (run_id, owner_principal_id) references public.generation_runs(id, owner_principal_id),
  foreign key (task_id, owner_principal_id) references public.generation_tasks(id, owner_principal_id)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  revision_id uuid not null references public.design_revisions(id),
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('requested', 'issued', 'accepted', 'expired')),
  currency text not null default 'AED' check (currency = 'AED'),
  total integer not null check (total >= 0),
  snapshot jsonb not null,
  checkout_status public.checkout_status not null default 'not_created',
  shopify_draft_order_id text,
  checkout_url text,
  checkout_idempotency_key text not null,
  issued_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (owner_principal_id, checkout_idempotency_key)
);
create unique index quotes_shopify_draft_order_unique on public.quotes(shopify_draft_order_id) where shopify_draft_order_id is not null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  revision_id uuid not null references public.design_revisions(id),
  quote_id uuid not null references public.quotes(id),
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('confirmed', 'in-production', 'quality-check', 'ready')),
  checkout_status public.checkout_status not null,
  accepted_total integer not null,
  shopify_draft_order_id text,
  shopify_order_id text,
  accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint orders_quote_unique unique (quote_id)
);
create unique index orders_shopify_order_unique on public.orders(shopify_order_id) where shopify_order_id is not null;

create table public.audit_events (
  id bigint generated always as identity primary key,
  design_id uuid references public.designs(id) on delete cascade,
  principal_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('customer', 'operator', 'job', 'webhook', 'system')),
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_ordered on public.audit_events(design_id, id);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  dispatch_idempotency_key text not null unique,
  state text not null default 'pending' check (state in ('pending', 'dispatching', 'published', 'failed')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index outbox_pending on public.outbox_events(available_at, created_at) where state in ('pending', 'failed');

create table public.principal_daily_usage (
  principal_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  runs_started integer not null default 0,
  reserved_spend_cents integer not null default 0,
  actual_spend_cents integer not null default 0,
  primary key (principal_id, usage_date)
);

create table public.webhook_deliveries (
  provider text not null,
  delivery_id text not null,
  payload_sha256 text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, delivery_id)
);

create table public.share_grants (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger designs_touch before update on public.designs for each row execute function public.touch_updated_at();
create trigger drafts_touch before update on public.design_drafts for each row execute function public.touch_updated_at();
create trigger runs_touch before update on public.generation_runs for each row execute function public.touch_updated_at();
create trigger tasks_touch before update on public.generation_tasks for each row execute function public.touch_updated_at();

create or replace function public.prevent_revision_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'design revisions are immutable' using errcode = '55000'; end $$;
create trigger revisions_immutable before update on public.design_revisions
for each row execute function public.prevent_revision_mutation();
create trigger assets_immutable before update on public.assets
for each row execute function public.prevent_revision_mutation();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.approve_and_start_studio(
  p_draft_id uuid,
  p_specification jsonb,
  p_approval_key text,
  p_run_key text
) returns table(approved_design_id uuid, revision_id uuid, run_id uuid, task_id uuid, outbox_id uuid, canonical_identity_anchor jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_draft public.design_drafts;
  v_design_id uuid;
  v_revision_id uuid;
  v_run_id uuid;
  v_task_id uuid;
  v_outbox_id uuid;
  v_revision_number integer;
  v_identity_anchor jsonb;
  v_language text;
  v_approved_text text;
  v_layout text;
  v_connector text;
  v_identity_fingerprint text;
  v_policy public.runtime_policy;
  v_usage public.principal_daily_usage;
begin
  if v_owner is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if coalesce((p_specification->>'spellingConfirmed')::boolean, false) is not true then
    raise exception 'spelling confirmation required' using errcode = '22023';
  end if;
  select * into v_draft from public.design_drafts where id = p_draft_id and owner_principal_id = v_owner for update;
  if not found then raise exception 'draft not found' using errcode = 'P0002'; end if;
  if v_draft.design_id is not null and not exists (
    select 1 from public.designs d
    where d.id = v_draft.design_id and d.owner_principal_id = v_owner and d.customer_id = v_owner
  ) then raise exception 'draft design ownership mismatch' using errcode = '42501'; end if;
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
  v_identity_fingerprint := encode(extensions.digest(
    convert_to(concat_ws('|', v_language, v_approved_text, v_layout, v_connector), 'UTF8'), 'sha256'
  ), 'hex');
  v_identity_anchor := jsonb_build_object(
    'approvedText', v_approved_text,
    'language', v_language,
    'typography', case when v_language = 'ar' then 'Noto Naskh Arabic' else 'Playfair Display Italic' end,
    'fingerprint', v_identity_fingerprint,
    'geometryPath', concat_ws(':', 'canonical', v_layout, v_connector, v_identity_fingerprint)
  );
  select gr.id, gr.design_id, gr.revision_id into v_run_id, v_design_id, v_revision_id
    from public.generation_runs gr
    where gr.owner_principal_id = v_owner and gr.run_idempotency_key = p_run_key;
  if found then
    select gt.id into v_task_id from public.generation_tasks gt where gt.run_id = v_run_id and gt.presentation_view = 'studio';
    select oe.id into v_outbox_id from public.outbox_events oe where oe.dispatch_idempotency_key = 'outbox:' || v_run_id || ':studio:v1';
    select dr.identity_anchor into v_identity_anchor from public.design_revisions dr
      where dr.id = v_revision_id and dr.owner_principal_id = v_owner;
    return query select v_design_id, v_revision_id, v_run_id, v_task_id, v_outbox_id, v_identity_anchor;
    return;
  end if;
  select * into v_policy from public.runtime_policy where id = true;
  insert into public.principal_daily_usage(principal_id) values (v_owner)
    on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage
    where principal_id = v_owner and usage_date = current_date for update;
  if v_usage.runs_started >= v_policy.daily_generation_limit then
    raise exception 'daily generation quota exceeded' using errcode = 'P0001';
  end if;
  if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then
    raise exception 'daily spend guard exceeded' using errcode = 'P0001';
  end if;

  if v_draft.design_id is null then
    insert into public.designs(owner_principal_id, customer_id, locale, name)
      values (v_owner, v_owner, v_draft.locale, v_approved_text)
      returning id into v_design_id;
    update public.design_drafts set design_id = v_design_id where id = v_draft.id;
  else v_design_id := v_draft.design_id; end if;

  select id into v_revision_id from public.design_revisions
    where owner_principal_id = v_owner and approval_idempotency_key = p_approval_key;
  if v_revision_id is null then
    select coalesce(max(revision_number), 0) + 1 into v_revision_number
      from public.design_revisions where design_id = v_design_id;
    insert into public.design_revisions(design_id, owner_principal_id, draft_id, revision_number, specification, identity_anchor, approval_idempotency_key)
      values (v_design_id, v_owner, p_draft_id, v_revision_number, p_specification, v_identity_anchor, p_approval_key)
      returning id into v_revision_id;
  end if;

  insert into public.generation_runs(design_id, revision_id, owner_principal_id, run_idempotency_key, reserved_spend_cents)
    values (v_design_id, v_revision_id, v_owner, p_run_key, v_policy.studio_reservation_cents)
    returning id into v_run_id;
  insert into public.generation_tasks(run_id, owner_principal_id, presentation_view, dispatch_idempotency_key, prompt_release, provider_profile)
    values (v_run_id, v_owner, 'studio', 'task:' || v_run_id || ':studio:v1', 'studio-placeholder-v1', 'still.fal')
    returning id into v_task_id;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('run', v_run_id, 'studio.requested', jsonb_build_object('runId', v_run_id, 'taskId', v_task_id), 'outbox:' || v_run_id || ':studio:v1')
    returning id into v_outbox_id;
  update public.principal_daily_usage set runs_started = runs_started + 1,
    reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents
    where principal_id = v_owner and usage_date = current_date;
  update public.designs set active_revision_id = v_revision_id, status = 'generating'
    where id = v_design_id and owner_principal_id = v_owner and customer_id = v_owner;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_design_id, v_owner, 'customer', 'revision.approved_run.started', jsonb_build_object('revisionId', v_revision_id, 'runId', v_run_id));
  return query select v_design_id, v_revision_id, v_run_id, v_task_id, v_outbox_id, v_identity_anchor;
end $$;

create or replace function public.cancel_generation_task(p_task_id uuid) returns public.generation_tasks
language plpgsql security definer set search_path = '' as $$
declare v_task public.generation_tasks; v_design uuid;
begin
  update public.generation_tasks set cancel_requested_at = now(), status = 'cancelled'
    where id = p_task_id and owner_principal_id = auth.uid() and status in ('queued','retrying','generating','verifying')
    returning * into v_task;
  if not found then raise exception 'task cannot be cancelled' using errcode = 'P0001'; end if;
  select design_id into v_design from public.generation_runs where id = v_task.run_id;
  update public.generation_runs set status = 'cancelled', cancelled_at = now() where id = v_task.run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_design, auth.uid(), 'customer', 'task.cancelled', jsonb_build_object('taskId', p_task_id));
  return v_task;
end $$;

create or replace function public.retry_generation_task(p_task_id uuid, p_retry_key text) returns public.generation_tasks
language plpgsql security definer set search_path = '' as $$
declare v_task public.generation_tasks; v_design uuid; v_outbox_key text;
begin
  select * into v_task from public.generation_tasks where id = p_task_id and owner_principal_id = auth.uid() for update;
  if not found or v_task.status not in ('failed','blocked') then raise exception 'task cannot be retried' using errcode = 'P0001'; end if;
  if v_task.attempt >= 3 then raise exception 'provider attempt budget exhausted' using errcode = 'P0001'; end if;
  v_outbox_key := 'retry:' || p_task_id || ':' || p_retry_key;
  insert into public.outbox_events(aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key)
    values ('task', p_task_id, 'studio.retry_requested', jsonb_build_object('taskId', p_task_id), v_outbox_key)
    on conflict (dispatch_idempotency_key) do nothing;
  update public.generation_tasks set status = 'retrying', terminal_error_code = null where id = p_task_id returning * into v_task;
  select design_id into v_design from public.generation_runs where id = v_task.run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (v_design, auth.uid(), 'customer', 'task.retry_requested', jsonb_build_object('taskId', p_task_id, 'retryKey', p_retry_key));
  return v_task;
end $$;

create or replace function public.reserve_provider_attempt(
  p_task_id uuid,
  p_provider text,
  p_model text,
  p_provider_key text
) returns table(attempt_number integer, duplicate_complete boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_task public.generation_tasks;
  v_run public.generation_runs;
  v_policy public.runtime_policy;
  v_usage public.principal_daily_usage;
  v_attempt integer;
  v_existing public.provider_attempts;
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
  insert into public.principal_daily_usage(principal_id) values (v_task.owner_principal_id)
    on conflict (principal_id, usage_date) do nothing;
  select * into v_usage from public.principal_daily_usage
    where principal_id = v_task.owner_principal_id and usage_date = current_date for update;
  if v_attempt > 1 then
    if v_usage.reserved_spend_cents + v_policy.studio_reservation_cents > v_policy.max_reserved_spend_cents then
      update public.generation_tasks set status = 'blocked', terminal_error_code = 'spend_guard_exceeded' where id = p_task_id;
      update public.generation_runs set status = 'operator_review', operator_review_reason = 'spend_guard_exceeded' where id = v_run.id;
      raise exception 'daily spend guard exceeded' using errcode = 'P0001';
    end if;
    update public.principal_daily_usage set reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents
      where principal_id = v_task.owner_principal_id and usage_date = current_date;
    update public.generation_runs set reserved_spend_cents = reserved_spend_cents + v_policy.studio_reservation_cents where id = v_run.id;
  end if;
  insert into public.provider_attempts(task_id, owner_principal_id, attempt, provider, model, provider_idempotency_key, status, estimated_cost_cents)
    values (p_task_id, v_task.owner_principal_id, v_attempt, p_provider, p_model, p_provider_key, 'reserved', v_policy.studio_reservation_cents);
  update public.generation_tasks set attempt = v_attempt, status = 'generating' where id = p_task_id;
  return query select v_attempt, false;
end $$;

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

create or replace function public.set_design_resume_path(p_design_id uuid, p_resume_path text) returns public.designs
language plpgsql security definer set search_path = '' as $$
declare v_design public.designs;
begin
  if p_resume_path is null or length(p_resume_path) > 500 or p_resume_path !~ '^/(en|ar)(/|$)' then
    raise exception 'invalid resume path' using errcode = '22023';
  end if;
  update public.designs set resume_path = p_resume_path where id = p_design_id and owner_principal_id = auth.uid()
    returning * into v_design;
  if not found then raise exception 'design not found' using errcode = 'P0002'; end if;
  return v_design;
end $$;

alter table public.profiles enable row level security;
alter table public.runtime_policy enable row level security;
alter table public.designs enable row level security;
alter table public.design_drafts enable row level security;
alter table public.design_revisions enable row level security;
alter table public.generation_runs enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.provider_attempts enable row level security;
alter table public.assets enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.audit_events enable row level security;
alter table public.outbox_events enable row level security;
alter table public.principal_daily_usage enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.share_grants enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy designs_owner_read on public.designs for select using (owner_principal_id = auth.uid());
create policy drafts_owner_read on public.design_drafts for select using (owner_principal_id = auth.uid());
create policy drafts_owner_insert on public.design_drafts for insert with check (owner_principal_id = auth.uid());
create policy drafts_owner_update on public.design_drafts for update using (owner_principal_id = auth.uid()) with check (owner_principal_id = auth.uid());
create policy drafts_owner_delete on public.design_drafts for delete using (owner_principal_id = auth.uid());
create policy revisions_owner_read on public.design_revisions for select using (owner_principal_id = auth.uid());
create policy runs_owner_read on public.generation_runs for select using (owner_principal_id = auth.uid());
create policy tasks_owner_read on public.generation_tasks for select using (owner_principal_id = auth.uid());
create policy attempts_owner_read on public.provider_attempts for select using (owner_principal_id = auth.uid());
create policy assets_owner_read on public.assets for select using (owner_principal_id = auth.uid());
create policy quotes_owner_read on public.quotes for select using (owner_principal_id = auth.uid());
create policy orders_owner_read on public.orders for select using (owner_principal_id = auth.uid());
create policy audit_owner_read on public.audit_events for select using (
  exists (select 1 from public.designs d where d.id = design_id and d.owner_principal_id = auth.uid())
);
create policy usage_owner_read on public.principal_daily_usage for select using (principal_id = auth.uid());
create policy shares_owner_all on public.share_grants for all using (owner_principal_id = auth.uid()) with check (owner_principal_id = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('references', 'references', false, 5242880, array['image/png','image/jpeg','image/webp']),
  ('identity-anchors', 'identity-anchors', false, 5242880, array['image/png','image/svg+xml','application/json']),
  ('generated-assets', 'generated-assets', false, 52428800, array['image/png','image/jpeg','image/webp','video/mp4'])
on conflict (id) do update set public = false;

create policy storage_owner_read on storage.objects for select using (
  bucket_id in ('references','identity-anchors','generated-assets') and
  (storage.foldername(name))[1] = 'principal' and (storage.foldername(name))[2] = auth.uid()::text
);
create policy storage_owner_reference_insert on storage.objects for insert with check (
  bucket_id = 'references' and (storage.foldername(name))[1] = 'principal' and (storage.foldername(name))[2] = auth.uid()::text
);
create policy storage_owner_reference_delete on storage.objects for delete using (
  bucket_id = 'references' and (storage.foldername(name))[1] = 'principal' and (storage.foldername(name))[2] = auth.uid()::text
);

alter publication supabase_realtime add table public.generation_runs;
alter publication supabase_realtime add table public.generation_tasks;
alter publication supabase_realtime add table public.assets;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.prevent_revision_mutation() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.approve_and_start_studio(uuid,jsonb,text,text) from public, anon;
revoke all on function public.cancel_generation_task(uuid) from public, anon;
revoke all on function public.retry_generation_task(uuid,text) from public, anon;
revoke all on function public.set_design_resume_path(uuid,text) from public, anon;
revoke all on function public.reserve_provider_attempt(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.approve_and_start_studio(uuid,jsonb,text,text) to authenticated;
grant execute on function public.cancel_generation_task(uuid) to authenticated;
grant execute on function public.retry_generation_task(uuid,text) to authenticated;
grant execute on function public.set_design_resume_path(uuid,text) to authenticated;
grant execute on function public.reserve_provider_attempt(uuid,text,text,text) to service_role;
grant execute on function public.reconcile_provider_attempt(uuid,integer,text,integer,text,boolean) to service_role;
