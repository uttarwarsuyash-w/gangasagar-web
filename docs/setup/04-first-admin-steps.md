# 4. First admin steps

Open `https://gangasagar.pages.dev/en/` and tap **Sign in** at the top right (on a phone it is the arrow icon).
Choose one of the admin Google accounts (`uttarwarsuyash@gmail.com` or `lguttarwar1974.11@gmail.com`).
An **Admin** link appears in the header. **Sign out** is next to it.

## 1. Nanded pincodes (Supabase)

Delivery inside Nanded is offered only for pincodes in the `delivery_areas` table.
Any pincode not listed counts as *outside Nanded* (courier or transport, paid by UPI first).

In Supabase **SQL Editor**, add every pincode you deliver to, one line each, with the area name:

```sql
insert into public.delivery_areas (pincode, area) values
  ('431602', 'area name'),
  ('431601', 'area name');
```

Or use **Table Editor → delivery_areas → Insert row**.

## 2. UPI ID and QR code (Supabase)

Outside-Nanded customers pay by UPI after you confirm their order. Until this is set, they see
"Our UPI details will appear here soon. Please call or WhatsApp us."

1. QR image: **Storage → public-images → Upload file** (a PNG or JPG of your UPI QR).
   Click the file → **Get URL** and copy it.
2. In **SQL Editor** (replace both values):

```sql
update public.site_settings
   set value = jsonb_build_object('upi_id', 'yourname@bank', 'upi_qr_url', 'https://…/your-qr.png')
 where key = 'payment';
```

## 3. Categories (website admin)

**Admin → Categories → Add category.** English name, Hindi name, web address name (slug, e.g. `dry-fruits`).

## 4. Products and stock (website admin)

1. **Admin → Products → New product.** Names and descriptions in English and Hindi, category, photos. **Save**.
2. Add each size or pack as a **variant**: label (e.g. `500 g`), net weight in grams, price, and minimum stock.
   For loose items, tick *Sold loose by weight* and set the minimum and step in grams.
3. **Admin → Inventory → Change stock → Incoming (new stock)** to enter the stock you have.

## 5. Publish

Redeploy in Cloudflare (guide 3, *Redeploy after adding products*). The products now show in the shop.

## Check everything works (on a phone)

1. As admin: add a category, a product with two variants, stock, and the UPI ID. Redeploy.
2. Tap **Sign out**, then sign in again with another Google account (the customer). Add items, choose **Deliver to my address**, enter `431602`,
   and check the delivery charge: ₹89 under 2 kg, ₹49 from 2 kg, and free when the items come to ₹499 or more.
   Place the order.
3. As admin: **Admin → Orders** → open the order → **Confirm order** → **Record payment** →
   move it step by step to **Delivered** → **Send WhatsApp update**.
