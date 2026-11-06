-- Public image bucket: anyone can read, only admins can write.

insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do update set public = true;

create policy public_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-images');

create policy public_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-images' and public.is_admin());

create policy public_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'public-images' and public.is_admin())
  with check (bucket_id = 'public-images' and public.is_admin());

create policy public_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-images' and public.is_admin());
