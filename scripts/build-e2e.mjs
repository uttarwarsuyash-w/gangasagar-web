// Builds the site for the smoke tests: catalogue from a fixture file, Supabase answered by Playwright.
// Writes to e2e/.site (never `out`), so a smoke run cannot be deployed by mistake.
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  CATALOG_FIXTURE: 'e2e/fixtures/catalog.json',
  NEXT_PUBLIC_SUPABASE_URL: 'http://fixture.supabase.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon-key',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:4173',
  NEXT_EXPORT_DIR: 'e2e/.site',
};
const r = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env, shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
