-- Fix review 3, MJ-1: an operator note left no trace.
--
-- `POST /api/operator/commands` stopped writing its own audit row for preview
-- request commands and leaned on `preview_requests_operator_audit`
-- (`20260907010000_preview_requests.sql:95-118`), but that trigger fires only
-- on a status change. `preview_request.note` writes `operator_note` alone, so
-- the shop could rewrite the note on a customer's request and the trail stayed
-- silent about it.
--
-- The trigger now also reports a note change, in the same shape and with the
-- same rule: only where something actually changed. The note text is operator
-- prose about a named customer, so it never enters the audit detail; only
-- whether a note was there before and whether one is there now.
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
  if new.operator_note is distinct from old.operator_note then
    insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (
      new.design_id,
      null,
      'operator',
      'preview_request.note_changed',
      jsonb_build_object(
        'previewRequestId', new.id,
        'principalId', new.principal_id,
        'hadNote', old.operator_note is not null,
        'hasNote', new.operator_note is not null
      )
    );
  end if;
  return null;
end $$;
revoke all on function public.audit_preview_request_operator() from public, anon, authenticated;
