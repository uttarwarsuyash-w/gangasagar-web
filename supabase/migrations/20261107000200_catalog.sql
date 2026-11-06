-- Catalogue: categories, products, variants (with private stock), stock movements.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.categories (id) on delete set null,
  name_en text not null,
  name_hi text,
  image_url text,
  sort integer not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id uuid references public.categories (id) on delete set null,
  brand text,
  name_en text not null,
  name_hi text,
  description_en text,
  description_hi text,
  images text[] not null default '{}',
  seo_title_en text,
  seo_title_hi text,
  seo_description_en text,
  seo_description_hi text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- Loose variants: retail_price is per kg, net_weight_g = 1000, stock_unit = 'kg'.
create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label_en text not null,
  label_hi text,
  net_weight_g integer not null check (net_weight_g > 0),
  pack_type text,
  retail_price numeric(10,2) not null check (retail_price > 0),
  mrp numeric(10,2) check (mrp is null or mrp > 0),
  sale_price numeric(10,2) check (sale_price is null or (sale_price > 0 and sale_price < retail_price)),
  sale_ends_at timestamptz,
  is_loose boolean not null default false,
  loose_min_g integer,
  loose_step_g integer,
  stock_qty numeric(12,3) not null default 0 check (stock_qty >= 0),
  stock_unit text not null default 'packs' check (stock_unit in ('packs', 'kg')),
  min_stock numeric(12,3),
  limited_below numeric(12,3),
  is_active boolean not null default true,
  sort integer not null default 0,
  constraint variants_loose_shape check (
    not is_loose or (
      net_weight_g = 1000 and stock_unit = 'kg'
      and loose_step_g > 0 and loose_min_g >= loose_step_g and loose_min_g % loose_step_g = 0
    )
  ),
  constraint variants_pack_shape check (is_loose or stock_unit = 'packs')
);
create index variants_product_idx on public.variants (product_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  kind text not null check (kind in ('incoming','sale','damaged','expired','adjustment','cancellation_return')),
  qty numeric(12,3) not null,
  note text,
  order_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);

-- Row-level security and grants.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.stock_movements enable row level security;

revoke all on public.categories, public.products, public.variants, public.stock_movements from anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select, insert, update, delete on public.variants to authenticated;
grant select on public.stock_movements to authenticated;

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin_insert on public.categories for insert to authenticated
  with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated
  using (public.is_admin());

create policy products_read on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy products_admin_insert on public.products for insert to authenticated
  with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated
  using (public.is_admin());

create policy variants_admin_all on public.variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy stock_movements_admin_read on public.stock_movements for select to authenticated
  using (public.is_admin());

-- Public stock label. Customers only ever see one of these three strings.
create or replace function public.stock_label(
  p_qty numeric, p_limited_below numeric, p_is_loose boolean, p_loose_min_g integer
) returns text
language sql
immutable
as $$
  select case
    when p_qty <= 0 then 'Out of Stock'
    when p_is_loose and p_qty * 1000 < coalesce(p_loose_min_g, 0) then 'Out of Stock'
    when p_limited_below is not null and p_qty < p_limited_below then 'Limited Stock'
    else 'Available'
  end
$$;

create or replace function public.effective_price(
  p_retail numeric, p_sale numeric, p_sale_ends_at timestamptz
) returns numeric
language sql
stable
as $$
  select case
    when p_sale is not null and p_sale_ends_at is not null and p_sale_ends_at > now() then p_sale
    else p_retail
  end
$$;

-- Public view: active variants of active products, without stock numbers.
-- Owned by the migration role, so it reads variants without the caller's RLS.
create view public.variant_public as
  select
    v.id,
    v.product_id,
    v.label_en,
    v.label_hi,
    v.net_weight_g,
    v.pack_type,
    public.effective_price(v.retail_price, v.sale_price, v.sale_ends_at) as price,
    v.mrp,
    v.retail_price,
    v.sale_ends_at,
    v.is_loose,
    v.loose_min_g,
    v.loose_step_g,
    public.stock_label(v.stock_qty, v.limited_below, v.is_loose, v.loose_min_g) as stock_label,
    v.sort
  from public.variants v
  join public.products p on p.id = v.product_id
  where v.is_active and p.is_active;

revoke all on public.variant_public from anon, authenticated;
grant select on public.variant_public to anon, authenticated;

-- Admin stock adjustment. Sales and cancellation returns come only from order functions.
create or replace function public.admin_adjust_stock(
  p_variant uuid, p_kind text, p_qty numeric, p_note text
) returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current numeric;
  v_delta numeric;
  v_new numeric;
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  if p_kind is null or p_kind not in ('incoming', 'damaged', 'expired', 'adjustment') then
    raise exception 'invalid_kind';
  end if;
  if p_qty is null or p_qty = 0 or (p_kind <> 'adjustment' and p_qty < 0) then
    raise exception 'invalid_quantity';
  end if;

  select stock_qty into v_current from public.variants where id = p_variant for update;
  if not found then
    raise exception 'not_found';
  end if;

  v_delta := case when p_kind in ('damaged', 'expired') then -p_qty else p_qty end;
  v_new := v_current + v_delta;
  if v_new < 0 then
    raise exception 'insufficient_stock';
  end if;

  update public.variants set stock_qty = v_new where id = p_variant;
  insert into public.stock_movements (variant_id, kind, qty, note, created_by)
  values (p_variant, p_kind, v_delta, nullif(trim(p_note), ''), auth.uid());
  return v_new;
end;
$$;
revoke all on function public.admin_adjust_stock(uuid, text, numeric, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, text, numeric, text) to authenticated;
