// vault-wall.spec.js
// Playwright smoke — the Vault Wall was folded into the Community hub (S335):
// /vault-wall/ is now an edge 301 to /community/#wall. Verifies the retired
// route still lands on the wall, the rank distribution bar and podium render,
// and zero CSP console errors are surfaced.
// Replaces the [SIL:2⛔] recurring manual-incognito smoke check.
// File name kept so the e2e workflow's explicit spec path stays valid.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Vault Wall (on the Community hub)', () => {
  test('wall section loads, rank bar and podium render, zero CSP errors (Chromium)', async ({ page, browserName }) => {
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

    await page.goto(BASE + '/community/#wall', { waitUntil: 'load' });

    // Page title
    await expect(page).toHaveTitle(/Community/i);

    // Wall heading + footer present
    await expect(page.locator('#wall-heading')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();

    // Rank distribution bar is always in DOM (static container populated by JS)
    await expect(page.locator('#rank-dist-bar')).toBeVisible();

    // Podium container is always in DOM
    await expect(page.locator('#vw-podium')).toBeVisible();

    // Season slot renders a real state (active/inactive), never stays "loading"
    await expect(page.locator('[data-season-countdown]')).not.toHaveAttribute('data-state', 'loading', { timeout: 10_000 });

    // Allow Supabase JS time to populate member data
    await page.waitForTimeout(3500);

    // Rank distribution bar should have segments injected by JS
    const segCount = await page.locator('#rank-dist-bar .rank-dist-seg').count();
    if (segCount === 0) {
      console.warn('WARN: /community/#wall rank-dist-seg count = 0 — Supabase may be empty or unreachable in test env');
    }

    if (cspErrors.length > 0) {
      console.error('CSP violations:\n' + cspErrors.join('\n'));
    }
    expect(cspErrors, 'CSP violations on /community/#wall').toHaveLength(0);
  });

  test('retired /vault-wall/ route 301s onto the wall without auth', async ({ page }) => {
    const response = await page.goto(BASE + '/vault-wall/');
    expect(response.status()).toBeLessThan(400);

    // Must land on the community hub, never on a login page
    expect(page.url()).toContain('/community/');
    expect(page.url()).not.toContain('/vault-member/');
    await expect(page.locator('#wall')).toBeAttached();
  });
});
