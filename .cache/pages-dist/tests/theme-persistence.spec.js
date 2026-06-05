const { test, expect } = require('@playwright/test');

test.describe('Theme persistence', () => {
  test.describe.configure({ timeout: 60000 });

  test('homepage theme selection persists across reloads', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('vs_theme', 'warm');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // Custom picker (replaces bare <select> as of S44)
    await page.waitForSelector('#theme-picker-btn', { timeout: 15000 });
    await expect(page.locator('.theme-tile[data-theme="warm"]')).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'warm');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#theme-picker-btn', { timeout: 15000 });
    await expect(page.locator('.theme-tile[data-theme="warm"]')).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'warm');
  });

  test('mobile nav renders under the persisted theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem('vs_theme', 'high-contrast');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    // Custom picker (replaces bare <select> as of S44)
    await page.waitForSelector('#theme-picker-btn', { timeout: 15000 });
    await page.locator('#hamburger').click({ force: true });
    await expect(page.locator('#nav-menu')).toHaveClass(/open/);
    await expect(page.locator('.mobile-theme-pill[data-theme="high-contrast"]')).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'high-contrast');
  });
});
