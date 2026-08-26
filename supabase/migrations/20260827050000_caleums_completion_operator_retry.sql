-- Atomic service-only completion paths for paid Shopify orders and operator
-- retries. Browser roles cannot invoke either function.

create or replace function public.complete_shopify_order(
  p_quote_id uuid,
  p_shopify_order_id text,
  p_delivery_id text
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes;
  v_order public.orders;
  v_created boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(p_shopify_order_id, '') is null or nullif(p_delivery_id, '') is null then
    raise exception 'Shopify order and delivery IDs required' using errcode = '22023';
  end if;
  select * into v_quote from public.quotes
    where id = p_quote_id and status = 'accepted'
    for update;
  if not found then
    raise exception 'accepted quote not found' using errcode = 'P0002';
  end if;
  select * into v_order from public.orders where quote_id = p_quote_id for update;
  if found and v_order.shopify_order_id is distinct from p_shopify_order_id then
    raise exception 'quote already completed by another Shopify order' using errcode = '23505';
  end if;
  if not found then
    insert into public.orders(
      design_id, revision_id, quote_id, owner_principal_id, status,
      checkout_status, accepted_total, shopify_draft_order_id,
      shopify_order_id, accepted_at
    ) values (
      v_quote.design_id, v_quote.revision_id, v_quote.id,
      v_quote.owner_principal_id, 'confirmed', 'completed', v_quote.total,
      v_quote.shopify_draft_order_id, p_shopify_order_id, now()
    )
    on conflict (quote_id) do nothing
    returning * into v_order;
    if found then v_created := true; end if;
    if not found then
      select * into v_order from public.orders where quote_id = p_quote_id for update;
    end if;
  end if;
  update public.quotes set checkout_status = 'completed'
    where id = v_quote.id;
  update public.designs set status = 'ordered'
    where id = v_quote.design_id and owner_principal_id = v_quote.owner_principal_id;
  if v_created then
    insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
      values (
        v_quote.design_id, v_quote.owner_principal_id, 'webhook',
        'shopify.order_completed',
        jsonb_build_object('quoteId', v_quote.id, 'orderId', v_order.id,
          'shopifyOrderId', p_shopify_order_id, 'deliveryId', p_delivery_id)
      );
  end if;
  return v_order;
end;
$$;

create or replace function public.operator_retry_generation_task(
  p_task_id uuid,
  p_retry_key text,
  p_reason text default null
) returns public.generation_tasks
language plpgsql security definer set search_path = '' as $$
declare
  v_task public.generation_tasks;
  v_design_id uuid;
  v_outbox_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(p_retry_key, '') is null then
    raise exception 'retry key required' using errcode = '22023';
  end if;
  select * into v_task from public.generation_tasks
    where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  select design_id into v_design_id from public.generation_runs where id = v_task.run_id;
  v_outbox_key := 'operator-retry:' || p_task_id || ':' || p_retry_key;
  if exists (select 1 from public.outbox_events where dispatch_idempotency_key = v_outbox_key) then
    return v_task;
  end if;
  if v_task.status not in ('failed', 'blocked') then
    raise exception 'task cannot be retried' using errcode = 'P0001';
  end if;
  if v_task.attempt >= 3 then
    raise exception 'provider attempt budget exhausted' using errcode = 'P0001';
  end if;
  insert into public.outbox_events(
    aggregate_type, aggregate_id, event_type, payload, dispatch_idempotency_key
  ) values (
    'task', p_task_id, 'studio.operator_retry_requested',
    jsonb_build_object('taskId', p_task_id), v_outbox_key
  );
  update public.generation_tasks set status = 'retrying', terminal_error_code = null
    where id = p_task_id returning * into v_task;
  update public.generation_runs set status = 'queued', operator_review_reason = null
    where id = v_task.run_id;
  insert into public.audit_events(design_id, principal_id, actor_type, action, detail)
    values (
      v_design_id, v_task.owner_principal_id, 'operator',
      'task.operator_retry_requested',
      jsonb_build_object('taskId', p_task_id, 'retryKey', p_retry_key,
        'reason', left(p_reason, 300), 'attempt', v_task.attempt,
        'budgetOverride', false)
    );
  return v_task;
end;
$$;

revoke all on function public.complete_shopify_order(uuid,text,text) from public, anon, authenticated;
revoke all on function public.operator_retry_generation_task(uuid,text,text) from public, anon, authenticated;
grant execute on function public.complete_shopify_order(uuid,text,text) to service_role;
grant execute on function public.operator_retry_generation_task(uuid,text,text) to service_role;
