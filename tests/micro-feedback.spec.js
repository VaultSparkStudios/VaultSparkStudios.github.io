const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

const FEEDBACK_PAGES = [
  '/membership/',
  '/join/',
  '/invite/',
  '/studio-pulse/'
];

test.describe.configure({ timeout: 30000 });

test.describe('Micro-feedback surfaces', () => {
  for (const route of FEEDBACK_PAGES) {
    test(`${route} renders micro-feedback`, async ({ page }) => {
      test.skip(IS_LOCAL, 'micro-feedback widget requires live site initialization');
      await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));

      const toggle = page.locator('[data-micro-feedback-root] .micro-feedback-toggle');
      await toggle.waitFor({ state: 'visible', timeout: 15000 });
      await toggle.click();
      const shell = page.locator('[data-micro-feedback-root] .micro-feedback-shell');
      await shell.waitFor({ state: 'visible', timeout: 15000 });
      await expect(shell).toBeVisible();
      await expect(shell.locator('.micro-feedback-option').first()).toBeVisible();
    });
  }

  test('feedback selection can be saved locally', async ({ page }) => {
    test.skip(IS_LOCAL, 'micro-feedback widget requires live site initialization');
    await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
    await page.goto(BASE + '/membership/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));
    const toggle = page.locator('[data-micro-feedback-root] .micro-feedback-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 15000 });
    await toggle.click();
    await page.locator('[data-micro-feedback-root] .micro-feedback-shell').waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-feedback-field="goal"][data-feedback-value="join_vault"]').click();
    await page.locator('[data-feedback-field="blocker"][data-feedback-value="need_proof"]').click();
    await page.locator('[data-feedback-field="usefulness"][data-feedback-value="mixed"]').click();
    await page.locator('.micro-feedback-submit').click();

    await expect(page.locator('.micro-feedback-status')).toContainText('Saved');

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('vs_micro_feedback_v1');
      return raw ? JSON.parse(raw) : [];
    });

    expect(stored.length).toBeGreaterThan(0);
    expect(stored[stored.length - 1].goal).toBe('join_vault');
  });

  // S329: the widget wrote localStorage and stopped for 100+ sessions — the
  // survey collected nothing server-side. This asserts the usefulness vote now
  // actually leaves the browser as an anonymous page_feedback insert
  // (usefulness "mixed" → table vocabulary "ok"). Keyed on the deployed
  // bundle's capability marker so a pre-capability prod bundle SKIPS loudly
  // instead of passing silently.
  test('usefulness vote is POSTed to page_feedback', async ({ page }) => {
    test.skip(IS_LOCAL, 'micro-feedback widget requires live site initialization');
    await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));

    const captured = [];
    await page.route('**/rest/v1/page_feedback*', async (route) => {
      if (route.request().method() === 'POST') {
        try { captured.push(JSON.parse(route.request().postData() || 'null')); } catch { captured.push(null); }
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
        return;
      }
      await route.fallback();
    });

    await page.goto(BASE + '/membership/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));
    const toggle = page.locator('[data-micro-feedback-root] .micro-feedback-toggle');
    await toggle.waitFor({ state: 'visible', timeout: 15000 });

    const hasCapability = await page.evaluate(() => Boolean(window.VSFeedback && window.VSFeedback.sharesUsefulness));
    test.skip(!hasCapability, 'deployed bundle predates shareUsefulness — pending next content-lane promotion');

    await toggle.click();
    await page.locator('[data-micro-feedback-root] .micro-feedback-shell').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[data-feedback-field="goal"][data-feedback-value="join_vault"]').click();
    await page.locator('[data-feedback-field="blocker"][data-feedback-value="need_proof"]').click();
    await page.locator('[data-feedback-field="usefulness"][data-feedback-value="mixed"]').click();
    await page.locator('.micro-feedback-submit').click();
    await expect(page.locator('.micro-feedback-status')).toContainText('Saved');

    await expect.poll(() => captured.length, { timeout: 10000 }).toBeGreaterThan(0);
    const rows = [].concat(captured[0] || []);
    expect(rows[0]).toBeTruthy();
    expect(rows[0].reaction).toBe('ok');
    expect(rows[0].path).toBe('/membership');
    // privacy contract: nothing beyond the four anonymous columns
    expect(Object.keys(rows[0]).sort()).toEqual(['path', 'reaction', 'ua_kind', 'visit_depth_bucket']);
  });
});
