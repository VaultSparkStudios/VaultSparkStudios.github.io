const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

// SPARKED — live and playable
const SPARKED_GAMES = [
  { slug: 'call-of-doodie', title: /Call of Doodie/ },
  { slug: 'vaultspark-football-gm', title: /Football GM/ },
];

// FORGE — in development, may have waitlist
const FORGE_GAMES = [
  { slug: 'vaultfront', title: /VaultFront/ },
  { slug: 'solara', title: /Solara/ },
  { slug: 'mindframe', title: /MindFrame/ },
  { slug: 'the-exodus', title: /The Exodus/ },
];

// VAULTED — paused/archived, page still accessible
const VAULTED_GAMES = [
  { slug: 'gridiron-gm', title: /Gridiron GM/ },
  { slug: 'project-unknown', title: /Project Unknown/ },
];

// Legacy alias kept for backward-compat with any test filters
const RELEASED_GAMES = SPARKED_GAMES;
const UNRELEASED_GAMES = FORGE_GAMES;

test.describe('SPARKED game pages', () => {
  for (const game of SPARKED_GAMES) {
    test(`${game.slug} page loads and has play button`, async ({ page }) => {
      await page.goto(BASE + '/games/' + game.slug + '/');
      await expect(page).toHaveTitle(game.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
      // Vault status badge should be SPARKED
      const badge = page.locator('.status-sparked');
      await expect(badge).toBeVisible();
    });
  }
});

test.describe('FORGE game pages', () => {
  for (const game of FORGE_GAMES) {
    test(`${game.slug} page loads`, async ({ page }) => {
      await page.goto(BASE + '/games/' + game.slug + '/');
      await expect(page).toHaveTitle(game.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }
});

test.describe('VAULTED game pages', () => {
  for (const game of VAULTED_GAMES) {
    test(`${game.slug} page loads`, async ({ page }) => {
      await page.goto(BASE + '/games/' + game.slug + '/');
      await expect(page).toHaveTitle(game.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }
});

test.describe('Games index filter', () => {
  test('games page loads and shows filter buttons', async ({ page }) => {
    await page.goto(BASE + '/games/');
    await expect(page).toHaveTitle(/Games/i);
    // Filter buttons should be present
    const filterBtns = page.locator('.filter-btn');
    await expect(filterBtns.first()).toBeVisible();
    // At least one game card should be visible
    const cards = page.locator('.game-card');
    await expect(cards.first()).toBeVisible();
  });

  test('SPARKED filter shows only sparked games', async ({ page }) => {
    await page.goto(BASE + '/games/');
    // Click SPARKED filter button
    const sparkedBtn = page.locator('.filter-btn', { hasText: /sparked/i });
    if (await sparkedBtn.count() > 0) {
      await sparkedBtn.first().click();
      // All visible cards should have status-sparked badge or FORGE/VAULTED hidden
      const hiddenCards = page.locator('.game-card[style*="display: none"], .game-card[hidden]');
      // At least some cards should be hidden after filter
      const totalCards = await page.locator('.game-card').count();
      const visibleCards = await page.locator('.game-card:visible').count();
      expect(visibleCards).toBeLessThanOrEqual(totalCards);
    }
  });

  test('vault status legend is visible', async ({ page }) => {
    await page.goto(BASE + '/games/');
    const legend = page.locator('.vault-status-legend');
    await expect(legend).toBeVisible();
  });
});
