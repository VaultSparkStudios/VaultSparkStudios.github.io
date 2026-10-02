const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const fs = require('fs');
const path = require('path');
// S368: a registry game whose /games/<slug>/ page is retired (Voidfall → /universe/voidfall/)
// leaves the Games nav and footer, exactly as propagate-nav's deriveGameNav() renders them.
const hasGamePage = (slug) => fs.existsSync(path.join(__dirname, '..', 'games', slug, 'index.html'));

test.describe('Site navigation', () => {
  test.describe.configure({ mode: 'serial' });

  test('Skip link exists and targets main content', async ({ page }) => {
    await page.goto(BASE + '/');
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('Header contains brand link to homepage', async ({ page }) => {
    await page.goto(BASE + '/games/');
    const brand = page.locator('.brand[href="/"]');
    await expect(brand).toBeVisible();
  });

  test('Games dropdown lists every statused registry game plus All Games', async ({ page }) => {
    await page.goto(BASE + '/');
    const gameLinks = page.locator('.nav-dropdown a[href*="/games/"]');
    // S367: derived from data/game-registry.json so a new title cannot strand this test.
    // D-S368.3: a `sealed` teaser has no vault status, so it sits in no nav status group.
    const registryGames = Object.entries(require('../data/game-registry.json').games)
      .filter(([slug, g]) => ['sparked', 'forge', 'vaulted'].includes(g.status) && hasGamePage(slug)).length;
    await expect(gameLinks).toHaveCount(registryGames + 1);
    await expect(page.locator('.nav-dropdown a[href="/play/"]')).toHaveCount(1);
  });

  test('Footer contains expected sections', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page.locator('footer.site-footer')).toBeVisible();
    await expect(page.locator('footer a[href="/privacy/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/terms/"]')).toHaveCount(1);
  });

  test('Footer Games column links every registry game', async ({ page }) => {
    // S368: the footer Games column renders from deriveGameNav() (propagate-nav), so
    // every registry game page must be reachable from it — derived, never a literal.
    await page.goto(BASE + '/');
    const games = require('../data/game-registry.json').games;
    for (const slug of Object.keys(games)) {
      await expect(page.locator(`footer.site-footer a[href="/games/${slug}/"]`)).toHaveCount(hasGamePage(slug) && ['sparked', 'forge', 'vaulted'].includes(games[slug].status) ? 1 : 0);
    }
  });

  test('Projects dropdown SPARKED group matches the canon feed', async ({ page }) => {
    // S368: SPARKED projects in the nav must be exactly the SPARKED non-game entries
    // of api/public-intelligence.json (studio-ops canon) — no FORGE title promoted.
    await page.goto(BASE + '/');
    const feed = require('../api/public-intelligence.json');
    const gameIds = new Set([...Object.keys(require('../data/game-registry.json').games), 'football-gm']);
    const expected = feed.catalog.filter((c) => c.status === 'SPARKED' && c.type !== 'game' && !gameIds.has(c.id)).map((c) => c.name).sort();
    const labels = await page.locator('.nav-dropdown').filter({ has: page.locator('.dropdown-label', { hasText: /^Projects$/ }) })
      .evaluate((el) => {
        const out = [];
        let inSparked = false;
        for (const node of el.children) {
          if (node.classList.contains('dropdown-label')) inSparked = node.classList.contains('dropdown-status-sparked');
          else if (inSparked && node.tagName === 'A') out.push(node.textContent.trim());
        }
        return out;
      });
    expect(labels.sort()).toEqual(expected);
  });

  test('Request Invite CTA button exists in nav', async ({ page }) => {
    // D-S367.2: enrolment is invite-led, so the header CTA requests an invite.
    await page.goto(BASE + '/');
    const joinBtn = page.locator('.nav-right a[data-vs-join][href="/contact/?topic=invite"]');
    await expect(joinBtn).toBeVisible();
  });

  test('Sign In link exists in nav', async ({ page }) => {
    await page.goto(BASE + '/');
    const signIn = page.locator('.nav-signin');
    await expect(signIn).toBeVisible();
  });
});
