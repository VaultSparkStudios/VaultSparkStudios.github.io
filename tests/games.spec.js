const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const RELEASED_GAMES = [
  { slug: 'call-of-doodie', title: /Call of Doodie/ },
  { slug: 'gridiron-gm', title: /Gridiron GM/ },
  { slug: 'vaultspark-football-gm', title: /Football GM/ },
];

const UNRELEASED_GAMES = [
  { slug: 'vaultfront', title: /VaultFront/ },
  { slug: 'solara', title: /Solara/ },
  { slug: 'mindframe', title: /MindFrame/ },
  { slug: 'project-unknown', title: /Project Unknown/ },
];

test.describe('Released game pages', () => {
  for (const game of RELEASED_GAMES) {
    test(`${game.slug} page loads`, async ({ page }) => {
      await page.goto(BASE + '/games/' + game.slug + '/');
      await expect(page).toHaveTitle(game.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }
});

test.describe('Unreleased game pages', () => {
  for (const game of UNRELEASED_GAMES) {
    test(`${game.slug} page loads with waitlist`, async ({ page }) => {
      await page.goto(BASE + '/games/' + game.slug + '/');
      await expect(page).toHaveTitle(game.title);
      await expect(page.locator('h1')).toBeVisible();
      // Beta waitlist form should be present
      await expect(page.locator('#waitlist-form')).toBeVisible();
      await expect(page.locator('#waitlist-form input[type="email"]')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }
});
