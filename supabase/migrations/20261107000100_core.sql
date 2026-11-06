-- Core: admin allowlist, profiles, site settings.


-- Admin allowlist (emails, lower case). Never exposed to the API roles.
create table public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Admins must have signed up with Google: an email/password sign-up using an admin's
  -- address (possible if someone turns off email confirmation) never becomes an admin.
  select coalesce(auth.jwt()->'app_metadata'->>'provider', '') = 'google'
     and exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt()->>'email', ''))
  )
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Profiles, one per signed-in user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  whatsapp text,
  promo_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, whatsapp, promo_opt_in) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data->>'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Site settings: public key/value configuration. Everyone reads, admins write.
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

create policy site_settings_read on public.site_settings
  for select to anon, authenticated
  using (true);

create policy site_settings_admin_insert on public.site_settings
  for insert to authenticated
  with check (public.is_admin());

create policy site_settings_admin_update on public.site_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy site_settings_admin_delete on public.site_settings
  for delete to authenticated
  using (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_updated_at();
