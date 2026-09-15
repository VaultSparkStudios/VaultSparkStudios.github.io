// theme-toggle.unit.spec.js — assets/theme-toggle.js (every-page theme system,
// CANON-047). Covers persistence, invalid-value fallback, pre-DOMContentLoaded
// application (no flash), picker ARIA/preview/Escape, mobile pills, the public
// VSTheme API, and account sync (device wins; account hydrates a new device).
// The Supabase REST endpoint is mocked; nothing leaves the fixture origin.
// Run: node --test tests/theme-toggle.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor, settle } from './fixtures/browser-harness.mjs';

// Mirrors production: deferred in <head>. The inline listener records what the
// document looked like when the page's own DOMContentLoaded handlers run.
const FIXTURE = html({
  head: '<meta name="theme-color" content="#123456"><script defer src="/assets/theme-toggle.js"></script>',
  body: `<script>
  window.__events = [];
  addEventListener('vs:theme-changed', (e) => window.__events.push(e.detail.theme));
  document.addEventListener('DOMContentLoaded', () => {
    window.__atDCL = { html: document.documentElement.dataset.theme || null, body: document.body.dataset.theme || null };
  });
</script>
<header><div class="nav-right"><button class="hamburger" type="button">menu</button></div></header>
<div class="mobile-nav-footer"><a href="#x">x</a></div>`,
});

const REST = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/rest/v1/vault_members';

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

const seedTheme = (value) => ({ fn: (v) => { if (!sessionStorage.getItem('__seeded')) { if (v !== null) localStorage.setItem('vs_theme', v); sessionStorage.setItem('__seeded', '1'); } }, arg: value });

async function withFixture({ theme = null, initScripts = [], handlers = [] } = {}, fn) {
  const f = await openFixture(browser, { pages: { '/': FIXTURE }, initScripts: [seedTheme(theme), ...initScripts], handlers });
  try { await f.goto('/'); await fn(f); } finally { await f.close(); }
}

const themeState = (page) => page.evaluate(() => ({
  html: document.documentElement.dataset.theme,
  body: document.body.dataset.theme,
  htmlClass: [...document.documentElement.classList].filter((c) => c.endsWith('-mode')),
  bodyClass: [...document.body.classList].filter((c) => c.endsWith('-mode')),
  scheme: document.documentElement.style.colorScheme,
  meta: document.querySelector('meta[name="theme-color"]').getAttribute('content'),
  stored: localStorage.getItem('vs_theme'),
}));

test('a stored theme is applied to <html> and <body> before DOMContentLoaded handlers run', async () => {
  await withFixture({ theme: 'warm' }, async (f) => {
    assert.deepEqual(await f.page.evaluate(() => window.__atDCL), { html: 'warm', body: 'warm' });
    assert.deepEqual(await themeState(f.page), { html: 'warm', body: 'warm', htmlClass: ['warm-mode'], bodyClass: ['warm-mode'], scheme: 'dark', meta: '#1f120b', stored: 'warm' });
  });
});

test('no stored theme defaults to dark without writing storage; an invalid value also falls back', async () => {
  await withFixture({}, async (f) => {
    const s = await themeState(f.page);
    assert.equal(s.html, 'dark');
    assert.equal(s.stored, null, 'first visit does not persist a choice the visitor never made');
  });
  await withFixture({ theme: '"><script>' }, async (f) => {
    const s = await themeState(f.page);
    assert.deepEqual([s.html, s.body, s.htmlClass], ['dark', 'dark', ['dark-mode']]);
  });
});

test('picker: open/close ARIA, click persists across reload, only the chosen tile is pressed', async () => {
  await withFixture({ theme: 'dark' }, async (f) => {
    const btn = f.page.locator('#theme-picker-btn');
    assert.equal(await btn.getAttribute('aria-expanded'), 'false');
    await btn.click();
    assert.equal(await btn.getAttribute('aria-expanded'), 'true');
    assert.equal(await f.page.locator('.theme-tile').count(), 7);

    await f.page.click('.theme-tile[data-theme="light"]');
    assert.equal(await btn.getAttribute('aria-expanded'), 'false', 'selection closes the picker');
    const s = await themeState(f.page);
    assert.deepEqual([s.html, s.body, s.scheme, s.meta, s.stored], ['light', 'light', 'light', '#f6efe5', 'light']);
    assert.deepEqual(await f.page.$$eval('.theme-tile[aria-pressed="true"]', (ts) => ts.map((t) => t.dataset.theme)), ['light']);
    assert.equal(await f.page.textContent('.theme-picker-label'), 'Light');
    assert.ok((await f.page.evaluate(() => window.__events)).includes('light'));

    await f.page.reload({ waitUntil: 'load' });
    assert.deepEqual(await f.page.evaluate(() => window.__atDCL), { html: 'light', body: 'light' });
  });
});

test('picker: hover previews without saving; Escape and mouse-leave restore the saved theme', async () => {
  await withFixture({ theme: 'cool' }, async (f) => {
    await f.page.click('#theme-picker-btn');
    await f.page.hover('.theme-tile[data-theme="lava"]');
    let s = await themeState(f.page);
    assert.deepEqual([s.html, s.stored], ['lava', 'cool'], 'preview only');
    await f.page.keyboard.press('Escape');
    s = await themeState(f.page);
    assert.deepEqual([s.html, s.stored], ['cool', 'cool']);
    assert.equal(await f.page.getAttribute('#theme-picker-btn', 'aria-expanded'), 'false');

    await f.page.click('#theme-picker-btn');
    await f.page.hover('.theme-tile[data-theme="warm"]');
    await f.page.mouse.move(5, 700);
    assert.equal((await themeState(f.page)).html, 'cool');
  });
});

test('mobile pills and the VSTheme API use the same persisted state', async () => {
  await withFixture({ theme: 'dark' }, async (f) => {
    assert.equal(await f.page.locator('#mobile-theme-bar .mobile-theme-pill').count(), 7);
    await f.page.locator('.mobile-theme-pill[data-theme="high-contrast"]').evaluate((el) => el.click());
    assert.equal((await themeState(f.page)).stored, 'high-contrast');
    assert.deepEqual(await f.page.$$eval('.mobile-theme-pill.active', (ps) => ps.map((p) => p.dataset.theme)), ['high-contrast']);

    const api = await f.page.evaluate(() => ({ n: window.VSTheme.themes.length, values: window.VSTheme.themes.map((t) => t.value) }));
    assert.equal(api.n, 7);
    assert.deepEqual(api.values, ['dark', 'light', 'ambient', 'warm', 'cool', 'lava', 'high-contrast']);
    await f.page.evaluate(() => window.VSTheme.set('not-a-theme'));
    assert.equal((await themeState(f.page)).stored, 'dark', 'API normalises invalid values');
    await f.page.evaluate(() => window.VSTheme.set('ambient'));
    assert.equal(await f.page.evaluate(() => window.VSTheme.get()), 'ambient');
  });
});

test('signed-out visitors make no account request', async () => {
  const rest = [];
  const handler = { match: (u) => u.href.startsWith(REST), handle: async (route, req) => { rest.push(req.method()); await route.fulfill({ status: 200, body: '[]' }); } };
  await withFixture({ theme: 'warm', handlers: [handler] }, async (f) => {
    await f.page.click('#theme-picker-btn');
    await f.page.click('.theme-tile[data-theme="lava"]');
    await settle(300);
    assert.deepEqual(rest, []);
    assert.deepEqual(f.log.blocked, []);
  });
});

function accountFixture(accountTheme) {
  const calls = [];
  const signedIn = () => {
    window.VSSignedInState = {
      getDataSession: () => Promise.resolve({ access_token: 'member-access', user: { id: '11111111-1111-4111-8111-111111111111' } }),
    };
  };
  const handler = {
    match: (u) => u.href.startsWith(REST),
    handle: async (route, req) => {
      calls.push({ method: req.method(), url: req.url(), auth: req.headers().authorization, body: req.postData() });
      if (req.method() === 'GET') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ prefs: accountTheme ? { site_theme: accountTheme, other: 1 } : {} }]) });
      else await route.fulfill({ status: 204, body: '' });
    },
  };
  return { calls, signedIn, handler };
}

test('account sync: the device choice wins and is written back, preserving other prefs', async () => {
  const acct = accountFixture('lava');
  await withFixture({ theme: 'warm', initScripts: [acct.signedIn], handlers: [acct.handler] }, async (f) => {
    await waitFor(() => acct.calls.some((c) => c.method === 'PATCH'), { message: 'account PATCH' });
    const get = acct.calls.find((c) => c.method === 'GET');
    assert.match(get.url, /select=prefs&id=eq\.11111111-1111-4111-8111-111111111111/);
    assert.equal(get.auth, 'Bearer member-access');
    const patch = acct.calls.find((c) => c.method === 'PATCH');
    assert.deepEqual(JSON.parse(patch.body), { prefs: { site_theme: 'warm', other: 1 } });
    assert.equal((await themeState(f.page)).html, 'warm');
  });
});

test('account sync: a new device with no local choice adopts the account theme', async () => {
  const acct = accountFixture('cool');
  await withFixture({ initScripts: [acct.signedIn], handlers: [acct.handler] }, async (f) => {
    await waitFor(async () => (await themeState(f.page)).html === 'cool', { message: 'account theme applied' });
    assert.equal((await themeState(f.page)).stored, 'cool');
    await settle(200);
    assert.equal(acct.calls.filter((c) => c.method === 'PATCH').length, 0, 'no redundant write-back');
  });
});
