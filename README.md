# Gangasagar web shop

Static Next.js site (exported to `out/`, hosted on Cloudflare Pages) that talks directly to Supabase.
All prices, delivery fees, permissions and order rules live in Postgres functions and row-level security
(`supabase/migrations/`); the browser only displays them.

## Requirements

- Node 22
- No secrets are needed for development: database code is tested in PGlite with small Supabase stubs.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server |
| `npm run test` | Unit, component and database tests (Vitest) |
| `npm run build` | Static export to `out/` |
| `npx playwright test` | Smoke tests against the built site |

## Environment

Copy `.env.example` to `.env.local` and fill in the three public values. Only these three reach the browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (for example `https://gangasagar.pages.dev`)

Setup guides for Supabase, Google login and Cloudflare Pages are in `docs/setup/`.
