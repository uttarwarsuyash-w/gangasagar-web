-- Delivery areas and server-side cart pricing. The browser never computes a fee or total.

create table public.delivery_areas (
  pincode char(6) not null check (pincode ~ '^[0-9]{6}$'),
  area text not null,
  is_nanded boolean not null default true,
  primary key (pincode, area)
);
alter table public.delivery_areas enable row level security;
revoke all on public.delivery_areas from anon, authenticated;
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;

create policy delivery_areas_read on public.delivery_areas for select to anon, authenticated using (true);
create policy delivery_areas_admin_insert on public.delivery_areas for insert to authenticated
  with check (public.is_admin());
create policy delivery_areas_admin_update on public.delivery_areas for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy delivery_areas_admin_delete on public.delivery_areas for delete to authenticated
  using (public.is_admin());

create or replace function public.normalize_pincode(p text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') ~ '^[0-9]{6}$'
      then regexp_replace(p, '[^0-9]', '', 'g')
    else null
  end
$$;
grant execute on function public.normalize_pincode(text) to anon, authenticated;

-- Items: [{"variant_id": uuid, "qty": int}] for packs, [{"variant_id": uuid, "grams": int}] for loose.
-- Fulfilment: pickup | delivery (Nanded only) | courier | transport (outside only).
create or replace function public.price_cart(p_items jsonb, p_pincode text, p_fulfilment text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery jsonb;
  v_quantities jsonb;
  v_item jsonb;
  v_row record;
  v_lines jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_weight integer := 0;
  v_subtotal numeric(10,2) := 0;
  v_zone text := null;
  v_fee numeric(10,2) := null;
  v_total numeric(10,2) := null;
  v_quote boolean := false;
  v_pin text;
  v_id_text text;
  v_id uuid;
  v_qty numeric;
  v_grams numeric;
  v_min integer;
  v_step integer;
  v_unit numeric(10,2);
  v_line_total numeric(10,2);
  v_line_weight integer;
  v_ok boolean;
begin
  select value into v_delivery from public.site_settings where key = 'delivery';
  select value into v_quantities from public.site_settings where key = 'quantities';

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object(
      'lines', '[]'::jsonb, 'weight_g', 0, 'subtotal', 0, 'zone', null, 'delivery_fee', null,
      'total', null, 'requires_quotation', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'empty_cart')));
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_id_text := v_item->>'variant_id';
    v_id := case when v_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 then v_id_text::uuid else null end;
    v_qty := case when jsonb_typeof(v_item->'qty') = 'number' then (v_item->>'qty')::numeric end;
    v_grams := case when jsonb_typeof(v_item->'grams') = 'number' then (v_item->>'grams')::numeric end;

    select vp.*, p.name_en, p.name_hi
      into v_row
      from public.variant_public vp
      join public.products p on p.id = vp.product_id
     where vp.id = v_id;

    if not found then
      v_errors := v_errors || jsonb_build_object('code', 'unavailable', 'variant_id', v_id_text);
      v_lines := v_lines || jsonb_build_object(
        'variant_id', v_id_text, 'name_en', null, 'name_hi', null, 'label_en', null, 'label_hi', null,
        'qty', v_qty, 'grams', v_grams, 'unit_price', null, 'line_total', null, 'weight_g', 0,
        'stock_label', null);
      continue;
    end if;

    v_ok := true;
    v_min := null;
    v_step := null;
    if v_row.is_loose then
      v_min := coalesce(v_row.loose_min_g, (v_quantities->>'loose_min_g')::int, 250);
      v_step := coalesce(v_row.loose_step_g, (v_quantities->>'loose_step_g')::int, 250);
    end if;
    if v_row.stock_label = 'Out of Stock' then
      v_errors := v_errors || jsonb_build_object('code', 'unavailable', 'variant_id', v_id_text);
      v_ok := false;
    elsif v_row.is_loose then
      if v_qty is not null or v_grams is null or v_grams <> trunc(v_grams)
         or v_grams < v_min or (v_grams::int % v_step) <> 0 then
        v_errors := v_errors || jsonb_build_object('code', 'invalid_quantity', 'variant_id', v_id_text);
        v_ok := false;
      end if;
    else
      if v_grams is not null or v_qty is null or v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > 999 then
        v_errors := v_errors || jsonb_build_object('code', 'invalid_quantity', 'variant_id', v_id_text);
        v_ok := false;
      end if;
    end if;

    v_unit := v_row.price;
    if v_ok then
      if v_row.is_loose then
        v_line_total := round(v_unit * v_grams / 1000, 2);
        v_line_weight := v_grams::int;
      else
        v_line_total := round(v_unit * v_qty, 2);
        v_line_weight := v_row.net_weight_g * v_qty::int;
      end if;
      v_subtotal := v_subtotal + v_line_total;
      v_weight := v_weight + v_line_weight;
    else
      v_line_total := null;
      v_line_weight := 0;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'variant_id', v_row.id, 'name_en', v_row.name_en, 'name_hi', v_row.name_hi,
      'label_en', v_row.label_en, 'label_hi', v_row.label_hi,
      'qty', case when v_row.is_loose then null else v_qty end,
      'grams', case when v_row.is_loose then v_grams else null end,
      'unit_price', v_unit, 'line_total', v_line_total, 'weight_g', v_line_weight,
      'stock_label', v_row.stock_label, 'is_loose', v_row.is_loose,
      'loose_min_g', v_min, 'loose_step_g', v_step);
  end loop;

  -- Zone and fulfilment.
  if p_fulfilment = 'pickup' then
    v_zone := null;
  elsif p_fulfilment in ('delivery', 'courier', 'transport') then
    v_pin := public.normalize_pincode(p_pincode);
    if v_pin is null then
      v_errors := v_errors || jsonb_build_object('code', 'invalid_pincode');
    else
      v_zone := case when exists (
        select 1 from public.delivery_areas d where d.pincode = v_pin and d.is_nanded
      ) then 'nanded' else 'outside' end;
      if (p_fulfilment = 'delivery' and v_zone <> 'nanded')
         or (p_fulfilment in ('courier', 'transport') and v_zone <> 'outside') then
        v_errors := v_errors || jsonb_build_object('code', 'invalid_fulfilment');
      end if;
    end if;
  else
    v_errors := v_errors || jsonb_build_object('code', 'invalid_fulfilment');
  end if;

  v_quote := v_weight >= coalesce((v_delivery->>'quotation_min_g')::int, 20000);

  if jsonb_array_length(v_errors) = 0 and not v_quote then
    if p_fulfilment = 'pickup' then
      v_fee := 0;
    elsif v_zone = 'nanded' then
      if v_subtotal >= (v_delivery->>'nanded_free_min_value')::numeric then
        v_fee := 0;
      elsif v_weight < (v_delivery->>'nanded_heavy_min_g')::int then
        v_fee := (v_delivery->>'nanded_light_fee')::numeric;
      else
        v_fee := (v_delivery->>'nanded_heavy_fee')::numeric;
      end if;
    else
      v_fee := (v_delivery->>'outside_fee')::numeric;
    end if;
    v_total := v_subtotal + v_fee;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'weight_g', v_weight,
    'subtotal', v_subtotal,
    'zone', v_zone,
    'delivery_fee', v_fee,
    'total', v_total,
    'requires_quotation', v_quote,
    'errors', v_errors);
end;
$$;
revoke all on function public.price_cart(jsonb, text, text) from public;
grant execute on function public.price_cart(jsonb, text, text) to anon, authenticated;
