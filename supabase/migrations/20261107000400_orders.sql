-- Orders: placement, confirmation (stock deduction), payment and status flow.
-- Customers only read their own rows; every write goes through these functions.

create sequence public.order_number_seq;
create sequence public.invoice_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references auth.users (id),
  client_request_id uuid not null,
  status text not null default 'Order Placed' check (status in (
    'Order Placed','Order Confirmed','Processing','Dispatched','Out for Delivery','Delivered','Cancelled')),
  zone text check (zone in ('nanded', 'outside')),
  fulfilment text not null check (fulfilment in ('pickup', 'delivery', 'courier', 'transport')),
  address jsonb,
  pincode char(6),
  weight_g integer not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null check (payment_method in ('cash', 'upi_on_delivery', 'upi_prepaid')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'submitted', 'paid')),
  upi_reference text,
  customer_note text,
  invoice_number text unique,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  unique (user_id, client_request_id)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.variants (id) on delete restrict,
  product_name_en text,
  product_name_hi text,
  label_en text,
  label_hi text,
  qty integer,
  grams integer,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  weight_g integer not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default clock_timestamp()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

alter table public.stock_movements
  add constraint stock_movements_order_fk foreign key (order_id) references public.orders (id) on delete set null;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

revoke all on public.orders, public.order_items, public.order_status_history from anon, authenticated;
revoke all on sequence public.order_number_seq, public.invoice_number_seq from anon, authenticated;
grant select on public.orders, public.order_items, public.order_status_history to authenticated;

create policy orders_read on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_status_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create or replace function public.ist_yymm() returns text
language sql stable
as $$ select to_char(now() at time zone 'Asia/Kolkata', 'YYMM') $$;

-- place_order -----------------------------------------------------------------
create or replace function public.place_order(
  p_client_request_id uuid,
  p_items jsonb,
  p_pincode text,
  p_fulfilment text,
  p_payment_method text,
  p_address jsonb,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_price jsonb;
  v_zone text;
  v_line jsonb;
  v_address jsonb;
  v_pin text;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_client_request_id is null then
    raise exception 'invalid_request';
  end if;

  select id into v_id from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
  if found then
    return v_id;
  end if;

  v_price := public.price_cart(p_items, p_pincode, p_fulfilment);
  if jsonb_array_length(v_price->'errors') > 0 then
    raise exception '%', v_price->'errors'->0->>'code';
  end if;
  if (v_price->>'requires_quotation')::boolean then
    raise exception 'quotation_required';
  end if;

  v_zone := v_price->>'zone';
  if v_zone = 'outside' then
    if p_payment_method is distinct from 'upi_prepaid' then
      raise exception 'invalid_payment_method';
    end if;
  elsif p_payment_method is null or p_payment_method not in ('cash', 'upi_on_delivery') then
    raise exception 'invalid_payment_method';
  end if;

  -- Contact name and phone are always needed; the street address unless pickup.
  if p_address is null or jsonb_typeof(p_address) <> 'object'
     or coalesce(trim(p_address->>'name'), '') = ''
     or coalesce(p_address->>'phone', '') !~ '^[6-9][0-9]{9}$'
     or (p_fulfilment <> 'pickup' and (
           coalesce(trim(p_address->>'line1'), '') = '' or coalesce(trim(p_address->>'city'), '') = '')) then
    raise exception 'invalid_address';
  end if;
  v_pin := case when p_fulfilment = 'pickup' then null else public.normalize_pincode(p_pincode) end;
  v_address := jsonb_strip_nulls(jsonb_build_object(
    'name', trim(p_address->>'name'),
    'phone', p_address->>'phone',
    'line1', nullif(trim(p_address->>'line1'), ''),
    'line2', nullif(trim(p_address->>'line2'), ''),
    'landmark', nullif(trim(p_address->>'landmark'), ''),
    'city', nullif(trim(p_address->>'city'), ''),
    'state', nullif(trim(p_address->>'state'), ''),
    'pincode', v_pin));

  insert into public.orders (
    number, user_id, client_request_id, zone, fulfilment, address, pincode, weight_g,
    subtotal, delivery_fee, total, payment_method, customer_note)
  values (
    'GKS-' || public.ist_yymm() || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0'),
    v_uid, p_client_request_id, v_zone, p_fulfilment, v_address, v_pin,
    (v_price->>'weight_g')::int, (v_price->>'subtotal')::numeric,
    (v_price->>'delivery_fee')::numeric, (v_price->>'total')::numeric,
    p_payment_method, nullif(trim(left(p_note, 1000)), ''))
  on conflict (user_id, client_request_id) do nothing
  returning id into v_id;

  if v_id is null then
    -- A concurrent request with the same client_request_id won the race.
    select id into v_id from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
    return v_id;
  end if;

  for v_line in select * from jsonb_array_elements(v_price->'lines') loop
    insert into public.order_items (
      order_id, variant_id, product_name_en, product_name_hi, label_en, label_hi,
      qty, grams, unit_price, line_total, weight_g)
    values (
      v_id, (v_line->>'variant_id')::uuid, v_line->>'name_en', v_line->>'name_hi',
      v_line->>'label_en', v_line->>'label_hi', (v_line->>'qty')::int, (v_line->>'grams')::int,
      (v_line->>'unit_price')::numeric, (v_line->>'line_total')::numeric, (v_line->>'weight_g')::int);
  end loop;

  insert into public.order_status_history (order_id, status, changed_by) values (v_id, 'Order Placed', v_uid);
  return v_id;
end;
$$;
revoke all on function public.place_order(uuid, jsonb, text, text, text, jsonb, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, jsonb, text) to authenticated;

-- admin_confirm_order ---------------------------------------------------------
create or replace function public.admin_confirm_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item record;
  v_need numeric;
  v_have numeric;
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_order.status <> 'Order Placed' then
    raise exception 'invalid_transition';
  end if;

  -- Lock every variant first, in a fixed order, so two confirmations cannot interleave.
  perform 1 from public.variants
   where id in (select variant_id from public.order_items where order_id = p_order)
   order by id
   for update;

  for v_item in
    select oi.*, v.is_loose, v.stock_qty
      from public.order_items oi
      left join public.variants v on v.id = oi.variant_id
     where oi.order_id = p_order
     order by oi.variant_id
  loop
    if v_item.variant_id is null or v_item.stock_qty is null then
      raise exception 'unavailable';
    end if;
    v_need := case when v_item.grams is not null then v_item.grams / 1000.0 else v_item.qty end;
    select stock_qty into v_have from public.variants where id = v_item.variant_id;
    if v_have < v_need then
      raise exception 'insufficient_stock';
    end if;
    update public.variants set stock_qty = stock_qty - v_need where id = v_item.variant_id;
    insert into public.stock_movements (variant_id, kind, qty, order_id, created_by, note)
    values (v_item.variant_id, 'sale', -v_need, p_order, auth.uid(), v_order.number);
  end loop;

  update public.orders set status = 'Order Confirmed', confirmed_at = now() where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by)
  values (p_order, 'Order Confirmed', auth.uid());
end;
$$;
revoke all on function public.admin_confirm_order(uuid) from public, anon;
grant execute on function public.admin_confirm_order(uuid) to authenticated;

-- submit_payment_reference ----------------------------------------------------
create or replace function public.submit_payment_reference(p_order uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_ref text := trim(coalesce(p_reference, ''));
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or auth.uid() is null or v_order.user_id <> auth.uid() then
    raise exception 'not_allowed';
  end if;
  if v_order.zone is distinct from 'outside' or v_order.status <> 'Order Confirmed'
     or v_order.payment_status = 'paid' then
    raise exception 'invalid_state';
  end if;
  if v_ref !~ '^[A-Za-z0-9]{6,30}$' then
    raise exception 'invalid_reference';
  end if;
  update public.orders set payment_status = 'submitted', upi_reference = v_ref where id = p_order;
end;
$$;
revoke all on function public.submit_payment_reference(uuid, text) from public, anon;
grant execute on function public.submit_payment_reference(uuid, text) to authenticated;

-- admin_record_payment --------------------------------------------------------
create or replace function public.admin_record_payment(p_order uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_order.status = 'Cancelled' then
    raise exception 'invalid_state';
  end if;
  update public.orders
     set payment_status = 'paid',
         upi_reference = coalesce(nullif(trim(p_reference), ''), upi_reference)
   where id = p_order;
end;
$$;
revoke all on function public.admin_record_payment(uuid, text) from public, anon;
grant execute on function public.admin_record_payment(uuid, text) to authenticated;

-- admin_set_order_status ------------------------------------------------------
create or replace function public.admin_set_order_status(p_order uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_ok boolean;
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then
    raise exception 'not_found';
  end if;

  if v_order.fulfilment = 'pickup' then
    v_ok := (v_order.status, p_status) in (
      ('Order Confirmed', 'Processing'),
      ('Processing', 'Delivered'));
  else
    v_ok := (v_order.status, p_status) in (
      ('Order Confirmed', 'Processing'),
      ('Processing', 'Dispatched'),
      ('Dispatched', 'Out for Delivery'),
      ('Out for Delivery', 'Delivered'));
  end if;
  if not coalesce(v_ok, false) then
    raise exception 'invalid_transition';
  end if;

  if p_status = 'Processing' and v_order.zone = 'outside' and v_order.payment_status <> 'paid' then
    raise exception 'payment_required';
  end if;

  update public.orders
     set status = p_status,
         delivered_at = case when p_status = 'Delivered' then now() else delivered_at end,
         invoice_number = case when p_status = 'Delivered'
           then 'INV-' || public.ist_yymm() || '-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0')
           else invoice_number end
   where id = p_order;
  insert into public.order_status_history (order_id, status, changed_by, note)
  values (p_order, p_status, auth.uid(), nullif(trim(p_note), ''));
end;
$$;
revoke all on function public.admin_set_order_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;
