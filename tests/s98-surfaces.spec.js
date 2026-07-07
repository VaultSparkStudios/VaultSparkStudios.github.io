// S98 surfaces — smoke coverage for ambient assets + new public API endpoints.
// Verifies the homepage hydrates Founder Presence payloads and keeps the
// retired Portfolio Heartbeat off the public homepage, so future
// propagator or generator regressions fail the test suite instead of the user.
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';

test('homepage loads S98 ambient assets without retired heartbeat widget', async ({ page }) => {
  test.setTimeout(30000);
  const responses = new Map();
  page.on('response', (res) => {
    const u = res.url();
    if (/\/assets\/(ambient-core\.shell-[a-f0-9]+|ambient-feature\.shell-[a-f0-9]+)\.js/.test(u)) {
      responses.set(new URL(u).pathname, res.status());
    }
    if (/\/api\/(founder-presence)\.json/.test(u)) {
      responses.set(new URL(u).pathname, res.status());
    }
  });

  await page.goto(BASE + '/', { waitUntil: 'load' });

  // Ambient block is present in the DOM.
  const ambientPresent = await page.evaluate(() =>
    document.documentElement.outerHTML.includes('vs-ambient:start'));
  expect(ambientPresent, 'ambient marker is missing — propagator did not inject').toBe(true);

  // Public homepage heartbeat was retired because its feed was not accurate enough.
  await expect(page.locator('[data-heartbeat]')).toHaveCount(0);

  // Critical ambient shells and founder-presence feed served with 2xx.
  const shellCodes = Array.from(responses.entries()).filter(([p]) => /^\/assets\/ambient-(core|feature)\.shell-[a-f0-9]+\.js$/.test(p));
  expect(shellCodes.length, 'expected ambient core + feature shell responses').toBeGreaterThanOrEqual(2);
  for (const [p, code] of shellCodes) {
    expect(code, `expected ${p} to return 2xx, got ${code}`).toBeGreaterThanOrEqual(200);
    expect(code, `expected ${p} to return 2xx, got ${code}`).toBeLessThan(400);
  }
  const presenceCode = responses.get('/api/founder-presence.json');
  expect(presenceCode, `expected founder-presence feed to return 2xx, got ${presenceCode}`).toBeDefined();
  expect(presenceCode).toBeGreaterThanOrEqual(200);
  expect(presenceCode).toBeLessThan(400);});

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
