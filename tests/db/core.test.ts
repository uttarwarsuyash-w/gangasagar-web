// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, CUSTOMER, CUSTOMER_B, createTestDb, createUser, type TestDb } from './harness';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN, 'Suyash Uttarwar');
  await createUser(db, CUSTOMER, 'Asha Patil');
  await createUser(db, CUSTOMER_B, 'Ravi Kale');
});

describe('is_admin()', () => {
  it('is true for an allowlisted admin', async () => {
    const [r] = await db.as(ADMIN, (q) => q<{ v: boolean }>('select public.is_admin() as v'));
    expect(r.v).toBe(true);
  });
  it('is true regardless of email case', async () => {
    const who = { userId: ADMIN.userId, email: 'UttarwarSuyash@Gmail.com' };
    const [r] = await db.as(who, (q) => q<{ v: boolean }>('select public.is_admin() as v'));
    expect(r.v).toBe(true);
  });
  it('is false for a customer', async () => {
    const [r] = await db.as(CUSTOMER, (q) => q<{ v: boolean }>('select public.is_admin() as v'));
    expect(r.v).toBe(false);
  });
  it('is false for anon', async () => {
    const [r] = await db.as('anon', (q) => q<{ v: boolean }>('select public.is_admin() as v'));
    expect(r.v).toBe(false);
  });
});

describe('profiles', () => {
  it('are created from auth.users with the full name', async () => {
    const rows = await db.admin<{ full_name: string }>('select full_name from public.profiles where id = $1', [CUSTOMER.userId]);
    expect(rows[0].full_name).toBe('Asha Patil');
  });
  it('customers see only their own profile', async () => {
    const rows = await db.as(CUSTOMER, (q) => q<{ id: string }>('select id from public.profiles'));
    expect(rows.map((r) => r.id)).toEqual([CUSTOMER.userId]);
  });
  it('customers update only their own profile', async () => {
    await db.as(CUSTOMER, (q) => q(`update public.profiles set phone = '9800000000'`));
    const rows = await db.admin<{ id: string; phone: string | null }>('select id, phone from public.profiles order by id');
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.phone]));
    expect(byId[CUSTOMER.userId]).toBe('9800000000');
    expect(byId[CUSTOMER_B.userId]).toBeNull();
  });
  it('anon cannot read profiles', async () => {
    await expect(db.as('anon', (q) => q('select * from public.profiles'))).rejects.toThrow(/permission denied/);
  });
});

describe('site_settings', () => {
  it('anon can read settings, including the delivery defaults', async () => {
    const rows = await db.as('anon', (q) => q<{ key: string; value: Record<string, unknown> }>('select key, value from public.site_settings'));
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(Object.keys(s).sort()).toEqual(['business', 'contact', 'delivery', 'payment', 'quantities']);
    expect(s.delivery).toEqual({
      nanded_free_min_value: 499,
      nanded_light_fee: 89,
      nanded_heavy_fee: 49,
      nanded_heavy_min_g: 2000,
      outside_fee: 179,
      quotation_min_g: 20000,
    });
    expect(s.quantities).toEqual({ loose_min_g: 250, loose_step_g: 250, custom_min_g: 500 });
    expect(s.payment).toEqual({ upi_id: null, upi_qr_url: null });
  });
  it('a customer cannot update settings', async () => {
    await db.as(CUSTOMER, (q) => q(`update public.site_settings set value = '{}'::jsonb where key = 'payment'`)).catch(() => undefined);
    const [r] = await db.admin<{ value: unknown }>(`select value from public.site_settings where key = 'payment'`);
    expect(r.value).toEqual({ upi_id: null, upi_qr_url: null });
  });
  it('anon cannot update settings', async () => {
    await expect(
      db.as('anon', (q) => q(`update public.site_settings set value = '{}'::jsonb where key = 'payment'`)),
    ).rejects.toThrow(/permission denied/);
  });
  it('an admin can update settings', async () => {
    await db.as(ADMIN, (q) =>
      q(`update public.site_settings set value = jsonb_set(value, '{upi_id}', '"shop@upi"') where key = 'payment'`),
    );
    const [r] = await db.admin<{ value: { upi_id: string } }>(`select value from public.site_settings where key = 'payment'`);
    expect(r.value.upi_id).toBe('shop@upi');
  });
});

describe('admins table', () => {
  it('a customer cannot read the allowlist', async () => {
    await expect(db.as(CUSTOMER, (q) => q('select * from public.admins'))).rejects.toThrow(/permission denied/);
  });
  it('anon cannot read the allowlist', async () => {
    await expect(db.as('anon', (q) => q('select * from public.admins'))).rejects.toThrow(/permission denied/);
  });
});
