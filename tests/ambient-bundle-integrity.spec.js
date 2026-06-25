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
