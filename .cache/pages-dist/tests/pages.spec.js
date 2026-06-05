const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Miscellaneous pages', () => {
  test('Contact page has form', async ({ page }) => {
    await page.goto(BASE + '/contact/');
    await expect(page).toHaveTitle(/Contact/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('Terms of Service page loads', async ({ page }) => {
    await page.goto(BASE + '/terms/');
    await expect(page).toHaveTitle(/Terms/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Privacy Policy page loads', async ({ page }) => {
    await page.goto(BASE + '/privacy/');
    await expect(page).toHaveTitle(/Privacy/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Changelog page loads', async ({ page }) => {
    await page.goto(BASE + '/changelog/');
    await expect(page).toHaveTitle(/Changelog/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Roadmap page loads', async ({ page }) => {
    await page.goto(BASE + '/roadmap/');
    await expect(page).toHaveTitle(/Pipeline|Roadmap/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Ranks page loads', async ({ page }) => {
    await page.goto(BASE + '/ranks/');
    await expect(page).toHaveTitle(/Rank/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Press page loads', async ({ page }) => {
    await page.goto(BASE + '/press/');
    await expect(page).toHaveTitle(/Press/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Studio page loads', async ({ page }) => {
    await page.goto(BASE + '/studio/');
    await expect(page).toHaveTitle(/Studio|About/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Universe page loads', async ({ page }) => {
    await page.goto(BASE + '/universe/');
    await expect(page).toHaveTitle(/Universe/i);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Investor portal shows login gate', async ({ page }) => {
    await page.goto(BASE + '/investor-portal/login/');
    await expect(page.locator('form, input[type="password"], #login-form, .auth-card').first()).toBeVisible({ timeout: 8000 });
  });
});
