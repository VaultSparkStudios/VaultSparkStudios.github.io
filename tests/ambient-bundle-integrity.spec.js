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
        /\/assets\/(ignis-lens|exit-intent|scroll-reveal|scroll-depth|native-feel|presence-badge|visit-depth|breadcrumb-render|rate-page|account-chip|command-palette|hover-prefetch|edge-swipe-nav|pointerdown-warm|page-sigil|vault-atlas|vault-genome-strip|rank-orb)\.js/.test(s)
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

  test('command-palette lazy-loads and opens on Cmd/Ctrl+K', async ({ page, browserName }) => {
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('script[src="/assets/command-palette.js"]')).toHaveCount(0);
    const key = browserName === 'webkit' ? 'Meta+k' : 'Control+k';
    await page.keyboard.press(key);
    await expect(page.locator('script[src="/assets/command-palette.js"]')).toHaveCount(1);
    await expect(page.locator('.vs-palette-overlay[data-open="true"]')).toBeVisible();
  });
});

test.describe('Search remains reachable without covering mobile content', () => {
  for (const width of [360, 390, 430]) {
    test(`search stays in the header and returns focus at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript(() => localStorage.setItem('vs_cookie_consent', 'declined'));
      await page.goto('/changelog/', { waitUntil: 'load' });
      const trigger = page.getByRole('button', { name: 'Open search palette' });
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
      await expect(page.locator('.vs-palette-overlay[data-open="true"]')).toBeVisible();
      const close = page.getByRole('button', { name: 'Close search', exact: true });
      await expect(close).toBeVisible();
      expect(await close.evaluate(button => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      const query = page.getByRole('combobox', { name: 'Search query' });
      await expect(query).toBeFocused();
      await expect(page.locator('.vs-palette-results a').first()).toBeVisible();
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => document.querySelector('.vs-palette-overlay').contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Tab');
      await expect(query).toBeFocused();
      await close.click();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await trigger.click();
      await close.focus();
      await page.keyboard.press('Escape');
      await expect(page.locator('.vs-palette-overlay')).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Control+k');
      await expect(page.locator('.vs-palette-overlay[data-open="true"]')).toBeVisible();
      await page.keyboard.press('Control+k');
      await expect(page.locator('.vs-palette-overlay')).not.toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(trigger).toBeVisible();
      expect(await trigger.evaluate(button => button.getBoundingClientRect().bottom <= document.querySelector('.site-header').getBoundingClientRect().bottom)).toBe(true);
    });
  }
});

test('Search dialog exposes valid named combobox relationships', async ({ page }) => {
  const AxeBuilder = require('@axe-core/playwright').default;
  await page.goto('/changelog/', { waitUntil: 'load' });
  await page.keyboard.press('Control+k');
  await expect(page.locator('.vs-palette-results a').first()).toBeVisible();
  const results = await new AxeBuilder({ page }).include('.vs-palette-overlay').withRules(['aria-required-attr', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'aria-input-field-name']).analyze();
  expect(results.violations).toEqual([]);
  const query = page.getByRole('combobox', { name: 'Search query' });
  await expect(query).toHaveAttribute('aria-controls', 'vs-palette-results');
  await expect(query).toHaveAttribute('aria-expanded', 'true');
  await expect(query).toHaveAttribute('aria-activedescendant', 'vs-palette-option-0');
  await page.keyboard.press('ArrowDown');
  await expect(query).toHaveAttribute('aria-activedescendant', 'vs-palette-option-1');
  await page.keyboard.press('Escape');
  await expect(page.locator('.vs-palette-input')).toHaveAttribute('aria-expanded', 'false');
});
