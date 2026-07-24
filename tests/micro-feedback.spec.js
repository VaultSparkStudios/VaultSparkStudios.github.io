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

    await expect(page.locator('.micro-feedback-status')).toContainText('Saved locally');

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('vs_micro_feedback_v1');
      return raw ? JSON.parse(raw) : [];
    });

    expect(stored.length).toBeGreaterThan(0);
    expect(stored[stored.length - 1].goal).toBe('join_vault');
  });
});
