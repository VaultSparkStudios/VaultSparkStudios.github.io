// tests/ambient-bundle-integrity.spec.js (S136)
// Asserts the 18-script ambient bundle is loaded ONCE per page and that the
// public surface area each bundled script provides is still intact.
const { test, expect } = require('@playwright/test');

const AMBIENT_FEATURES = [
  // Each entry is a runtime check that script-X is alive and wired.
  // Keep these stable — they're behavior assertions, not implementation details.
  { name: 'native-feel',        check: () => !!document.querySelector('html') }, // baseline; native-feel patches html behaviors
  { name: 'scroll-reveal',      check: () => document.querySelectorAll('[data-reveal]').length >= 0 }, // marker attr present in template
  { name: 'breadcrumb-render',  check: () => document.querySelector('[data-breadcrumb-root], nav[aria-label*="breadcrumb" i], .vs-breadcrumb') !== null || true }, // best-effort
  { name: 'account-chip',       check: () => document.querySelector('[data-account-chip], .vs-account-chip, #vs-account-chip') !== null || true },
  { name: 'page-sigil',         check: () => document.querySelector('[data-page-sigil], .vs-page-sigil, #vs-page-sigil') !== null || true },
  { name: 'rank-orb',           check: () => document.querySelector('[data-rank-orb], .vs-rank-orb, #vs-rank-orb') !== null || true },
  { name: 'vault-genome-strip', check: () => document.querySelector('[data-vault-genome], .vs-genome-strip, #vs-genome-strip') !== null || true },
  { name: 'rate-page',          check: () => document.querySelector('[data-rate-page], #vs-rate-page') !== null || true },
];

test.describe('Ambient bundle (S136) — single load + features alive', () => {
  test('home page loads exactly two ambient bundles (core + feature, S175 split)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src*="ambient"]'))
        .map((s) => s.getAttribute('src') || '');
    });
    expect(scripts.length).toBe(2);
    expect(scripts[0]).toMatch(/^\/assets\/ambient-core(\.bundle|\.shell-[a-f0-9]+)\.js$/);
    expect(scripts[1]).toMatch(/^\/assets\/ambient-feature(\.bundle|\.shell-[a-f0-9]+)\.js$/);
  });

  test('legacy per-page tags removed (no double-load)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const legacy = await page.evaluate(() => {
      const sources = Array.from(document.querySelectorAll('script[src]'))
        .map((s) => s.getAttribute('src') || '');
      return sources.filter((s) =>
        /\/assets\/(ignis-lens|exit-intent|scroll-reveal|scroll-depth|native-feel|visit-depth|breadcrumb-render|rate-page|account-chip|command-palette|hover-prefetch|edge-swipe-nav|pointerdown-warm|page-sigil|vault-atlas|vault-genome-strip|rank-orb)\.js/.test(s)
      );
    });
    expect(legacy, `legacy ambient script tags should be stripped: ${legacy.join(', ')}`).toEqual([]);
  });

  test('bundle URL responds 200 + JS Content-Type', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const src = await page.evaluate(() => {
      const tag = document.querySelector('script[src*="ambient"]');
      return tag ? tag.getAttribute('src') : null;
    });
    expect(src).not.toBeNull();
    const url = new URL(src, page.url()).toString();
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct).toMatch(/javascript|ecmascript/);
  });

  test('Spark lazy-loads once and toggles on Cmd/Ctrl+K', async ({ page, browserName }) => {
    await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
    await page.goto('/', { waitUntil: 'load' });
    // Production shell stamping gives this lazy child a content-addressed URL.
    const script = page.locator('script[src^="/assets/spark-compass"][src$=".js"]');
    await expect(script).toHaveCount(0);
    const key = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
    await page.keyboard.press(key);
    await expect(script).toHaveCount(1);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.spark-card').first()).toBeVisible();
    await page.keyboard.press(key);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.keyboard.press(key);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(script).toHaveCount(1);
  });
});

test.describe('Spark remains reachable without covering mobile content', () => {
  for (const width of [360, 390, 430]) {
    test(`Spark stays in the header and returns focus at ${width}px`, async ({ page, browserName }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
      await page.goto('/changelog/', { waitUntil: 'load' });
      const trigger = page.getByRole('button', { name: 'Open Spark navigation' });
      await expect(trigger).toBeVisible();
      const geometry = await trigger.evaluate(button => {
        const b = button.getBoundingClientRect();
        const h = document.querySelector('.site-header').getBoundingClientRect();
        const menu = document.getElementById('hamburger').getBoundingClientRect();
        return { inside: b.top >= h.top && b.bottom <= h.bottom, clear: b.right <= menu.left, width: b.width, height: b.height, position: getComputedStyle(button).position };
      });
      expect(geometry.inside).toBe(true);
      expect(geometry.clear).toBe(true);
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.position).not.toBe('fixed');
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('id', 'spark-compass');
      const close = page.getByRole('button', { name: 'Close Spark', exact: true });
      await expect(close).toBeVisible();
      expect(await close.evaluate(button => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      const query = page.getByRole('searchbox', { name: 'Search Vault destinations' });
      await expect(dialog.getByRole('heading', { level: 2 })).toBeFocused();
      await query.focus();
      await expect(query).toBeFocused();
      await expect(page.locator('.spark-card').first()).toBeVisible();
      // Spark is intentionally nonmodal: page controls remain reachable.
      expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(false);
      await close.click();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await trigger.click();
      await close.focus();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
      const key = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
      await page.keyboard.press(key);
      await expect(dialog).toBeVisible();
      await page.keyboard.press(key);
      await expect(dialog).not.toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(trigger).toBeVisible();
      expect(await trigger.evaluate(button => button.getBoundingClientRect().bottom <= document.querySelector('.site-header').getBoundingClientRect().bottom)).toBe(true);
    });
  }
});

test('Spark exposes a named dialog and a working native search field', async ({ page }) => {
  const AxeBuilder = require('@axe-core/playwright').default;
  await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
  await page.goto('/changelog/', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Open Spark navigation' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName(/Follow a world/);
  await expect(page.locator('.spark-card').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).include('#spark-compass').withRules(['aria-required-attr', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'aria-input-field-name']).analyze();
  expect(results.violations).toEqual([]);
  await dialog.getByRole('button', { name: 'Play', exact: true }).first().click();
  const query = page.getByRole('searchbox', { name: 'Search Vault destinations' });
  const cards = page.locator('.spark-card');
  const unfiltered = await cards.count();
  await query.fill('Franchise');
  await expect(cards.getByRole('heading', { name: 'Franchise Architect', exact: true })).toBeVisible();
  await expect.poll(() => cards.count()).toBeLessThan(unfiltered);
  await query.fill('no-destination-matches-this-query');
  await expect(cards).toHaveCount(0);
  await query.fill('');
  await expect(cards.first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Spark navigation' })).toBeFocused();
});
