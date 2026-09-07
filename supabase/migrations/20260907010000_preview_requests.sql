-- Honest degrade: durable capture of a shopper's request.
--
-- When personalized generation cannot be delivered, the review stage keeps the
-- clearly labelled illustrated sample on screen and the shopper leaves a way to
-- be contacted. That request is the production failure state, so it is durable
-- Supabase truth with the same owner boundary as every other customer table:
-- the owner may insert and read their own rows and nothing else. Only the
-- service role (operator surface) may change status, note or contacted_at.
--
-- No provider call, price or promise is implied by a captured request.

create table public.preview_requests (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid references public.designs(id) on delete set null,
  design_revision_id uuid references public.design_revisions(id) on delete set null,
  generation_run_id uuid references public.generation_runs(id) on delete set null,
  locale text not null check (locale in ('en', 'ar')),
  specification jsonb not null,
  sample_reference jsonb,
  contact jsonb not null,
  request_key text,
  status text not null default 'new' check (status in ('new', 'contacted', 'fulfilled', 'cancelled')),
  operator_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  constraint preview_request_specification_object check (jsonb_typeof(specification) = 'object'),
  constraint preview_request_contact_object check (jsonb_typeof(contact) = 'object'),
  constraint preview_request_sample_object check (sample_reference is null or jsonb_typeof(sample_reference) = 'object'),
  constraint preview_request_key_shape check (request_key is null or length(request_key) between 1 and 200),
  constraint preview_request_note_length check (operator_note is null or length(operator_note) <= 2000),
  constraint preview_request_contacted_state check (contacted_at is null or status <> 'new')
);

-- A double submit of the same client request key is one row, per principal.
create unique index preview_requests_principal_request_key
  on public.preview_requests(principal_id, request_key)
  where request_key is not null;
-- The operator queue reads newest-first, usually filtered by status.
create index preview_requests_queue on public.preview_requests(status, created_at desc);
create index preview_requests_principal on public.preview_requests(principal_id, created_at desc);

create trigger preview_requests_touch before update on public.preview_requests
for each row execute function public.touch_updated_at();

-- A linked design, revision or run must belong to the same principal. The rows
-- stay nullable and survive design deletion so the operator queue is not
-- silently emptied by retention work.
create or replace function public.enforce_preview_request_ownership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.design_id is not null and not exists (
    select 1 from public.designs d where d.id = new.design_id and d.owner_principal_id = new.principal_id
  ) then raise exception 'design does not belong to this principal' using errcode = '22023'; end if;
  if new.design_revision_id is not null and not exists (
    select 1 from public.design_revisions r where r.id = new.design_revision_id and r.owner_principal_id = new.principal_id
  ) then raise exception 'revision does not belong to this principal' using errcode = '22023'; end if;
  if new.generation_run_id is not null and not exists (
    select 1 from public.generation_runs g where g.id = new.generation_run_id and g.owner_principal_id = new.principal_id
  ) then raise exception 'run does not belong to this principal' using errcode = '22023'; end if;
  return new;
end $$;
create trigger preview_requests_owner_consistency
before insert or update of design_id, design_revision_id, generation_run_id, principal_id
on public.preview_requests
for each row execute function public.enforce_preview_request_ownership();

-- Append-only audit, matching the existing `<aggregate>.<event>` vocabulary.
-- The contact value is PII and never enters the audit detail; only the channel
-- and whether a labelled sample was shown are recorded.
create or replace function public.audit_preview_request_captured() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
  values (
    new.design_id,
    new.principal_id,
    'customer',
    'preview_request.captured',
    jsonb_build_object(
      'previewRequestId', new.id,
      'locale', new.locale,
      'contactChannel', new.contact->>'channel',
      'sampleShown', new.sample_reference is not null,
      'sampleId', new.sample_reference->>'sampleId',
      'generationRunId', new.generation_run_id
    )
  );
  return null;
end $$;
create trigger preview_requests_audit after insert on public.preview_requests
for each row execute function public.audit_preview_request_captured();

create or replace function public.audit_preview_request_operator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    -- The actor is the operator, so principal_id stays null; the affected
    -- principal is recorded in the detail instead.
    insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (
      new.design_id,
      null,
      'operator',
      'preview_request.status_changed',
      jsonb_build_object(
        'previewRequestId', new.id,
        'principalId', new.principal_id,
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  return null;
end $$;
create trigger preview_requests_operator_audit after update on public.preview_requests
for each row execute function public.audit_preview_request_operator();

alter table public.preview_requests enable row level security;
create policy preview_requests_owner_read on public.preview_requests
  for select using (principal_id = auth.uid());
create policy preview_requests_owner_insert on public.preview_requests
  for insert with check (principal_id = auth.uid());
-- No update or delete policy exists: a captured request is client-append-only.

revoke all on table public.preview_requests from public, anon, authenticated;
grant select, insert on public.preview_requests to authenticated;
grant all privileges on table public.preview_requests to service_role;
revoke all on function public.enforce_preview_request_ownership() from public, anon, authenticated;
revoke all on function public.audit_preview_request_captured() from public, anon, authenticated;
revoke all on function public.audit_preview_request_operator() from public, anon, authenticated;
