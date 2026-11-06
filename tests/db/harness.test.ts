// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, CUSTOMER, type TestDb } from './harness';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});

describe('test database harness', () => {
  it('exposes the signed-in user through auth.uid() and auth.jwt()', async () => {
    const rows = await db.as(CUSTOMER, (q) =>
      q<{ uid: string; email: string }>(`select auth.uid() as uid, auth.jwt()->>'email' as email`),
    );
    expect(rows[0].uid).toBe(CUSTOMER.userId);
    expect(rows[0].email).toBe(CUSTOMER.email);
  });

  it('gives anon a null auth.uid()', async () => {
    const rows = await db.as('anon', (q) => q<{ uid: string | null }>(`select auth.uid() as uid`));
    expect(rows[0].uid).toBeNull();
  });
});
