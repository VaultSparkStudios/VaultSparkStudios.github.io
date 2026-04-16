const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const PATHWAY_PAGES = [
  '/',
  '/membership/',
  '/vaultsparked/',
  '/join/',
  '/invite/'
];

const WORLD_GRAVITY_PAGES = [
  { route: '/games/vaultfront/', expectedHref: '/vault-member/#register' },
  { route: '/games/solara/', expectedHref: '/vaultsparked/' },
  { route: '/games/mindframe/', expectedHref: '/vault-member/#register' },
  { route: '/games/the-exodus/', expectedHref: '/universe/voidfall/' },
  { route: '/universe/voidfall/', expectedHref: '/universe/dreadspike/' },
  { route: '/universe/dreadspike/', expectedHref: '/universe/voidfall/' }
];

test.describe('Pathways and related rails', () => {
  test.describe.configure({ timeout: 30000 });

  for (const route of PATHWAY_PAGES) {
    test(`${route} renders pathway and related rails`, async ({ page }) => {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });

      const pathwayCards = page.locator('[data-pathways-root] .vault-journey-card');
      const relatedCards = page.locator('[data-related-root] .related-rail-card');

      await expect(pathwayCards.first()).toBeVisible();
      await expect(relatedCards.first()).toBeVisible();
      expect(await pathwayCards.count()).toBeGreaterThanOrEqual(3);
      expect(await relatedCards.count()).toBeGreaterThanOrEqual(3);
    });
  }

  test('pathway choice is remembered across pages', async ({ page }) => {
    await page.goto(BASE + '/membership/');
    await page.locator('[data-pathway-select="supporter"]').click();
    await page.goto(BASE + '/vaultsparked/');

    await expect(page.locator('.vault-journey-card.active[data-pathway-key="supporter"]')).toBeVisible();
  });

  for (const item of WORLD_GRAVITY_PAGES) {
    test(`${item.route} renders world-gravity related rails`, async ({ page }) => {
      await page.goto(BASE + item.route, { waitUntil: 'domcontentloaded' });

      const root = page.locator('[data-related-root]');
      const relatedCards = root.locator('.related-rail-card');

      await expect(root).toBeVisible();
      await expect(relatedCards.first()).toBeVisible();
      expect(await relatedCards.count()).toBeGreaterThanOrEqual(3);
      await expect(root.locator(`.related-rail-card[href="${item.expectedHref}"]`).first()).toBeVisible();
    });
  }
});
