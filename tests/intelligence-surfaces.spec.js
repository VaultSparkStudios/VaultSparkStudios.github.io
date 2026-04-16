const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const PATHWAY_PAGES = [
  '/',
  '/membership/',
  '/vaultsparked/',
  '/join/',
  '/invite/'
];

test.describe('Pathways and related rails', () => {
  for (const route of PATHWAY_PAGES) {
    test(`${route} renders pathway and related rails`, async ({ page }) => {
      await page.goto(BASE + route);

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
});
