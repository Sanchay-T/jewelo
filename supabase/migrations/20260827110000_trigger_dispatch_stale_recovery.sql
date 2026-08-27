-- Immediate Trigger dispatch remains backed by the durable outbox. Leases make
-- the request-path dispatcher and scheduled recovery dispatcher race safely.

alter table public.outbox_events
  add column lease_id uuid,
  add column trigger_run_id text,
  add column task_identifier text;

create index outbox_dispatch_lease_expiry
  on public.outbox_events(locked_at)
  where state = 'dispatching';

create or replace function public.claim_outbox_event(
  p_event_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer
)
returns setof public.outbox_events
language plpgsql
security definer
set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if p_event_id is null or p_lease_id is null
    or p_lease_seconds < 15 or p_lease_seconds > 900 then
    raise exception 'invalid outbox lease' using errcode = '22023';
  end if;

  return query
  update public.outbox_events oe set
    state = 'dispatching',
    lease_id = p_lease_id,
    locked_at = now(),
    attempt_count = oe.attempt_count + 1,
    last_error = null,
    task_identifier = case
      when oe.payload->>'operation' = 'video_poll' then 'video-poll-v1'
      when oe.payload->>'taskKind' = 'video' then 'video-submit-v1'
      else 'presentation-task-v1'
    end
  where oe.id = p_event_id
    and oe.published_at is null
    and (
      (oe.state in ('pending', 'failed') and oe.available_at <= now())
      or (
        oe.state = 'dispatching'
        and oe.locked_at < now() - make_interval(secs => p_lease_seconds)
      )
    )
  returning oe.*;
end $$;

create or replace function public.ack_outbox_event(
  p_event_id uuid,
  p_lease_id uuid,
  p_trigger_run_id text
)
returns void
language plpgsql
security definer
set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(trim(p_trigger_run_id), '') is null then
    raise exception 'Trigger run id required' using errcode = '22023';
  end if;

  update public.outbox_events set
    state = 'published',
    trigger_run_id = left(p_trigger_run_id, 200),
    published_at = now(),
    locked_at = null,
    lease_id = null,
    last_error = null
  where id = p_event_id and state = 'dispatching' and lease_id = p_lease_id;

  if not found then
    raise exception 'outbox lease lost' using errcode = '40001';
  end if;
end $$;

create or replace function public.nack_outbox_event(
  p_event_id uuid,
  p_lease_id uuid,
  p_error text,
  p_available_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(trim(p_error), '') is null or p_available_at is null
    or p_available_at > now() + interval '1 day' then
    raise exception 'invalid outbox failure' using errcode = '22023';
  end if;

  update public.outbox_events set
    state = 'failed',
    available_at = greatest(p_available_at, now()),
    locked_at = null,
    lease_id = null,
    last_error = left(p_error, 500)
  where id = p_event_id and state = 'dispatching' and lease_id = p_lease_id;

  if not found then
    raise exception 'outbox lease lost' using errcode = '40001';
  end if;
end $$;

-- The provider response has already been copied into private Jewelo storage,
-- but has not yet passed verification. It is immutable recovery evidence and
-- must never be exposed through browser RLS.
create table public.provider_output_checkpoints (
  task_id uuid not null references public.generation_tasks(id) on delete cascade,
  attempt integer not null check (attempt between 1 and 3),
  owner_principal_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'stored_unverified'
    check (state = 'stored_unverified'),
  bucket_id text not null check (bucket_id = 'generated-assets'),
  object_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  provider_request_id text,
  created_at timestamptz not null default now(),
  primary key (task_id, attempt),
  unique (bucket_id, object_path),
  foreign key (task_id, attempt)
    references public.provider_attempts(task_id, attempt),
  foreign key (task_id, owner_principal_id)
    references public.generation_tasks(id, owner_principal_id)
);

create trigger provider_output_checkpoints_immutable
before update or delete on public.provider_output_checkpoints
for each row execute function public.prevent_final_media_history_mutation();

alter table public.provider_output_checkpoints enable row level security;

-- Recover only phases whose next action cannot repeat a paid submission.
-- Ambiguous paid work is blocked and charged at its estimate until an operator
-- reconciles it. Submitted fal work with a request id is polled, not resubmitted.
create or replace function public.recover_stale_generation_tasks(
  p_stale_before timestamptz,
  p_limit integer default 100
)
returns table(task_id uuid, recovery_action text, outbox_id uuid)
language plpgsql
security definer
set search_path = '' as $$
#variable_conflict use_column
declare
  v_row record;
  v_event_id uuid;
  v_event_key text;
  v_charge integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if p_stale_before is null or p_stale_before > now()
    or p_limit < 1 or p_limit > 500 then
    raise exception 'invalid stale recovery window' using errcode = '22023';
  end if;

  for v_row in
    select
      t.*,
      r.design_id,
      pa.status as attempt_status,
      pa.provider as attempt_provider,
      pa.provider_request_id,
      pa.estimated_cost_cents as attempt_estimate,
      pa.completed_at as attempt_completed_at,
      pa.created_at as attempt_created_at,
      (cp.task_id is not null) as has_checkpoint
    from public.generation_tasks t
    join public.generation_runs r on r.id = t.run_id
    left join public.provider_attempts pa
      on pa.task_id = t.id and pa.attempt = t.attempt
    left join public.provider_output_checkpoints cp
      on cp.task_id = t.id and cp.attempt = t.attempt
    where t.updated_at < p_stale_before
      and t.status in ('queued', 'generating', 'verifying', 'retrying')
    order by t.updated_at, t.id
    limit p_limit
    for update of t skip locked
  loop
    v_event_id := null;
    v_event_key := 'recovery:' || v_row.id || ':attempt:' || v_row.attempt
      || ':stale:' || floor(extract(epoch from v_row.updated_at) * 1000000)::bigint;

    if v_row.has_checkpoint then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'provider_output.verification_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_poll' else 'still_execute' end,
          'recoveryPhase', 'stored_unverified', 'attempt', v_row.attempt
        ),
        v_event_key || ':verify'
      ) returning id into v_event_id;
      update public.generation_tasks set status = 'verifying', updated_at = now()
        where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_verification_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'verify_stored_output';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt_provider = 'fal'
      and v_row.attempt_status = 'submitted'
      and nullif(v_row.provider_request_id, '') is not null then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'video.poll_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id, 'taskKind', 'video',
          'operation', 'video_poll', 'attempt', v_row.attempt,
          'providerRequestId', v_row.provider_request_id, 'pollCount', 0
        ),
        v_event_key || ':video-poll'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_video_poll_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'providerRequestId', v_row.provider_request_id,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'video_poll';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt = 0 and v_row.status = 'queued' then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'task.dispatch_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end,
          'attempt', 0
        ),
        v_event_key || ':dispatch'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_dispatch_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', 0,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'dispatch';
      outbox_id := v_event_id; return next;

    elsif v_row.status = 'retrying'
      and v_row.attempt_status = 'failed'
      and v_row.attempt_completed_at is not null then
      insert into public.outbox_events(
        aggregate_type, aggregate_id, event_type, payload,
        dispatch_idempotency_key
      ) values (
        'task', v_row.id, 'task.retry_recovery',
        jsonb_build_object(
          'runId', v_row.run_id, 'taskId', v_row.id,
          'taskKind', case when v_row.provider_profile = 'video.fal' then 'video' else 'still' end,
          'operation', case when v_row.provider_profile = 'video.fal' then 'video_submit' else 'still_execute' end,
          'attempt', v_row.attempt
        ),
        v_event_key || ':retry'
      ) returning id into v_event_id;
      update public.generation_tasks set updated_at = now() where id = v_row.id;
      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_retry_recovered',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'outboxId', v_event_id, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'retry';
      outbox_id := v_event_id; return next;

    elsif v_row.attempt_status in ('reserved', 'submitted', 'ambiguous') then
      v_charge := greatest(coalesce(v_row.attempt_estimate, 0), 0);

      update public.provider_attempts set
        status = 'ambiguous',
        actual_cost_cents = coalesce(actual_cost_cents, v_charge),
        error_class = coalesce(error_class, 'stale_worker_ambiguous'),
        completed_at = coalesce(completed_at, now())
      where task_id = v_row.id and attempt = v_row.attempt
        and completed_at is null;

      if found then
        insert into public.principal_daily_usage(principal_id, usage_date)
        values (v_row.owner_principal_id, v_row.attempt_created_at::date)
        on conflict (principal_id, usage_date) do nothing;
        update public.principal_daily_usage set
          actual_spend_cents = actual_spend_cents + v_charge,
          reserved_spend_cents = greatest(0, reserved_spend_cents - v_charge)
        where principal_id = v_row.owner_principal_id
          and usage_date = v_row.attempt_created_at::date;
        update public.generation_runs set
          actual_spend_cents = actual_spend_cents + v_charge,
          reserved_spend_cents = greatest(0, reserved_spend_cents - v_charge),
          status = 'operator_review',
          operator_review_reason = 'stale_worker_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.run_id;
        update public.generation_tasks set
          reservation_cents = greatest(0, reservation_cents - v_charge),
          status = 'blocked', terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      else
        update public.generation_runs set status = 'operator_review',
          operator_review_reason = 'stale_worker_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.run_id;
        update public.generation_tasks set status = 'blocked',
          terminal_error_code = 'operator_review_ambiguous_paid_request',
          updated_at = now()
        where id = v_row.id;
      end if;

      insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (v_row.design_id, v_row.owner_principal_id, 'system',
        'task.stale_paid_request_blocked',
        jsonb_build_object('taskId', v_row.id, 'attempt', v_row.attempt,
          'provider', v_row.attempt_provider, 'providerRequestId', v_row.provider_request_id,
          'conservativeCostCents', v_charge, 'paidRequestRepeated', false));
      task_id := v_row.id; recovery_action := 'operator_review';
      outbox_id := null; return next;
    end if;
  end loop;
end $$;

revoke all on table public.provider_output_checkpoints
  from public, anon, authenticated;
grant all privileges on table public.provider_output_checkpoints to service_role;

revoke all on function public.claim_outbox_event(uuid,uuid,integer)
  from public, anon, authenticated;
revoke all on function public.ack_outbox_event(uuid,uuid,text)
  from public, anon, authenticated;
revoke all on function public.nack_outbox_event(uuid,uuid,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.recover_stale_generation_tasks(timestamptz,integer)
  from public, anon, authenticated;
grant execute on function public.claim_outbox_event(uuid,uuid,integer)
  to service_role;
grant execute on function public.ack_outbox_event(uuid,uuid,text)
  to service_role;
grant execute on function public.nack_outbox_event(uuid,uuid,text,timestamptz)
  to service_role;
grant execute on function public.recover_stale_generation_tasks(timestamptz,integer)
  to service_role;
