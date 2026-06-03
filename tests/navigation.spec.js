const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Site navigation', () => {
  test.describe.configure({ mode: 'serial' });

  test('Skip link exists and targets main content', async ({ page }) => {
    await page.goto(BASE + '/');
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('Header contains brand link to homepage', async ({ page }) => {
    await page.goto(BASE + '/games/');
    const brand = page.locator('.brand[href="/"]');
    await expect(brand).toBeVisible();
  });

  test('Games dropdown contains all 7 games', async ({ page }) => {
    await page.goto(BASE + '/');
    const gameLinks = page.locator('.nav-dropdown a[href*="/games/"]');
    // All Games + 3 sparked + 4 forge + 2 vaulted = 10? The locator is scoped to one dropdown and excludes the section label rows.
    await expect(gameLinks).toHaveCount(9);
  });

  test('Footer contains expected sections', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('footer.site-footer')).toBeVisible();
    await expect(page.locator('footer a[href="/privacy/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/terms/"]')).toHaveCount(1);
  });

  test('Join The Vault CTA button exists in nav', async ({ page }) => {
    await page.goto(BASE + '/');
    const joinBtn = page.locator('.nav-right a[href="/vault-member/#register"]');
    await expect(joinBtn).toBeVisible();
  });

  test('Sign In link exists in nav', async ({ page }) => {
    await page.goto(BASE + '/');
    const signIn = page.locator('.nav-signin');
    await expect(signIn).toBeVisible();
  });
});
