const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

// Pages carrying BOTH [data-pathways-root] and [data-related-root].
// `/` and `/membership/` intentionally dropped their pathway rails in
// S96 (homepage reorder) and S93 (consumer-surface cleanup) respectively —
// they keep related-rail coverage via RELATED_ONLY_PAGES below.
// S368: /join/ is now an edge 301 to /vault-member/#register (_redirects), so it
// carries no rails; /games/ and /universe/ are the pages that render both.
const PATHWAY_PAGES = [
  '/invite/',
  '/games/',
  '/universe/'
];

const RELATED_ONLY_PAGES = [
  '/',
  '/membership/'
];

// S368: the per-game pages (/games/vaultfront/, /games/solara/, /games/mindframe/,
// /games/the-exodus/) no longer carry a related rail. Only the two universe
// worlds still render world-gravity rails, each pointing at its sibling world.
const WORLD_GRAVITY_PAGES = [
  { route: '/universe/voidfall/', expectedHref: '/universe/dreadspike/' },
  { route: '/universe/dreadspike/', expectedHref: '/universe/voidfall/' }
];

test.describe('Pathways and related rails', () => {
  test.describe.configure({ timeout: 30000 });

  for (const route of PATHWAY_PAGES) {
    test(`${route} renders pathway and related rails`, async ({ page }) => {
      test.skip(IS_LOCAL, 'Pathway/related rails require IGNIS API data — not available in local preview');
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));

      const pathwayCards = page.locator('[data-pathways-root] .vault-journey-card');
      const relatedCards = page.locator('[data-related-root] .related-rail-card');

      await expect(pathwayCards.first()).toBeVisible();
      await expect(relatedCards.first()).toBeVisible();
      expect(await pathwayCards.count()).toBeGreaterThanOrEqual(3);
      expect(await relatedCards.count()).toBeGreaterThanOrEqual(3);
    });
  }

  for (const route of RELATED_ONLY_PAGES) {
    test(`${route} renders related rails`, async ({ page }) => {
      test.skip(IS_LOCAL, 'Related rails require IGNIS API data — not available in local preview');
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));

      const relatedCards = page.locator('[data-related-root] .related-rail-card');

      await expect(relatedCards.first()).toBeVisible();
      expect(await relatedCards.count()).toBeGreaterThanOrEqual(3);
    });
  }

  test('pathway choice is remembered across pages', async ({ page }) => {
    test.skip(IS_LOCAL, 'Pathway choice persistence requires IGNIS API data — not available in local preview');
    // `/membership/` dropped its pathway rail in S93 and /join/ is now a redirect;
    // /games/ carries the pathway rail, so it is the origin.
    await page.goto(BASE + '/games/');
    await page.locator('[data-pathway-select="supporter"]').click();
    await page.goto(BASE + '/invite/');

    await expect(page.locator('.vault-journey-card.active[data-pathway-key="supporter"]')).toBeVisible();
  });

  for (const item of WORLD_GRAVITY_PAGES) {
    test(`${item.route} renders world-gravity related rails`, async ({ page }) => {
      test.skip(IS_LOCAL, 'World-gravity related rails require IGNIS API data — not available in local preview');
      await page.goto(BASE + item.route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.dispatchEvent(new Event('pointerdown')));

      const root = page.locator('[data-related-root]');
      const relatedCards = root.locator('.related-rail-card');

      await expect(root).toBeVisible();
      await expect(relatedCards.first()).toBeVisible();
      expect(await relatedCards.count()).toBeGreaterThanOrEqual(3);
      await expect(root.locator(`.related-rail-card[href="${item.expectedHref}"]`).first()).toBeVisible();
    });
  }
});
