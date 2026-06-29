// S98 surfaces — smoke coverage for ambient assets + new public API endpoints.
// Verifies the homepage actually hydrates the Portfolio Heartbeat + Founder
// Presence payloads and that the sitewide ambient block is present, so future
// propagator or generator regressions fail the test suite instead of the user.
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test('homepage loads S98 ambient assets and hydrates heartbeat grid', async ({ page }) => {
  test.setTimeout(30000);
  const responses = new Map();
  page.on('response', (res) => {
    const u = res.url();
    if (/\/assets\/(ignis-lens|vault-oracle|exit-intent|presence-badge|visit-depth|heartbeat|ignis-tour)\.js/.test(u)) {
      responses.set(new URL(u).pathname, res.status());
    }
    if (/\/api\/(heartbeat|founder-presence)\.json/.test(u)) {
      responses.set(new URL(u).pathname, res.status());
    }
  });

  await page.goto(BASE + '/', { waitUntil: 'load' });

  // Ambient block is present in the DOM.
  const ambientPresent = await page.evaluate(() =>
    document.documentElement.outerHTML.includes('vs-ambient:start'));
  expect(ambientPresent, 'ambient marker is missing — propagator did not inject').toBe(true);

  // Heartbeat widget mounted — should have the vs-hb class applied (or honest empty state).
  const hbRoot = page.locator('[data-heartbeat]');
  await expect(hbRoot).toBeAttached();
  const hbHtml = await hbRoot.innerHTML();
  expect(hbHtml.length, 'heartbeat widget rendered no content').toBeGreaterThan(20);

  // Critical ambient scripts served with 2xx.
  // ignis-lens.js excluded: loaded only on game/project/universe pages (not homepage)
  const required = [
    '/assets/presence-badge.js',
    '/assets/visit-depth.js',
    '/assets/exit-intent.js',
    '/api/heartbeat.json',
    '/api/founder-presence.json',
  ];
  for (const p of required) {
    const code = responses.get(p);
    expect(code, `expected ${p} to return 2xx, got ${code}`).toBeDefined();
    expect(code, `expected ${p} to return 2xx, got ${code}`).toBeGreaterThanOrEqual(200);
    expect(code, `expected ${p} to return 2xx, got ${code}`).toBeLessThan(400);
  }
});

test('founder-presence endpoint returns canonical shape', async ({ request }) => {
  const res = await request.get(BASE + '/api/founder-presence.json');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty('generatedAt');
  expect(body).toHaveProperty('live');
  expect(typeof body.live).toBe('boolean');
});

test('heartbeat endpoint returns project list with tier + pulses', async ({ request }) => {
  const res = await request.get(BASE + '/api/heartbeat.json');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.projects)).toBe(true);
  if (body.projects.length) {
    const p = body.projects[0];
    expect(p).toHaveProperty('slug');
    expect(p).toHaveProperty('tier');
    expect(p).toHaveProperty('pulses7d');
    expect(p).toHaveProperty('pulses30d');
  }
});
