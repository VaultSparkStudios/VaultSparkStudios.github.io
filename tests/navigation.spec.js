const { test, expect } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const fs = require('fs');
const path = require('path');
// S368: a registry game whose /games/<slug>/ page is retired (Voidfall → /universe/voidfall/)
// leaves the Games nav and footer, exactly as propagate-nav's deriveGameNav() renders them.
const hasGamePage = (slug) => fs.existsSync(path.join(__dirname, '..', 'games', slug, 'index.html'));

for (const width of [1280, 1366]) {
 for (const theme of ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']) {
  test(`Desktop header keeps every control inside its container at ${width}px · ${theme}`, async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(t => localStorage.setItem('vs_theme', t), theme);
    await page.goto(BASE + '/');
    await page.keyboard.press('Shift');
    {
      await page.mouse.move(-100, -100);
      await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
      await page.waitForFunction(() => document.fonts.status === 'loaded' &&
        window.VSAfterPaint?.done === true && document.querySelector('.nav-right .vs-rank-orb'),
      null, { timeout: 15000 });
      const geometry = await page.locator('.site-header .nav').evaluate(nav => {
        const bounds = nav.getBoundingClientRect();
        const controls = [...nav.querySelectorAll('a, button')].filter(el => {
          const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0;
        }).map(el => {
          const rect = el.getBoundingClientRect();
          return { label: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 80), left: rect.left, right: rect.right };
        });
        return { left: bounds.left, right: bounds.right, controls };
      });
      expect(geometry.controls.length).toBeGreaterThan(7);
      for (const control of geometry.controls) {
        expect(control.left, `${theme}: ${control.label} left edge`).toBeGreaterThanOrEqual(geometry.left - 0.25);
        expect(control.right, `${theme}: ${control.label} right edge`).toBeLessThanOrEqual(geometry.right + 0.25);
      }
    }
  });
 }
}

test('Anonymous header rank cue and tooltip have readable contrast in light theme', async ({ page }) => {
  test.setTimeout(45000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem('vs_theme', 'light'));
  await page.goto(BASE + '/');
  await page.waitForFunction(() => document.fonts.status === 'loaded' && window.VSAfterPaint?.done === true &&
    document.querySelector('.nav-right .vs-rank-orb-anon'), null, { timeout: 15000 });
  const orb = page.locator('.nav-right .vs-rank-orb-anon');
  await orb.hover();
  await expect(orb.locator('.vs-rank-orb-tip')).toHaveCSS('opacity', '1');
  const ratios = await orb.evaluate(link => {
    const context = document.createElement('canvas').getContext('2d');
    const rgba = color => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].map((v, i) => i === 3 ? v / 255 : v);
    };
    const blend = (foreground, background) => foreground.slice(0, 3).map((v, i) =>
      v * foreground[3] + background[i] * (1 - foreground[3]));
    const luminance = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const body = getComputedStyle(document.body), header = getComputedStyle(link.closest('.site-header'), '::before');
    const base = blend(rgba(body.getPropertyValue('--bg').trim() || body.backgroundColor), [255, 255, 255]);
    const headerColor = blend(rgba(header.backgroundColor), base);
    const tip = getComputedStyle(link.querySelector('.vs-rank-orb-tip'));
    const tipBackground = blend(rgba(tip.backgroundColor), headerColor);
    return {
      icon: contrast(blend(rgba(getComputedStyle(link.querySelector('.vs-rank-orb-num')).color), headerColor), headerColor),
      ring: contrast(blend(rgba(getComputedStyle(link, '::before').borderTopColor), headerColor), headerColor),
      tooltip: contrast(blend(rgba(tip.color), tipBackground), tipBackground),
    };
  });
  expect.soft(ratios.icon, 'anonymous rank icon contrast').toBeGreaterThanOrEqual(3);
  expect.soft(ratios.ring, 'anonymous rank ring contrast').toBeGreaterThanOrEqual(3);
  expect.soft(ratios.tooltip, 'rank tooltip text contrast').toBeGreaterThanOrEqual(4.5);
});

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

  test('Create Account CTA opens free Vault Membership signup', async ({ page }) => {
    // S409: open member signup is separate from approved investor access.
    await page.goto(BASE + '/');
    const joinBtn = page.locator('.nav-right a[data-vs-join]');
    await expect(joinBtn).toBeVisible();
    await expect(joinBtn).toHaveText('Create Account');
    await expect(joinBtn).toHaveAttribute('href', '/vault-member/#register');
    await joinBtn.click();
    await expect(page).toHaveURL(new URL('/vault-member/#register', BASE).href);
    const signup = page.locator('#obelisk-create-account');
    await expect(signup).toBeVisible();
    await expect(signup).toContainText('Create your free account');
    await expect(page.getByText('No membership invite or payment card required.', { exact: true })).toBeVisible();
    await expect.poll(async () => {
      const url = new URL(await signup.getAttribute('href'), page.url());
      return { origin: url.origin, path: url.pathname, intent: url.searchParams.get('intent'), destination: url.searchParams.get('return') };
    }).toEqual({ origin: new URL(BASE).origin, path: '/login', intent: 'signup', destination: '/vault-member/#register' });
  });

  test('Sign In link exists in nav', async ({ page }) => {
    await page.goto(BASE + '/');
    const signIn = page.locator('.nav-signin');
    await expect(signIn).toBeVisible();
  });
});
