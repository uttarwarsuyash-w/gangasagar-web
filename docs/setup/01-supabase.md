# 1. Supabase (database and sign-in)

Supabase holds the products, stock, orders and customer sign-ins. The free plan is enough.
Do every step in your own Supabase account. Nobody else needs your passwords or keys.

## Create the project

1. Go to <https://supabase.com>, sign in (with GitHub or email) and click **New project**.
2. Organization: your own. Plan: **Free**.
3. Project name: `gangasagar`.
4. Database password: click **Generate a password** and save it in your password manager.
   You will not need it for the website. Do not send it to anyone.
5. Region: **South Asia (Mumbai)**. It is the closest to Nanded, so the shop feels fast.
6. Click **Create new project** and wait 1–2 minutes until the dashboard opens.

## Create the tables (one paste)

1. Open the repository on GitHub and open the file `supabase/apply-all.sql`.
   Click **Raw**, then select all (Ctrl+A) and copy (Ctrl+C).
2. In Supabase, open **SQL Editor** (left menu) and click **New query**.
3. Paste and click **Run**. You should see *Success. No rows returned*.
   Run this file only once, on a new project. A second run stops with "already exists"; that is harmless.
4. Check: open **Table Editor**. You should see tables such as `products`, `variants`, `orders`,
   and the `admins` table should list the two admin email addresses.

The paste also creates the `public-images` storage bucket for product photos.

## Copy the two public values

Open **Project Settings → API Keys** (on some dashboards: **Project Settings → API** or **Data API**).

- **Project URL**, for example `https://abcdefghijkl.supabase.co`. This becomes `NEXT_PUBLIC_SUPABASE_URL`.
- **anon / public key** (on newer dashboards: **Publishable key**). This becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Both are safe to be public: what the key may do is limited by the rules in the database.
**Never copy the `service_role` or *secret* key** into Cloudflare, GitHub or anywhere else.

## Good to know

- A free project pauses after about a week with no visitors at all. If that happens, open the
  Supabase dashboard and click **Restore**; nothing is lost.
- Database backups on the free plan are limited. Plan 4 adds a nightly backup.

Next: [2. Google login](02-google-login.md).
