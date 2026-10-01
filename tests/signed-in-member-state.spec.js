const { test, expect } = require('@playwright/test');

async function mockIdentity(page, authenticated) {
  // S367: the live edge answers an anonymous /api/auth/me with 200 {ok:true, identity:null}
  // (verified against production), not 401 — mock the real contract.
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(authenticated ? {
      ok: true,
      identity: {
        provider: 'obelisk',
        sub: 'test:browser-proof',
        supabaseUserId: '11111111-1111-4111-8111-111111111111',
        email: 'member@example.test',
        name: 'Browser Proof',
      },
    } : { ok: true, identity: null }),
  }));
}

test.describe('Authoritative signed-in member state', () => {
  test('edge-verified identity stamps signed-in truth and lazy-loads the account chip', async ({ page }) => {
    await mockIdentity(page, true);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(1);

    await page.goto('/membership/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(1);
  });

  test('missing edge session resolves to anonymous state', async ({ page }) => {
    await mockIdentity(page, false);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'false');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'false');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(0);
  });
});
