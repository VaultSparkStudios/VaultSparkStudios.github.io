// VaultSpark Studios — E2E Smoke Tests
// Verifies critical public pages load and render key content
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test.describe('Public pages load', () => {
  test('Homepage renders hero and nav', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page).toHaveTitle(/VaultSpark Studios/);
    await expect(page.locator('nav.site-nav')).toBeVisible();
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
    await expect(page.locator('.lb-table')).toBeVisible();
  });

  test('Journal page renders posts', async ({ page }) => {
    await page.goto(BASE + '/journal/');
    await expect(page).toHaveTitle(/Journal|Signal Log/i);
    await expect(page.locator('article, .post-card, .journal-entry').first()).toBeVisible();
  });

  test('404 page shows custom error', async ({ page }) => {
    await page.goto(BASE + '/this-page-does-not-exist-xyz/');
    await expect(page.locator('body')).toContainText('404');
  });
});

test.describe('Vault Member portal gate', () => {
  test('Shows auth form when not logged in', async ({ page }) => {
    await page.goto(BASE + '/vault-member/');
    // Should show register/login form, not portal content
    await expect(page.locator('#auth-gate, #register-form, #login-form, [id*="register"], [id*="login"]').first()).toBeVisible({ timeout: 8000 });
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
    await expect(page.locator('#nav-menu')).toHaveClass(/open/);
  });
});
