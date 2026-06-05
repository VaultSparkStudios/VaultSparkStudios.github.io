const { test, expect } = require('@playwright/test');

const SESSION_KEY = 'sb-fjnpzjjyhnpmunfoycrp-auth-token';

function sessionPayload() {
  return {
    currentSession: {
      access_token: 'test-access-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'member@example.test',
        user_metadata: {
          username: 'BrowserProof',
          display_name: 'Browser Proof'
        }
      }
    }
  };
}

async function seedSession(page) {
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, { key: SESSION_KEY, payload: sessionPayload() });
}

test.describe('Signed-in member state persistence', () => {
  test('persisted Supabase session stamps signed-in truth and lazy-loads the account chip', async ({ page }) => {
    await seedSession(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(1);

    await page.goto('/membership/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'true');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(1);
  });

  test('missing persisted session resolves to anonymous state', async ({ page }) => {
    await page.addInitScript((key) => localStorage.removeItem(key), SESSION_KEY);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-vs-signed-in', 'false');
    await expect(page.locator('body')).toHaveAttribute('data-vs-signed-in', 'false');
    await expect(page.locator('script[data-vs-account-chip]')).toHaveCount(0);
  });
});
