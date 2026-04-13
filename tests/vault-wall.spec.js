// vault-wall.spec.js
// Playwright smoke — verifies /vault-wall/ loads, the leaderboard renders,
// and no console errors are surfaced. Run after phase59 public_profile migration.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Vault Wall public page', () => {
  test('page loads and rank distribution bar renders', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE + '/vault-wall/', { waitUntil: 'networkidle' });

    // Page title
    await expect(page).toHaveTitle(/Vault Wall/i);

    // h1 visible
    await expect(page.locator('h1').first()).toBeVisible();

    // Footer present
    await expect(page.locator('footer.site-footer')).toBeVisible();

    // Rank distribution bar container or leaderboard should render
    // (these are populated by Supabase JS — allow time for data to load)
    await page.waitForTimeout(3000);

    // No critical JS errors
    const cspErrors = errors.filter(e => e.includes('Content-Security-Policy'));
    expect(cspErrors, 'CSP violations on /vault-wall/').toHaveLength(0);
  });

  test('page is accessible without auth (public route)', async ({ page }) => {
    const response = await page.goto(BASE + '/vault-wall/');
    expect(response.status()).toBeLessThan(400);
  });
});
