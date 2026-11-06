# 3. Cloudflare Pages (the website)

Cloudflare Pages builds the website from GitHub and serves it for free.

## Create the project

1. Go to <https://dash.cloudflare.com>, sign in (or create a free account).
2. Open **Workers & Pages** → **Create** → choose **Pages** → **Import an existing Git repository**
   (if you only see Workers, click the link *Looking to deploy Pages? Get started*).
3. Connect GitHub and allow access to the repository `uttarwarsuyash-w/gangasagar-web`. Select it.
4. Settings:
   - Project name: `gangasagar` (this gives `https://gangasagar.pages.dev`)
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `out`
5. **Environment variables** (add each one):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from guide 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key from guide 1 |
   | `NEXT_PUBLIC_SITE_URL` | `https://gangasagar.pages.dev` |
   | `NODE_VERSION` | `22` |

   These four are the only settings the site needs. Do not add any secret key here.
6. **Save and Deploy**. The first build takes a few minutes.
7. Open `https://gangasagar.pages.dev`. It goes to the English home page.

If Cloudflare gave a different address than `gangasagar.pages.dev`, put that address in
`NEXT_PUBLIC_SITE_URL` here and in the Google and Supabase settings from guide 2, then redeploy.

## Redeploy after adding products

The shop pages (product list, product pages) are built from the database when Cloudflare builds the site.
Prices and stock labels refresh live, but **new products and categories appear only after a redeploy**:

**Workers & Pages → gangasagar → Deployments → the latest production deployment → ⋯ → Retry deployment.**

Pushing a commit to `main` also redeploys. (Plan 4 adds a Publish button in the admin.)

If the database cannot be reached during a build, the build stops instead of publishing an empty shop;
the previous version stays online.

Next: [4. First admin steps](04-first-admin-steps.md).
