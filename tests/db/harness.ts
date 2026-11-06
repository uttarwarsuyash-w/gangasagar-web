import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

/** Signed-in users sign in with Google unless a test says otherwise (provider). */
export type Who = 'anon' | 'service' | { userId: string; email: string; provider?: string };
export type Query = <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>;

export interface TestDb {
  as<T>(who: Who, fn: (q: Query) => Promise<T>): Promise<T>;
  /** Runs SQL as the database owner (superuser), outside any role. Test setup only. */
  admin: Query;
  pg: PGlite;
}

export const ADMIN = { userId: '00000000-0000-0000-0000-0000000000a1', email: 'uttarwarsuyash@gmail.com' };
export const CUSTOMER = { userId: '00000000-0000-0000-0000-0000000000c1', email: 'customer@example.com' };
export const CUSTOMER_B = { userId: '00000000-0000-0000-0000-0000000000c2', email: 'customer-b@example.com' };

function claimsFor(who: Who): { role: string; claims: Record<string, unknown> } {
  if (who === 'anon') return { role: 'anon', claims: { role: 'anon' } };
  if (who === 'service') return { role: 'service_role', claims: { role: 'service_role' } };
  return {
    role: 'authenticated',
    claims: { sub: who.userId, email: who.email, role: 'authenticated', app_metadata: { provider: who.provider ?? 'google' } },
  };
}

export function migrationFiles(): string[] {
  const dir = path.join(root, 'supabase/migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(dir, f));
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  await pg.exec(readFileSync(path.join(root, 'tests/db/stubs.sql'), 'utf8'));
  for (const file of migrationFiles()) {
    try {
      await pg.exec(readFileSync(file, 'utf8'));
    } catch (e) {
      throw new Error(`migration ${path.basename(file)} failed: ${(e as Error).message}`);
    }
  }
  const seed = path.join(root, 'supabase/seed.sql');
  if (existsSync(seed)) await pg.exec(readFileSync(seed, 'utf8'));

  const admin: Query = async (sql, params) => (await pg.query(sql, params as unknown[])).rows as never;

  return {
    pg,
    admin,
    async as(who, fn) {
      const { role, claims } = claimsFor(who);
      return pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
        await tx.exec(`set local role ${role}`);
        const q: Query = async (sql, params) => (await tx.query(sql, params as unknown[])).rows as never;
        return fn(q);
      });
    },
  };
}

export async function createUser(db: TestDb, who: { userId: string; email: string }, fullName = 'Test User') {
  await db.admin(
    `insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3) on conflict (id) do nothing`,
    [who.userId, who.email, JSON.stringify({ full_name: fullName })],
  );
}
