// vault-wall.spec.js
// Playwright smoke — verifies /vault-wall/ loads, the rank distribution bar and
// leaderboard containers render, and zero CSP console errors are surfaced.
// Replaces the [SIL:2⛔] recurring manual-incognito smoke check.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Vault Wall public page', () => {
  test('page loads, rank bar and podium render, zero CSP errors (Chromium)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CSP smoke runs Chromium only');

    const cspErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content-Security-Policy')) {
        cspErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      if (err.message && err.message.includes('Content-Security-Policy')) {
        cspErrors.push(err.message);
      }
    });

    await page.goto(BASE + '/vault-wall/', { waitUntil: 'networkidle' });

    // Page title
    await expect(page).toHaveTitle(/Vault Wall/i);

    // h1 visible
    await expect(page.locator('#vw-heading')).toBeVisible();

    // Footer present
    await expect(page.locator('footer.site-footer')).toBeVisible();

    // Rank distribution bar is always in DOM (static container populated by JS)
    await expect(page.locator('#rank-dist-bar')).toBeVisible();

    // Podium container is always in DOM
    await expect(page.locator('#vw-podium')).toBeVisible();

    // Allow Supabase JS time to populate member data
    await page.waitForTimeout(3500);

    // Rank distribution bar should have segments injected by JS
    // (segments use .rank-dist-seg class — at least 1 should be present if data loads)
    const segCount = await page.locator('#rank-dist-bar .rank-dist-seg').count();
    if (segCount === 0) {
      console.warn('WARN: /vault-wall/ rank-dist-seg count = 0 — Supabase may be empty or unreachable in test env');
    }

    // No CSP violations
    if (cspErrors.length > 0) {
      console.error('CSP violations:\n' + cspErrors.join('\n'));
    }
    expect(cspErrors, 'CSP violations on /vault-wall/').toHaveLength(0);
  });

  test('page is accessible without auth (public route)', async ({ page }) => {
    const response = await page.goto(BASE + '/vault-wall/');
    expect(response.status()).toBeLessThan(400);

    // Page must not redirect to login
    expect(page.url()).toContain('/vault-wall/');
  });
});
