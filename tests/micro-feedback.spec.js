const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const FEEDBACK_PAGES = [
  '/',
  '/membership/',
  '/vaultsparked/',
  '/join/',
  '/invite/',
  '/studio-pulse/'
];

test.describe.configure({ timeout: 30000 });

test.describe('Micro-feedback surfaces', () => {
  for (const route of FEEDBACK_PAGES) {
    test(`${route} renders micro-feedback`, async ({ page }) => {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });

      const shell = page.locator('[data-micro-feedback-root] .micro-feedback-shell');
      await shell.waitFor({ state: 'visible', timeout: 15000 });
      await expect(shell).toBeVisible();
      await expect(shell.locator('.micro-feedback-option').first()).toBeVisible();
    });
  }

  test('feedback selection can be saved locally', async ({ page }) => {
    await page.goto(BASE + '/membership/', { waitUntil: 'domcontentloaded' });
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
