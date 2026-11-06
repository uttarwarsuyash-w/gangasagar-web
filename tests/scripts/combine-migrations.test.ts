import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { combineMigrations } from '../../scripts/combine-migrations.mjs';
import { migrationFiles } from '../db/harness';

const root = path.resolve(__dirname, '../..');

describe('combine-migrations', () => {
  it('puts every migration in order, then the seed last', () => {
    const sql = combineMigrations(root);
    const names = migrationFiles().map((f) => path.basename(f));
    const positions = [...names, 'seed.sql'].map((n) => sql.indexOf(`-- ==== ${n}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('runs cleanly on a fresh database and seeds the two admins', async () => {
    const pg = new PGlite();
    await pg.exec(readFileSync(path.join(root, 'tests/db/stubs.sql'), 'utf8'));
    await pg.exec(combineMigrations(root));
    const { rows } = await pg.query<{ n: number }>('select count(*)::int as n from public.admins');
    expect(rows[0].n).toBe(2);
    await pg.close();
  });

  it('matches the committed supabase/apply-all.sql (run npm run db:combine after changing a migration)', () => {
    expect(readFileSync(path.join(root, 'supabase/apply-all.sql'), 'utf8')).toBe(combineMigrations(root));
  });
});
