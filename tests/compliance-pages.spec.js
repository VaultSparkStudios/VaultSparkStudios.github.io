// compliance-pages.spec.js
// Covers the 8 compliance/utility pages added in Session 38b:
// Cookie Policy, Accessibility, Technology & Rights, FAQ, Careers, Data Deletion, Security, HTML Sitemap
// Also covers cookie consent banner behaviour.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const COMPLIANCE_PAGES = [
  { path: '/cookies/',       title: /Cookie/i,      h1: true },
  { path: '/accessibility/', title: /Accessibility/i, h1: true },
  { path: '/open-source/',   title: /Technology|Rights|Attributions/i, h1: true },
  { path: '/faq/',           title: /FAQ|Frequently/i, h1: true },
  { path: '/careers/',       title: /Careers/i,     h1: true },
  { path: '/data-deletion/', title: /Data Deletion/i, h1: true },
  { path: '/security/',      title: /Security/i,    h1: true },
  { path: '/sitemap.html',   title: /Sitemap/i,     h1: true },
];

test.describe('Compliance & utility pages (S38b)', () => {
  for (const pg of COMPLIANCE_PAGES) {
    test(`${pg.path} loads correctly`, async ({ page }) => {
      await page.goto(BASE + pg.path);
      await expect(page).toHaveTitle(pg.title);
      if (pg.h1) {
        await expect(page.locator('h1').first()).toBeVisible();
      }
      await expect(page.locator('footer.site-footer')).toBeVisible();
      // No broken navigation
      const navLinks = page.locator('.nav-center a');
      await expect(navLinks.first()).toBeVisible();
    });
  }
});

test.describe('Cookie consent banner', () => {
  test('banner appears on first visit and links to /cookies/', async ({ page, context }) => {
    // Clear storage to simulate first visit
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(BASE + '/');

    // Banner should appear
    const banner = page.locator('#cookieConsent');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Should link to /cookies/
    const cookieLink = page.locator('#cookieConsent a[href="/cookies/"]');
    await expect(cookieLink).toBeVisible();
  });

  test('banner disappears after accepting', async ({ page, context }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieAccept').click();
    await expect(banner).not.toBeVisible();

    // Consent should be stored
    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('accepted');
  });

  test('banner disappears after declining', async ({ page, context }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieDecline').click();
    await expect(banner).not.toBeVisible();

    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('declined');
  });

  test('banner does not appear on repeat visit after accepting', async ({ page }) => {
    // Set consent pre-visit
    await page.goto(BASE + '/');
    await page.evaluate(() => localStorage.setItem('vs_cookie_consent', 'accepted'));

    await page.goto(BASE + '/games/');
    const banner = page.locator('#cookieConsent');
    await expect(banner).not.toBeVisible();
  });
});

test.describe('Game detail pages — stat-block hover styles', () => {
  const GAME_PAGES = [
    '/games/call-of-doodie/',
    '/games/vaultspark-football-gm/',
    '/games/vaultfront/',
    '/games/solara/',
  ];

  for (const path of GAME_PAGES) {
    test(`${path} has stat-blocks and data-status on hero`, async ({ page }) => {
      await page.goto(BASE + path);

      // At least one stat-block should be visible
      const statBlocks = page.locator('.stat-block');
      await expect(statBlocks.first()).toBeVisible();

      // game-hero should have data-status attribute
      const hero = page.locator('.game-hero[data-status]');
      await expect(hero).toBeAttached();
      const status = await hero.getAttribute('data-status');
      expect(['sparked', 'forge', 'vaulted']).toContain(status);
    });
  }
});
