// csrf-token.unit.spec.js — assets/csrf-token.js (window.VSCsrf).
// Guards the token cache contract used by contact/ask-founders/desk-comments POSTs:
// one /_csrf fetch, sessionStorage cache with a 30s safety margin, in-flight
// de-duplication, and recovery after failure. /_csrf is mocked on a fixture origin.
// Run: node --test tests/csrf-token.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, ORIGIN } from './fixtures/browser-harness.mjs';

const FIXTURE = html({ body: '<script src="/assets/csrf-token.js"></script>' });

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function setup() {
  const state = { calls: 0, responses: [] };
  const f = await openFixture(browser, {
    pages: { '/contact/': FIXTURE },
    handlers: [{
      match: (u) => u.origin === ORIGIN && u.pathname === '/_csrf',
      handle: async (route) => {
        state.calls += 1;
        const r = state.responses.shift() || { status: 200, body: { token: `tok-${state.calls}`, ttlSec: 3600 } };
        if (r.delayMs) await new Promise((done) => setTimeout(done, r.delayMs));
        await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
      },
    }],
  });
  await f.goto('/contact/');
  return { f, state };
}

const getToken = (page) => page.evaluate(() => window.VSCsrf.getToken().then((t) => ({ ok: true, t }), (e) => ({ ok: false, m: e.message })));
const stored = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('vs_csrf_v1') || 'null'));

test('fetches /_csrf once, caches with TTL, and survives a reload within the tab session', async () => {
  const { f, state } = await setup();
  try {
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-1' });
    const now = await f.page.evaluate(() => Date.now());
    const rec = await stored(f.page);
    assert.equal(rec.token, 'tok-1');
    assert.ok(Math.abs(rec.expiresAt - (now + 3600_000)) < 5000, `expiresAt ${rec.expiresAt} ~ now+1h`);
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-1' });
    assert.equal(state.calls, 1, 'second call served from cache');

    await f.page.reload({ waitUntil: 'load' });
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-1' });
    assert.equal(state.calls, 1, 'cache is sessionStorage-backed');
  } finally { await f.close(); }
});

test('concurrent callers share one in-flight request', async () => {
  const { f, state } = await setup();
  try {
    state.responses.push({ status: 200, delayMs: 150, body: { token: 'shared', ttlSec: 3600 } });
    const results = await f.page.evaluate(() => Promise.all([1, 2, 3].map(() => window.VSCsrf.getToken())));
    assert.deepEqual(results, ['shared', 'shared', 'shared']);
    assert.equal(state.calls, 1);
  } finally { await f.close(); }
});

test('a token inside the 30s safety margin is refetched; one outside it is reused', async () => {
  const { f, state } = await setup();
  try {
    await f.page.evaluate(() => sessionStorage.setItem('vs_csrf_v1', JSON.stringify({ token: 'fresh', expiresAt: Date.now() + 120_000 })));
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'fresh' });
    assert.equal(state.calls, 0, 'control: fresh cached token reused');

    await f.page.evaluate(() => sessionStorage.setItem('vs_csrf_v1', JSON.stringify({ token: 'stale', expiresAt: Date.now() + 10_000 })));
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-1' });
    assert.equal(state.calls, 1);
  } finally { await f.close(); }
});

test('a failed fetch rejects, stores nothing, and the next call retries', async () => {
  const { f, state } = await setup();
  try {
    state.responses.push({ status: 500, body: { error: 'boom' } });
    const failed = await getToken(f.page);
    assert.equal(failed.ok, false);
    assert.match(failed.m, /CSRF fetch failed: 500/);
    assert.equal(await stored(f.page), null);
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-2' }, 'in-flight promise was cleared after failure');
    assert.equal(state.calls, 2);
  } finally { await f.close(); }
});

test('invalidate() and corrupted storage both force a refetch without throwing', async () => {
  const { f, state } = await setup();
  try {
    await getToken(f.page);
    await f.page.evaluate(() => window.VSCsrf.invalidate());
    assert.equal(await stored(f.page), null);
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-2' });

    await f.page.evaluate(() => sessionStorage.setItem('vs_csrf_v1', '{not json'));
    assert.deepEqual(await getToken(f.page), { ok: true, t: 'tok-3' });
    assert.equal(state.calls, 3);
  } finally { await f.close(); }
});
