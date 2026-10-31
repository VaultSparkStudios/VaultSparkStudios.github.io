const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Leaderboards main page', () => {
  test('renders game tabs', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-game-tab')).toHaveCount(7);
  });

  test('Global tab is active by default', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-game-tab.active')).toContainText('Global');
  });

  test('clicking Challenges tab shows challenges panel', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await page.locator('.lb-game-tab[data-game="challenges"]').click();
    await expect(page.locator('#lb-panel-challenges')).toHaveClass(/active/);
  });

  test('clicking Weekly tab shows weekly panel', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await page.locator('.lb-game-tab[data-game="weekly"]').click();
    await expect(page.locator('#lb-panel-weekly')).toHaveClass(/active/);
  });

  test('global periods switch between all-time and the current season', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    const periods = page.locator('#lb-panel-global .lb-period-tab');
    await expect(periods).toHaveText(['All Time', 'This Season']);
    const season = periods.filter({ hasText: 'This Season' });
    await season.click();
    await expect(season).toHaveClass(/active/);
    await expect(periods.filter({ hasText: 'All Time' })).not.toHaveClass(/active/);
    await periods.filter({ hasText: 'All Time' }).click();
    await expect(periods.filter({ hasText: 'All Time' })).toHaveClass(/active/);
    await page.locator('.lb-game-tab[data-game="weekly"]').click();
    await expect(page.locator('#lb-panel-weekly')).toBeVisible();
  });

  test('sort filter buttons exist', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-filter')).toHaveCount(2);
  });

  test('stats strip renders', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-stats-strip')).toBeVisible();
  });
});

const SEO_PAGES = [
  // 'global' was retired into /leaderboards/#global by a _redirects 301; it has no sub-page.
  { slug: 'challenges', title: /Challenge.*Leaderboard/ },
  { slug: 'recruiters', title: /Recruiters/ },
  { slug: 'football-gm', title: /Franchise Architect/ },
  { slug: 'call-of-doodie', title: /Call of Doodie/ },
  { slug: 'teams', title: /Team Rankings/ },
  { slug: 'weekly', title: /Weekly/ },
];

test.describe('Leaderboard SEO sub-pages', () => {
  for (const pg of SEO_PAGES) {
    test(`/leaderboards/${pg.slug}/ loads with correct title`, async ({ page }) => {
      await page.goto(BASE + '/leaderboards/' + pg.slug + '/');
      await expect(page).toHaveTitle(pg.title);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('link', { name: 'View Full Leaderboard' })).toBeVisible();
    });
  }
});
