-- Keep Shopify delivery deduplication and paid-order completion in one
-- transaction so a transient failure remains eligible for redelivery.

alter table public.webhook_deliveries
  add column if not exists topic text,
  add column if not exists shop_domain text,
  add column if not exists last_error text;

alter table public.quotes
  add column if not exists checkout_claimed_at timestamptz;

create or replace function public.reserve_shopify_checkout(
  p_quote_id uuid,
  p_owner_principal_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes;
  v_reconciliation boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  select * into v_quote from public.quotes
    where id = p_quote_id and owner_principal_id = p_owner_principal_id
    for update;
  if not found then raise exception 'quote not found' using errcode = 'P0002'; end if;
  if v_quote.status <> 'accepted' or v_quote.expires_at <= now() then
    raise exception 'accepted, unexpired quote required' using errcode = 'P0001';
  end if;
  if v_quote.checkout_idempotency_key <> p_idempotency_key then
    raise exception 'checkout idempotency key mismatch' using errcode = '22023';
  end if;
  if v_quote.shopify_draft_order_id is not null then
    return jsonb_build_object('reserved', false, 'reconciliation', false);
  end if;
  if v_quote.checkout_status = 'not_created' then
    update public.quotes set
      checkout_status = 'draft', checkout_claimed_at = now()
      where id = v_quote.id;
  elsif v_quote.checkout_status = 'draft' and
      coalesce(v_quote.checkout_claimed_at, '-infinity'::timestamptz)
        <= now() - interval '2 minutes' then
    v_reconciliation := true;
    update public.quotes set checkout_claimed_at = now()
      where id = v_quote.id;
  else
    return jsonb_build_object('reserved', false, 'reconciliation', false);
  end if;
  return jsonb_build_object(
    'reserved', true, 'reconciliation', v_reconciliation
  );
end;
$$;

create or replace function public.ingest_shopify_paid_webhook(
  p_delivery_id text,
  p_payload_sha256 text,
  p_shop_domain text,
  p_quote_id uuid,
  p_shopify_order_id text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_delivery public.webhook_deliveries;
  v_order public.orders;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  if nullif(p_delivery_id, '') is null or nullif(p_payload_sha256, '') is null then
    raise exception 'delivery ID and payload hash required' using errcode = '22023';
  end if;

  insert into public.webhook_deliveries(
    provider, delivery_id, payload_sha256, topic, shop_domain
  ) values (
    'shopify', p_delivery_id, p_payload_sha256, 'orders/paid', p_shop_domain
  ) on conflict (provider, delivery_id) do nothing;
  select * into strict v_delivery from public.webhook_deliveries
    where provider = 'shopify' and delivery_id = p_delivery_id
    for update;
  if v_delivery.payload_sha256 <> p_payload_sha256 then
    raise exception 'Shopify delivery ID reused with a different payload'
      using errcode = '23505';
  end if;
  if v_delivery.processed_at is not null then
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end if;

  select * into v_order from public.complete_shopify_order(
    p_quote_id, p_shopify_order_id, p_delivery_id
  );

  update public.webhook_deliveries
    set processed_at = now(), last_error = null
    where provider = 'shopify' and delivery_id = p_delivery_id;

  return jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'orderId', v_order.id
  );
end;
$$;

create or replace function public.record_shopify_webhook_incident(
  p_delivery_id text,
  p_payload_sha256 text,
  p_shop_domain text,
  p_topic text,
  p_reason text,
  p_shopify_order_id text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_delivery public.webhook_deliveries;
  v_inserted boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '28000';
  end if;
  insert into public.webhook_deliveries(
    provider, delivery_id, payload_sha256, topic, shop_domain, last_error,
    processed_at
  ) values (
    'shopify', p_delivery_id, p_payload_sha256, p_topic, p_shop_domain,
    left(p_reason, 500), now()
  ) on conflict (provider, delivery_id) do nothing
    returning * into v_delivery;
  v_inserted := found;
  if not v_inserted then
    select * into strict v_delivery from public.webhook_deliveries
      where provider = 'shopify' and delivery_id = p_delivery_id
      for update;
    if v_delivery.payload_sha256 <> p_payload_sha256 then
      raise exception 'Shopify delivery ID reused with a different payload'
        using errcode = '23505';
    end if;
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end if;
  insert into public.audit_events(actor_type, action, detail)
    values (
      'webhook', 'shopify.webhook_incident',
      jsonb_build_object(
        'deliveryId', p_delivery_id,
        'topic', p_topic,
        'shopDomain', p_shop_domain,
        'reason', left(p_reason, 500),
        'shopifyOrderId', p_shopify_order_id
      )
    );
  return jsonb_build_object('accepted', true, 'duplicate', false, 'incident', true);
end;
$$;

revoke all on function public.ingest_shopify_paid_webhook(text,text,text,uuid,text)
  from public, anon, authenticated;
revoke all on function public.record_shopify_webhook_incident(text,text,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.reserve_shopify_checkout(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.ingest_shopify_paid_webhook(text,text,text,uuid,text)
  to service_role;
grant execute on function public.record_shopify_webhook_incident(text,text,text,text,text,text)
  to service_role;
grant execute on function public.reserve_shopify_checkout(uuid,uuid,text)
  to service_role;
