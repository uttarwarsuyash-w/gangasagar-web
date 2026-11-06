# 2. Google login

Customers and admins sign in with their Google account. You create a "Google sign-in app" once
in Google Cloud (free) and give its two values to Supabase. The secret goes only into Supabase.

You need the website address first. If you will name the Cloudflare project `gangasagar` (guide 3),
the address is `https://gangasagar.pages.dev`. If Cloudflare gives you a different address,
use that one everywhere below.

## In Google Cloud

1. Go to <https://console.cloud.google.com> and sign in with the shop's Google account.
2. Create a project: top bar → project picker → **New project** → name `Gangasagar` → **Create**. Select it.
3. Open **Google Auth Platform** (search for "OAuth consent screen" if you do not see it) and click **Get started**:
   - App name: `Gangasagar`
   - User support email: your email
   - Audience: **External**
   - Contact email: your email
   - Accept and **Create**.
4. In **Audience**, click **Publish app** so that every customer can sign in (not only test users).
   The site asks only for name and email, so Google does not need to review it.
5. In **Clients**, click **Create client**:
   - Application type: **Web application**, name `Gangasagar website`
   - Authorized JavaScript origins: `https://gangasagar.pages.dev`
   - Authorized redirect URIs: the **Callback URL** that Supabase shows in the next section
     (it looks like `https://abcdefghijkl.supabase.co/auth/v1/callback`)
   - **Create**. Copy the **Client ID** and **Client secret**.

## In Supabase

1. **Authentication → Sign In / Providers → Google** (on older dashboards: **Authentication → Providers**).
   Turn it on, paste the Client ID and Client secret, and **Save**. Copy the Callback URL shown here
   into Google (step 5 above) if you have not yet.
2. **Authentication → URL Configuration**:
   - Site URL: `https://gangasagar.pages.dev`
   - Redirect URLs, add both:
     - `https://gangasagar.pages.dev/en/auth/callback/**`
     - `https://gangasagar.pages.dev/hi/auth/callback/**`

     (The `**` lets the page remember where the customer was going.)
   - Optional, only for developers working on their computer: `http://localhost:3000/**`
3. **Save**.

Sign-in only works on the main address above, not on Cloudflare's preview addresses.

Next: [3. Cloudflare Pages](03-cloudflare-pages.md).
