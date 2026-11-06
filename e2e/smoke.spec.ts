import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = (name: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
const catalog = fixture('catalog.json');
const priceCart = fixture('price-cart.json');
const settings = fixture('site-settings.json');
const stock = fixture('stock.json');
const variants = catalog.products.flatMap((p: { variants: unknown[] }) => p.variants);

const SUPABASE = 'http://fixture.supabase.test';
const ADMIN_USER = {
  id: '00000000-0000-4000-8000-0000000000a1',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@example.test',
  app_metadata: { provider: 'google' },
  user_metadata: {},
  created_at: '2026-11-01T00:00:00Z',
};

const json = (route: Route, body: unknown) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(body),
  });

/** Answers every Supabase call from fixtures, so the static site runs with no database. */
async function fakeSupabase(page: Page, { admin = false } = {}) {
  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const url = new URL(req.url());
    const path = url.pathname;
    if (path === '/rest/v1/rpc/price_cart') {
      const body = req.postDataJSON() as { p_pincode: string | null; p_fulfilment: string };
      const key = body.p_fulfilment === 'pickup' ? 'pickup' : `${body.p_fulfilment}-${body.p_pincode}`;
      return json(route, priceCart[key] ?? { ...priceCart.pickup, errors: [{ code: 'invalid_pincode' }], delivery_fee: null, total: null });
    }
    if (path === '/rest/v1/rpc/is_admin') return json(route, admin);
    if (path === '/rest/v1/variant_public') return json(route, variants);
    if (path === '/rest/v1/site_settings') {
      const key = (url.searchParams.get('key') ?? '').replace(/^eq\./, '');
      return json(route, key in settings ? [{ value: settings[key] }] : []);
    }
    if (path === '/rest/v1/variants') return json(route, stock);
    if (path.startsWith('/rest/v1/rpc/')) return json(route, null);
    return json(route, path.startsWith('/rest/') ? [] : {});
  });
  if (admin) {
    const session = {
      access_token: 'fixture-access-token',
      refresh_token: 'fixture-refresh-token',
      token_type: 'bearer',
      expires_in: 3600 * 24,
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
      user: ADMIN_USER,
    };
    await page.addInitScript((s) => localStorage.setItem('sb-fixture-auth-token', s), JSON.stringify(session));
  }
}

/** Fails the test on any console error or uncaught exception on the pages it visits. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  return errors;
}

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = watchConsole(page);
});
test.afterEach(() => {
  expect(errors, 'console errors').toEqual([]);
});

test('/ goes to the English home page', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await page.waitForURL('**/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('every header link returns a page', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/en/');
  const hrefs = await page.locator('header a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))]);
  expect(hrefs.length).toBeGreaterThanOrEqual(4);
  for (const href of hrefs) {
    const res = await page.goto(href);
    expect(res?.status(), href).toBe(200);
    await expect(page.locator('main')).toBeVisible();
  }
});

test('the language switch keeps the same page', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/en/shop/');
  await page.getByRole('link', { name: 'हिन्दी में देखें' }).click();
  await page.waitForURL('**/hi/shop/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await page.getByRole('link', { name: 'View in English' }).click();
  await page.waitForURL('**/en/shop/');
});

test('add to cart updates the count, and the cart shows ₹89 delivery for 1.5 kg / ₹300 in Nanded', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/en/product/fixture-dal/');
  await expect(page.getByRole('heading', { name: 'Fixture Dal' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.goto('/en/cart/');
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await page.getByLabel('Deliver to my address').check();
  await page.getByLabel('Pincode').fill('431602');
  const summary = page.locator('aside dl');
  await expect(summary).toContainText('1.5 kg');
  await expect(summary).toContainText('₹89');
  await expect(summary).toContainText('₹389');
});

test('dialogs close with Escape', async ({ page }) => {
  await fakeSupabase(page, { admin: true });
  await page.goto('/en/admin/inventory/');
  await page.getByRole('button', { name: 'Change stock for Fixture Dal 1.5 kg' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Change stock for Fixture Dal 1.5 kg' })).toBeFocused();
});
