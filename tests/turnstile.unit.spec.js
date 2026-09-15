// turnstile.unit.spec.js — assets/turnstile.js (window.VSTurnstile), the CAPTCHA
// gate in front of Vault Member sign-in/sign-up. The Cloudflare API script is
// replaced by a local stub; nothing leaves the fixture origin.
// Run: node --test tests/turnstile.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launchBrowser, openFixture, html, waitFor, settle } from './fixtures/browser-harness.mjs';

const API_STUB = `(() => {
  const s = window.__ts = { renders: [], resets: [], removes: 0 };
  window.turnstile = {
    render(el, opts) { s.renders.push({ el, opts }); return 'w' + s.renders.length; },
    reset(id) { s.resets.push(id); },
    remove() { s.removes++; },
  };
  const m = /onload=([^&]+)/.exec(document.currentScript.src);
  if (m && typeof window[m[1]] === 'function') window[m[1]]();
})();`;

const FIXTURE = html({
  body: `<form id="tabA"><div data-vs-turnstile-slot id="slotA"></div></form>
<form id="tabB" hidden><div data-vs-turnstile-slot id="slotB"></div></form>
<script src="/assets/turnstile.js"></script>`,
});

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function setup(opts = {}) {
  const apiUrls = [];
  const f = await openFixture(browser, {
    pages: { '/vault-member/': FIXTURE },
    handlers: [{
      match: (u) => u.hostname === 'challenges.cloudflare.com',
      handle: async (route, req) => { apiUrls.push(req.url()); await route.fulfill({ status: 200, contentType: 'application/javascript', body: API_STUB }); },
    }],
    ...opts,
  });
  await f.goto('/vault-member/');
  await waitFor(() => f.page.evaluate(() => !!window.turnstile), { message: 'turnstile api stub loaded' });
  return { f, apiUrls };
}

// Start a getToken() call and park its settled result on window.__result.
const start = (page) => page.evaluate(() => {
  window.__result = null;
  window.VSTurnstile.getToken().then((t) => { window.__result = { ok: true, t }; }, (e) => { window.__result = { ok: false, m: e.message }; });
});
const result = (page) => page.evaluate(() => window.__result);
const renders = (page) => page.evaluate(() => window.__ts.renders.length);
const callOpt = (page, name, arg) => page.evaluate(([n, a]) => window.__ts.renders.at(-1).opts[n](a), [name, arg]);

test('preloads the explicit-render API once and lazily renders into the visible slot', async () => {
  const { f, apiUrls } = await setup();
  try {
    assert.equal(apiUrls.length, 1);
    assert.match(apiUrls[0], /onload=__vsTurnstileReady/);
    assert.match(apiUrls[0], /render=explicit/);
    assert.equal(await renders(f.page), 0, 'no eager render before a form needs a token');

    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1, { message: 'render' });
    const info = await f.page.evaluate(() => {
      const r = window.__ts.renders[0];
      return {
        parent: r.el.parentNode && r.el.parentNode.id,
        id: r.el.id,
        hidden: r.el.style.left === '-99999px',
        sitekey: r.opts.sitekey,
        appearance: r.opts.appearance,
        hasSize: 'size' in r.opts,
        callbacks: ['callback', 'error-callback', 'expired-callback', 'before-interactive-callback', 'after-interactive-callback'].every((k) => typeof r.opts[k] === 'function'),
      };
    });
    assert.deepEqual(info, { parent: 'slotA', id: 'vs-turnstile', hidden: true, sitekey: info.sitekey, appearance: 'interaction-only', hasSize: false, callbacks: true });
    assert.match(info.sitekey, /^0x4[A-Za-z0-9_-]+$/);
    assert.equal(await result(f.page), null, 'pending until Turnstile calls back');

    await callOpt(f.page, 'callback', 'tok-A');
    await waitFor(async () => (await result(f.page)) !== null);
    assert.deepEqual(await result(f.page), { ok: true, t: 'tok-A' });
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('script#vs-turnstile-api').length), 1);
    assert.equal(await f.page.evaluate(() => window.__ts.removes), 0, 'never calls turnstile.remove() (S122)');
  } finally { await f.close(); }
});

test('an interactive challenge is surfaced, then hidden again, without moving the node', async () => {
  const { f } = await setup();
  try {
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1);
    await callOpt(f.page, 'before-interactive-callback');
    assert.deepEqual(await f.page.evaluate(() => { const el = document.getElementById('vs-turnstile'); return [el.style.display, el.parentNode.id]; }), ['flex', 'slotA']);
    await callOpt(f.page, 'after-interactive-callback');
    assert.equal(await f.page.evaluate(() => document.getElementById('vs-turnstile').style.left), '-99999px');
  } finally { await f.close(); }
});

test('error-callback rejects the caller and the next call renders a fresh container', async () => {
  const { f } = await setup();
  try {
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1);
    await callOpt(f.page, 'error-callback');
    await waitFor(async () => (await result(f.page)) !== null);
    assert.deepEqual(await result(f.page), { ok: false, m: 'CAPTCHA verification failed. Please try again.' });
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('#vs-turnstile').length), 0, 'bad widget detached');

    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 2, { message: 'fresh render after error' });
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('#vs-turnstile').length), 1);
  } finally { await f.close(); }
});

test('switching to another form tab re-renders into the newly visible slot', async () => {
  const { f } = await setup();
  try {
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1);
    await callOpt(f.page, 'callback', 'tok-A');
    await waitFor(async () => (await result(f.page)) !== null);
    await callOpt(f.page, 'expired-callback'); // drop any cached token

    await f.page.evaluate(() => { document.getElementById('tabA').hidden = true; document.getElementById('tabB').hidden = false; });
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 2, { message: 're-render into slotB' });
    assert.deepEqual(await f.page.evaluate(() => ({
      parent: window.__ts.renders[1].el.parentNode.id,
      live: document.querySelectorAll('#vs-turnstile').length,
      removes: window.__ts.removes,
    })), { parent: 'slotB', live: 1, removes: 0 });
  } finally { await f.close(); }
});

test('an unanswered challenge times out after 12s with an actionable message', async () => {
  const { f } = await setup({ clock: true });
  try {
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1);
    await f.context.clock.runFor(11_000);
    await settle(50);
    assert.equal(await result(f.page), null, 'control: still pending before the 12s budget');
    await f.context.clock.runFor(1_500);
    await waitFor(async () => (await result(f.page)) !== null, { message: 'timeout rejection' });
    const r = await result(f.page);
    assert.equal(r.ok, false);
    assert.match(r.m, /CAPTCHA timed out/);
    assert.equal(await f.page.evaluate(() => document.querySelectorAll('#vs-turnstile').length), 0);
  } finally { await f.close(); }
});

// Turnstile tokens are single-use (siteverify answers `timeout-or-duplicate` on
// reuse). _onToken() both resolves the waiting caller AND caches the same token,
// so the very next getToken() within 4 minutes is handed the consumed token —
// e.g. a member who mistypes their password gets a CAPTCHA failure on retry.
test('two sequential getToken() calls never hand out the same single-use token', {
  todo: 'BUG assets/turnstile.js _onToken caches the token it just delivered; getToken() then re-serves it',
}, async () => {
  const { f } = await setup();
  try {
    await start(f.page);
    await waitFor(async () => (await renders(f.page)) === 1);
    await callOpt(f.page, 'callback', 'tok-1');
    await waitFor(async () => (await result(f.page)) !== null);
    assert.deepEqual(await result(f.page), { ok: true, t: 'tok-1' });

    await start(f.page);
    await settle(300);
    const second = await result(f.page);
    assert.ok(!second || second.t !== 'tok-1', `second caller received the consumed token: ${JSON.stringify(second)}`);
  } finally { await f.close(); }
});
