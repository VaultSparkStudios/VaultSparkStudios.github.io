// tests/oracle-extra.spec.js (S136)
// Smoke spec for the 4 new Oracle intelligence panels + chart hover crosshair.
// Runs against the live site by default (playwright.config.js sets baseURL).
// NOTE: Requires live IGNIS API data — skipped in local preview mode.
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE_URL);

test.describe('Ecosystem Oracle — S136 expansion', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(IS_LOCAL, 'Oracle panels require live IGNIS API data — not available in local preview');
    await page.goto('/oracle/', { waitUntil: 'load' });
    // Wait for the velocity feeds to land and oracle-extra.js to render.
    await page.waitForFunction(() => {
      const insights = document.getElementById('oracle-insights');
      return insights && insights.querySelectorAll('article').length > 0;
    }, { timeout: 15000 });
  });

  test('Smart Insights panel renders 3-4 narrative cards', async ({ page }) => {
    const insights = page.locator('#oracle-insights article');
    const count = await insights.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(4);
    // Each card must have an eyebrow + headline + body.
    const first = insights.first();
    await expect(first.locator('.eyebrow')).toBeVisible();
    await expect(first.locator('h3')).toBeVisible();
    await expect(first.locator('p')).toBeVisible();
  });

  test('Activity Heatmap renders 60-day grid', async ({ page }) => {
    const cells = page.locator('#oracle-heatmap > div:first-child > div');
    const count = await cells.count();
    // Allow a small drift in case the rolling window edge-aligns differently;
    // the build-ecosystem-velocity script targets 60.
    expect(count).toBeGreaterThanOrEqual(55);
    expect(count).toBeLessThanOrEqual(62);
    // Hovering a cell should reveal a date+count title attribute.
    const titled = await cells.first().getAttribute('title');
    expect(titled).toMatch(/^\d{4}-\d{2}-\d{2}\b/);
  });

  test('Lifecycle Donut renders ≥1 SVG segment + project total', async ({ page }) => {
    const donut = page.locator('#oracle-lifecycle svg');
    await expect(donut).toBeVisible();
    const segments = donut.locator('path');
    expect(await segments.count()).toBeGreaterThanOrEqual(1);
    // Center label shows the project count (digit).
    await expect(donut.locator('text').first()).toContainText(/\d+/);
  });

  test('Top Movers panel renders 3 leadership cards', async ({ page }) => {
    const movers = page.locator('#oracle-movers article');
    expect(await movers.count()).toBe(3);
    // Each card must name a project and a metric.
    for (let i = 0; i < 3; i++) {
      await expect(movers.nth(i).locator('h3')).toBeVisible();
    }
  });

  test('Velocity chart hover shows date + values', async ({ page }) => {
    const chart = page.locator('#oracle-velocity-chart');
    await expect(chart).toBeVisible();
    await chart.scrollIntoViewIfNeeded();
    const label = page.locator('#vel-hover-label');
    // Before hover: label is empty.
    expect((await label.textContent())?.trim()).toBe('');
    // Dispatch a pointer event against the SVG's own bounds. This is more
    // stable than OS-level mouse movement on local Windows runners.
    await page.evaluate(() => {
      const svg = document.getElementById('oracle-velocity-chart');
      if (!svg) throw new Error('chart not visible');
      const rect = svg.getBoundingClientRect();
      svg.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
    });
    await page.waitForFunction(() => {
      const el = document.getElementById('vel-hover-label');
      return el && el.textContent && el.textContent.trim().length > 0;
    }, { timeout: 5000 });
    const text = (await label.textContent())?.trim() || '';
    // Format: "YYYY-MM-DD · N signals · M worlds · cognition X"
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2}\s+·\s+\d+\s+signals?/);
    expect(text).toMatch(/·\s+\d+\s+worlds?/);
    expect(text).toMatch(/·\s+cognition\b/);
  });

  test('Layer 3 comparison deck renders and keeps shareable compare state', async ({ page }) => {
    const selectA = page.locator('#oracle-compare-a');
    const selectB = page.locator('#oracle-compare-b');
    await expect(selectA).toBeVisible();
    await expect(selectB).toBeVisible();
    expect(await selectA.locator('option').count()).toBeGreaterThanOrEqual(2);
    expect(await selectB.locator('option').count()).toBeGreaterThanOrEqual(2);

    const cards = page.locator('#oracle-comparison article');
    expect(await cards.count()).toBe(2);
    await expect(cards.first()).toContainText(/signals/i);
    await expect(cards.first()).toContainText(/friction/i);

    const href = await page.locator('#oracle-compare-share').getAttribute('href');
    expect(href).toMatch(/^\/oracle\/\?compare=[^&]+(%2C|,)[^&]+/);
    expect(page.url()).toContain('compare=');
  });

  test('Layer 3 gravity panel renders public relationship cards', async ({ page }) => {
    const gravityCards = page.locator('#oracle-gravity article');
    expect(await gravityCards.count()).toBeGreaterThanOrEqual(1);
    await expect(gravityCards.first()).toContainText(/Gravity/i);
    await expect(gravityCards.first()).toContainText(/worlds pull together/i);
  });

  test('Velocity chart includes public event markers', async ({ page }) => {
    const markers = page.locator('#vel-event-markers .vel-event-marker');
    expect(await markers.count()).toBeGreaterThanOrEqual(2);
    await expect(markers.first()).toBeVisible();
    const markerText = await page.locator('#vel-event-markers').textContent();
    expect(markerText).toMatch(/LOUDEST DAY|COGNITION CREST|LATEST PULSE/);
  });

  test('Oracle visible copy stays public-facing', async ({ page }) => {
    const visibleText = await page.locator('main').innerText();
    expect(visibleText).not.toMatch(/commit volume|commit count|blocker count|blockers?|PROJECT_STATUS\.json|portfolio-pulse\.json/i);
    expect(visibleText).toMatch(/studio signals|friction|Oracle feeds/i);
  });
});
