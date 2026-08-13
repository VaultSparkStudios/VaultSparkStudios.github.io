import { test, expect } from '@playwright/test';

test('hero choices emit viewport-qualified denominators and named clicks', async ({ page }) => {
  const events = [];
  await page.route('**/v/rum', async (route) => {
    try { events.push(JSON.parse(route.request().postData() || '{}').ux); } catch {}
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page.locator('[data-hero-choice-group]').scrollIntoViewIfNeeded();
  await expect.poll(() => events.includes('cta:hero-choice:shown')).toBeTruthy();
  await page.locator('[data-hero-choice="atlas"]').click({ noWaitAfter: true });
  await expect.poll(() => events.includes('cta:hero-choice:click:atlas')).toBeTruthy();
});

test('portfolio tile impressions are scoped to visible tiles', async ({ page }) => {
  const events = [];
  await page.route('**/v/rum', async (route) => {
    try { events.push(JSON.parse(route.request().postData() || '{}').ux); } catch {}
    await route.fulfill({ status: 204 });
  });
  await page.goto('/');
  await page.locator('.hero-showcase').scrollIntoViewIfNeeded();
  await expect.poll(() => events.some((name) => name?.startsWith('cta:hero-portfolio:shown:'))).toBeTruthy();
});
