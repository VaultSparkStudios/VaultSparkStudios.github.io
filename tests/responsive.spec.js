const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

const MOBILE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };

test.describe('Mobile viewport (375px)', () => {
  test.use({ viewport: MOBILE });

  test('Hamburger is visible on mobile', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('#hamburger')).toBeVisible();
  });

  test('Nav menu is hidden until hamburger clicked', async ({ page }) => {
    await page.goto(BASE + '/');
    const navMenu = page.locator('#nav-menu');
    // Menu should not have .open class initially
    await expect(navMenu).not.toHaveClass(/open/);
    await page.locator('#hamburger').click();
    await expect(navMenu).toHaveClass(/open/);
  });

  test('Games page renders on mobile', async ({ page }) => {
    await page.goto(BASE + '/games/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.game-card').first()).toBeVisible();
  });

  test('Leaderboard table is scrollable on mobile', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page.locator('.lb-table-wrap').first()).toBeVisible();
  });

  test('Contact form usable on mobile', async ({ page }) => {
    await page.goto(BASE + '/contact/');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });
});

test.describe('Tablet viewport (768px)', () => {
  test.use({ viewport: TABLET });

  test('Homepage renders correctly on tablet', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();
  });
});

test.describe('Desktop viewport (1440px)', () => {
  test.use({ viewport: DESKTOP });

  test('Hamburger is hidden on desktop', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('#hamburger')).not.toBeVisible();
  });

  test('Nav links are visible on desktop', async ({ page }) => {
    await page.goto(BASE + '/');
    const navCenter = page.locator('.nav-center');
    await expect(navCenter).toBeVisible();
  });
});
