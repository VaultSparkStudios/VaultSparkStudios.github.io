// VaultSpark Studios — E2E Smoke Tests
// Verifies critical public pages load and render key content
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Public pages load', () => {
  test('Homepage renders hero and nav', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page).toHaveTitle(/VaultSpark Studios/);
    // Nav uses id="nav-menu" with class="nav-center" (not site-nav)
    await expect(page.locator('#nav-menu')).toBeAttached();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Games hub loads game cards', async ({ page }) => {
    await page.goto(BASE + '/games/');
    await expect(page).toHaveTitle(/Games/);
    await expect(page.locator('.game-card').first()).toBeVisible();
  });

  test('Community page renders stats', async ({ page }) => {
    await page.goto(BASE + '/community/');
    await expect(page).toHaveTitle(/Community/);
    await expect(page.locator('.comm-stats')).toBeVisible();
  });

  test('Leaderboards page renders table', async ({ page }) => {
    await page.goto(BASE + '/leaderboards/');
    await expect(page).toHaveTitle(/Leaderboard/);
    await expect(page.locator('.lb-table').first()).toBeVisible();
  });

  test('Journal page renders posts', async ({ page }) => {
    await page.goto(BASE + '/journal/');
    await expect(page).toHaveTitle(/Journal|Signal Log/i);
    await expect(page.locator('article, .post-card, .journal-entry').first()).toBeVisible();
  });

  test('404 page shows custom error', async ({ page }) => {
    await page.goto(BASE + '/this-page-does-not-exist-xyz/');
    // Custom 404 has "404" in title and err-code; local preview serves 404.html too
    await expect(page).toHaveTitle(/404/);
  });
});

test.describe('Vault Member portal gate', () => {
  test('Shows the Obelisk entry ceremony when not logged in', async ({ page }) => {
    await page.goto(BASE + '/vault-member/');
    await expect(page.locator('#obelisk-create-account')).toBeAttached({ timeout: 8000 });
    await expect(page.locator('#obelisk-sign-in')).toBeAttached();
    const visibleEntry = page.locator('#obelisk-create-account:visible, #obelisk-sign-in:visible');
    await expect(visibleEntry).toHaveCount(1);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });
});

test.describe('Navigation', () => {
  test('Games dropdown contains all games', async ({ page }) => {
    await page.goto(BASE + '/');
    const gamesNav = page.locator('.nav-dropdown a[href="/games/call-of-doodie/"]');
    await expect(gamesNav).toHaveCount(1);
  });

  test('Mobile hamburger menu toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE + '/');
    const hamburger = page.locator('#hamburger');
    await hamburger.click();
    // nav-sheet.js opens a bottom sheet and sets aria-expanded on the hamburger
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
  });
});
