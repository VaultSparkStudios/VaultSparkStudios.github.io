// compliance-pages.spec.js
// Covers the 8 compliance/utility pages added in Session 38b:
// Cookie Policy, Accessibility, Technology & Rights, FAQ, Careers, Data Deletion, Security, HTML Sitemap
// Also covers cookie consent banner behaviour.

const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const COMPLIANCE_PAGES = [
  { path: '/cookies/',       title: /Cookie/i,      h1: true },
  { path: '/accessibility/', title: /Accessibility/i, h1: true },
  { path: '/rights/',        title: /Technology|Rights|Attributions/i, h1: true },
  { path: '/faq/',           title: /FAQ|Frequently/i, h1: true },
  { path: '/careers/',       title: /Careers/i,     h1: true },
  { path: '/data-deletion/', title: /Data Deletion/i, h1: true },
  { path: '/security/',      title: /Security/i,    h1: true },
  { path: '/sitemap.html',   title: /Sitemap/i,     h1: true },
  { path: '/changelog/',     title: /Changelog|Vault/i, h1: true },
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
  test('banner appears on first visit and links to /cookies/', async ({ page }) => {
    // Playwright creates a fresh isolated context for every test. Do not use a
    // localStorage.clear() init script here: init scripts also run in later
    // same-origin frames and can erase the very consent state these tests prove.
    await page.goto(BASE + '/');

    // Banner should appear
    const banner = page.locator('#cookieConsent .vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#cookieConsent')).toHaveCSS('opacity', '1');

    // Should link to /cookies/
    const cookieLink = page.locator('#cookieConsent a[href="/cookies/"]');
    await expect(cookieLink).toBeVisible();
  });

  test('banner disappears after accepting', async ({ page }) => {
    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent .vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieAccept').click();
    await expect(page.locator('#cookieConsent')).toHaveCount(0);

    // Consent should be stored
    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('accepted');
  });

  test('banner disappears after declining', async ({ page }) => {
    await page.goto(BASE + '/');

    const banner = page.locator('#cookieConsent .vs-cookie-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    await page.locator('#cookieDecline').click();
    await expect(page.locator('#cookieConsent')).toHaveCount(0);

    const consent = await page.evaluate(() => localStorage.getItem('vs_cookie_consent'));
    expect(consent).toBe('declined');
  });

  test('banner does not appear on repeat visit after accepting', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'accepted'));
    await page.goto(BASE + '/games/');
    await expect(page.locator('#cookieConsent')).toHaveCount(0);
  });
});

test.describe('Release truth surface', () => {
  test('status exposes the staged identity receipt without claiming production readiness', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + '/status/');

    const signals = page.locator('#liveSignalsGrid');
    await expect(signals).toContainText('Identity migration');
    await expect(signals).toContainText('Staged · held');
    await expect(signals).toContainText('Release authority');
    await expect(signals).toContainText(/\d+\/4 Supabase authority planes verified/);
    await expect(signals).toContainText('Production deploy currency');
    await expect(signals).toContainText(/shell fingerprints? (drift|matched)|shell parity unobserved/);

    const box = await signals.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(390);
  });
});

test.describe('Game detail pages — stat-block hover styles', () => {
  const GAME_PAGES = [
    '/games/call-of-doodie/',
    '/games/franchise-architect/',
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
