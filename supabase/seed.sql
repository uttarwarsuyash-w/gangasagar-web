-- Seed data: verified facts only. Unknown values stay null for the owners to fill in.

insert into public.admins (email) values
  ('uttarwarsuyash@gmail.com'),
  ('lguttarwar1974.11@gmail.com')
on conflict do nothing;

insert into public.site_settings (key, value) values
  ('business', jsonb_build_object(
    'name', 'Gangasagar',
    'tagline', null,
    'established', 2005,
    'address', null,
    'maps_url', null,
    'hours', jsonb_build_object('open', '08:00', 'close', '20:00', 'days', 'daily')
  )),
  ('contact', jsonb_build_object(
    'phones', jsonb_build_array(
      jsonb_build_object('number', '9403951524', 'label', 'main', 'whatsapp', true),
      jsonb_build_object('number', '9372188080', 'label', 'support', 'whatsapp', true),
      jsonb_build_object('number', '9272103080', 'label', 'Gangadhar ji', 'whatsapp', false)
    ),
    'whatsapp', jsonb_build_array('9403951524', '9372188080'),
    'emails', jsonb_build_array(),
    'instagram_url', null
  )),
  ('delivery', jsonb_build_object(
    'nanded_free_min_value', 499,
    'nanded_light_fee', 89,
    'nanded_heavy_fee', 49,
    'nanded_heavy_min_g', 2000,
    'outside_fee', 179,
    'quotation_min_g', 20000
  )),
  ('quantities', jsonb_build_object(
    'loose_min_g', 250,
    'loose_step_g', 250,
    'custom_min_g', 500
  )),
  ('payment', jsonb_build_object('upi_id', null, 'upi_qr_url', null))
on conflict (key) do nothing;
