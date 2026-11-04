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

  // S409: the dedicated gateway delegates identity to Obelisk; creating an
  // identity never grants investor approval. Test the live, safe handoff links.
  for (const journey of [
    { name: 'default workspace', query: '', destination: '/investor-portal/' },
    { name: 'document destination', query: '?next=%2Finvestor-portal%2Fdocuments%2F', destination: '/investor-portal/documents/' },
    { name: 'external destination rejected', query: '?next=https%3A%2F%2Fexample.invalid%2Fprivate', destination: '/investor-portal/' },
  ]) {
    test(`Investor gateway preserves separate approval and safe identity handoff: ${journey.name}`, async ({ page }) => {
      await page.goto(BASE + '/investor-portal/login/' + journey.query);
      const gateway = page.locator('section[aria-labelledby="investor-signin-heading"]');
      await expect(gateway).toBeVisible({ timeout: 8000 });
      await expect(gateway.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
      await expect(gateway.getByText('Investor access is approved separately by VaultSpark Studios.', { exact: false })).toBeVisible();
      await expect(gateway.getByText('Creating an account does not grant entry to this private workspace.', { exact: false })).toBeVisible();

      const signin = gateway.locator('#investorObeliskSignIn');
      const signup = gateway.locator('#investorCreateIdentity');
      await expect(signin).toBeVisible();
      await expect(signup).toBeVisible();
      const origin = new URL(BASE).origin;
      const identityDestination = '/investor-portal/login/?' + new URLSearchParams({ next: journey.destination, identity: 'created' });
      for (const [link, intent, destination] of [[signin, 'signin', journey.destination], [signup, 'signup', identityDestination]]) {
        await expect.poll(async () => {
          const url = new URL(await link.getAttribute('href'), page.url());
          return { origin: url.origin, path: url.pathname, intent: url.searchParams.get('intent'), destination: url.searchParams.get('return') };
        }).toEqual({ origin, path: '/login', intent, destination });
      }
      const seal = gateway.locator('[data-obelisk-seal]');
      await expect(seal).toHaveCount(1);
      await expect(seal).toHaveAttribute('data-rp', 'vaultsparkstudios-website');
      await expect(seal).toHaveAttribute('data-login-url', await signin.getAttribute('href'));
      const apply = gateway.getByRole('link', { name: /Request investor access/ });
      await expect(apply).toBeVisible();
      await expect(apply).toHaveAttribute('href', '/investor-portal/apply/?' + new URLSearchParams({ next: journey.destination }));
      await expect(gateway.getByRole('link', { name: /Open Vault Membership/ })).toHaveAttribute('href', '/vault-member/#login');
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
    });
  }
});
