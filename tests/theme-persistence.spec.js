const { test, expect } = require('@playwright/test');

test.describe('Theme persistence', () => {
  test.describe.configure({ timeout: 60000 });

  test('homepage theme selection persists across reloads', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('vs_theme', 'warm');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#theme-select', { timeout: 15000 });
    await expect(page.locator('#theme-select')).toHaveValue('warm');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'warm');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#theme-select', { timeout: 15000 });
    await expect(page.locator('#theme-select')).toHaveValue('warm');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'warm');
  });

  test('mobile nav renders under the persisted theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem('vs_theme', 'high-contrast');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#theme-select', { timeout: 15000 });
    await page.locator('#hamburger').click({ force: true });
    await expect(page.locator('#nav-menu')).toHaveClass(/open/);
    await expect(page.locator('#theme-select')).toHaveValue('high-contrast');
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'high-contrast');
  });
});
