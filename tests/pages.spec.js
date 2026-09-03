const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Miscellaneous pages', () => {
  test('Contact page has form', async ({ page }) => {
    await page.goto(BASE + '/contact/');
    await expect(page).toHaveTitle(/Contact/);
    // Use specific ID to avoid strict-mode violation (contact page has 2 forms)
    await expect(page.locator('#contact-form')).toBeVisible();
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

  /**
   * This asserted `form, input[type="password"], #login-form, .auth-card` — and
   * the page has none of them. Sign-in is delegated to Obelisk (CANON-045), so
   * there is no local credential form to find; the gate is a relying-party seal
   * and a handoff link. The test had been red behind the S340 smoke pre-gate,
   * proving nothing about a page that was working correctly.
   *
   * Assert what a delegated gate actually promises: the card is present and it
   * offers an Obelisk sign-in handoff that returns to the portal. That still
   * fails if the gate vanishes, and — unlike the old selector — it would also
   * fail if the page quietly grew a local password form, which for an
   * Obelisk-delegated surface is the more serious regression.
   */
  test('Investor portal shows login gate', async ({ page }) => {
    await page.goto(BASE + '/investor-portal/login/');
    await expect(page.locator('.login-card')).toBeVisible({ timeout: 8000 });

    const signin = page.locator('#panelSignin');
    await expect(signin.locator('[data-obelisk-seal]')).toHaveCount(1);
    await expect(signin.locator('a[href*="/login?intent=signin"]').first()).toBeVisible();
    await expect(signin.locator('input[type="password"]')).toHaveCount(0);
  });
});
