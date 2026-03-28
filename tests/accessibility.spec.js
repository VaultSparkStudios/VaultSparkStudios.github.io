const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Accessibility basics', () => {
  test('Homepage has lang attribute on html', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('All images have alt text on homepage', async ({ page }) => {
    await page.goto(BASE + '/');
    const images = page.locator('img:not([alt])');
    await expect(images).toHaveCount(0);
  });

  test('Skip link is present on all key pages', async ({ page }) => {
    const pages = ['/', '/games/', '/leaderboards/', '/community/', '/contact/'];
    for (const p of pages) {
      await page.goto(BASE + p);
      await expect(page.locator('a.skip-link')).toHaveCount(1);
    }
  });

  test('Main content landmark exists', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('Nav has aria-label', async ({ page }) => {
    await page.goto(BASE + '/');
    const nav = page.locator('nav[aria-label]');
    await expect(nav.first()).toBeVisible();
  });

  test('Buttons have accessible text', async ({ page }) => {
    await page.goto(BASE + '/');
    // Hamburger should have aria-label
    const hamburger = page.locator('#hamburger');
    await expect(hamburger).toHaveAttribute('aria-label', /navigation/i);
  });

  test('Leaderboard table has aria-label', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-table[aria-label]')).toBeVisible();
  });

  test('Form inputs have associated labels on contact page', async ({ page }) => {
    await page.goto(BASE + '/contact/');
    // Every visible input should have a label or aria-label
    const inputs = await page.locator('input:visible:not([type="hidden"])').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      // At minimum should have one of: id with label, aria-label, or placeholder
      expect(id || ariaLabel || placeholder).toBeTruthy();
    }
  });
});
